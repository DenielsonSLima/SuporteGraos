
import { SalesOrder, SalesTransaction, SalesStatus } from '../modules/SalesOrder/types';
import { Persistence } from './persistence';
import { logService } from './logService';
import { authService } from './authService';
import { loadingService } from './loadingService';
import { supabase } from './supabase';
import { receivablesService, Receivable } from './financial/receivablesService';
import { DashboardCache, invalidateDashboardCache } from './dashboardCache';
import { invalidateFinancialCache } from './financialCache';
import { getTodayBR } from '../utils/dateUtils';
import { auditService } from './auditService';
// ❌ REMOVIDO: import { financialSyncService } from './financialSyncService';
// Motivo: Criava loop bidirecional — receivable:updated → syncSalesOrder → salesService.update → receivable:updated
import { financialHistoryService } from './financial/financialHistoryService';
import { ledgerService } from './ledgerService';
import { financialTransactionService } from './financial/financialTransactionService';
import { standaloneRecordsService } from './standaloneRecordsService';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from './sqlCanonicalOps';


const INITIAL_SALES: SalesOrder[] = [];
const db = new Persistence<SalesOrder>('sales_orders', INITIAL_SALES, { useStorage: false });
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

// ─── Tipagem das rows do banco ─────────────────────────────────────

/** Shape de uma row da tabela sales_orders (legado) */
interface SalesOrderDbRow {
  id: string;
  number: string;
  date?: string;
  status?: string;
  partner_id?: string;
  partner_name?: string;
  total_value?: number;
  shipped_value?: number;
  discount?: number;
  notes?: string;
  metadata?: SalesOrder;
  company_id?: string;
  created_at?: string;
}

/** Shape de uma row da VIEW vw_sales_orders_enriched (canônico) */
interface SalesOrderOpsRow {
  id?: string;
  legacy_id?: string;
  number?: string;
  order_date?: string;
  status?: string;
  customer_id?: string;
  customer_name?: string;
  total_value?: number;
  received_value?: number;
  delivered_qty_sc?: number;
  delivered_value?: number;
  load_count?: number;
  transit_count?: number;
  transit_value?: number;
  metadata?: SalesOrder;
}

type DbStatus = 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled';

const statusToDb = (status: SalesStatus): DbStatus => {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'completed':
      return 'delivered';
    case 'canceled':
      return 'cancelled';
    case 'pending':
    case 'draft':
    default:
      return 'pending';
  }
};

const statusFromDb = (status?: string): SalesStatus => {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'delivered':
      return 'completed';
    case 'cancelled':
      return 'canceled';
    case 'shipped':
      return 'approved';
    case 'pending':
    default:
      return 'pending';
  }
};

const mapOrderToDb = (order: SalesOrder) => ({
  id: order.id,
  number: order.number,
  partner_id: order.customerId || null,
  date: order.date,
  status: statusToDb(order.status),
  total_value: order.totalValue ?? 0,
  shipped_value: 0,
  discount: 0,
  partner_name: order.customerName,
  notes: order.notes || null,
  metadata: order,
  company_id: authService.getCurrentUser()?.companyId || null
});

const mapOrderFromDb = (row: SalesOrderDbRow): SalesOrder => {
  const meta: SalesOrder | undefined = row?.metadata;
  const base = {
    id: row.id,
    number: row.number,
    date: row.date || getTodayBR(),
    status: statusFromDb(row?.status),
    consultantName: '',
    customerId: row?.partner_id || '',
    productName: '',
    quantity: undefined,
    unitPrice: undefined,
    totalValue: row?.total_value || 0,
    transactions: [],
    paidValue: 0,
    loadings: [],
    notes: row?.notes || ''
  } as SalesOrder;

  return {
    ...base,
    ...meta,
    id: row.id,
    number: row.number,
    date: row.date || base.date,
    customerId: row.partner_id || base.customerId,
    customerName: row?.partner_name ?? meta?.customerName ?? base.customerName ?? 'Cliente Não Informado',
    status: statusFromDb(row.status),
    totalValue: row.total_value ?? base.totalValue,
    notes: row.notes || base.notes
  };
};

const mapOrderFromOpsRow = (row: SalesOrderOpsRow): SalesOrder => {
  const meta: SalesOrder | undefined = row?.metadata;

  return {
    id: row?.legacy_id ?? row?.id ?? meta?.id ?? '',
    number: row?.number ?? meta?.number ?? '',
    date: row?.order_date ?? meta?.date ?? getTodayBR(),
    status: (meta?.status as SalesStatus) ?? statusFromDb(row?.status),
    consultantName: meta?.consultantName ?? '',
    customerId: row?.customer_id ?? meta?.customerId ?? '',
    customerName: row?.customer_name ?? meta?.customerName ?? 'Cliente Não Informado',
    customerDocument: meta?.customerDocument,
    customerCity: meta?.customerCity,
    customerState: meta?.customerState,
    productName: meta?.productName ?? '',
    quantity: meta?.quantity,
    unitPrice: meta?.unitPrice,
    totalValue: Number(row?.total_value ?? meta?.totalValue ?? 0),
    paidValue: Number(row?.received_value ?? meta?.paidValue ?? 0),
    transactions: meta?.transactions ?? [],
    loadings: meta?.loadings ?? [],
    notes: meta?.notes ?? '',
    // ═══════ Dados pré-calculados pelo SQL (VIEW vw_sales_orders_enriched) ═══════
    deliveredQtySc: row?.delivered_qty_sc != null ? Number(row.delivered_qty_sc) : undefined,
    deliveredValue: row?.delivered_value != null ? Number(row.delivered_value) : undefined,
    loadCount: row?.load_count != null ? Number(row.load_count) : undefined,
    transitCount: row?.transit_count != null ? Number(row.transit_count) : undefined,
    transitValue: row?.transit_value != null ? Number(row.transit_value) : undefined,
  };
};

// ============================================================================
// CARREGAMENTO INICIAL (SUPABASE)
// ============================================================================

const loadFromSupabase = async (retries = 2): Promise<SalesOrder[]> => {
  if (isSqlCanonicalOpsEnabled()) {
    try {
      // Usa VIEW enriquecida com delivered_value/delivered_qty_sc pré-calculados
      const query = supabase
        .from('vw_sales_orders_enriched')
        .select('*');

      const { data, error } = await query.order('order_date', { ascending: false });
      if (error) throw error;

      const mapped = (data || []).map(mapOrderFromOpsRow);

      // Enriquecer pedidos com city/state faltando a partir do parceiro
      const missingAddressOrders = mapped.filter(o => o.customerId && (!o.customerCity || !o.customerState));
      if (missingAddressOrders.length > 0) {
        const partnerIds = [...new Set(missingAddressOrders.map(o => o.customerId))];
        try {
          const { data: addrRows } = await supabase
            .from('parceiros_enderecos')
            .select('partner_id, city:cities(name, state:states(uf))')
            .in('partner_id', partnerIds)
            .eq('is_primary', true);

          if (addrRows && addrRows.length > 0) {
            const addrMap = new Map<string, { city: string; state: string }>();
            for (const row of addrRows) {
              const cityObj = Array.isArray(row.city) ? row.city[0] : row.city;
              const stateObj = cityObj?.state ? (Array.isArray(cityObj.state) ? cityObj.state[0] : cityObj.state) : null;
              if (cityObj?.name || stateObj?.uf) {
                addrMap.set(row.partner_id, { city: cityObj?.name || '', state: stateObj?.uf || '' });
              }
            }
            for (const order of mapped) {
              if ((!order.customerCity || !order.customerState) && order.customerId) {
                const addr = addrMap.get(order.customerId);
                if (addr) {
                  if (!order.customerCity) order.customerCity = addr.city;
                  if (!order.customerState) order.customerState = addr.state;
                }
              }
            }
          }
        } catch (addrErr) {
          sqlCanonicalOpsLog('Falha ao enriquecer endereço do parceiro em sales orders', addrErr);
        }
      }

      db.setAll(mapped);
      return mapped;
    } catch (error) {
      sqlCanonicalOpsLog('Falha ao carregar ops_sales_orders (modo canônico)', error);
      return db.getAll();
    }
  }

  try {
    const user = authService.getCurrentUser();
    let query = supabase
      .from('sales_orders')
      .select('*');

    if (user?.companyId) {
      query = query.eq('company_id', user.companyId);
    }

    const { data, error } = await query
      .order('date', { ascending: false });

    if (error) throw error;
    const mapped = (data || []).map(mapOrderFromDb);
    db.setAll(mapped);
    return mapped;
  } catch (error) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return loadFromSupabase(retries - 1);
    }
    return [];
  }
};

// ❌ NÃO inicializar automaticamente - aguardar autenticação via supabaseInitService
// void loadFromSupabase();

const persistUpsert = async (order: SalesOrder) => {
  if (isSqlCanonicalOpsEnabled()) {
    sqlCanonicalOpsLog(`salesService.persistUpsert legado ignorado (${order.id}) em modo canônico`);
    return { success: true };
  }

  try {
    const user = authService.getCurrentUser();
    if (!user?.companyId) {
      return { success: false, error: 'Sessão inválida ou empresa não identificada' };
    }

    const payload: ReturnType<typeof mapOrderToDb> & { id?: string } = mapOrderToDb(order);
    const isValidUuid = (v?: string) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
    if (!isValidUuid(payload.id)) {
      delete payload.id; // permite que o banco gere UUID automaticamente
    }
    const { error } = await supabase.from('sales_orders').upsert(payload).select();
    if (error) {
      return { success: false, error: error.message };
    }
    // Atualiza cache local para refletir possíveis IDs gerados no banco
    await syncFromSupabase();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado' };
  }
};

const persistDelete = async (id: string) => {
  if (isSqlCanonicalOpsEnabled()) {
    sqlCanonicalOpsLog(`salesService.persistDelete legado ignorado (${id}) em modo canônico`);
    return;
  }

  try {
    const { error } = await supabase.from('sales_orders').delete().eq('id', id);
    if (error) {
      console.error('[salesService.persistDelete] Erro ao deletar:', error.message);
    }
  } catch (err) {
    console.error('[salesService.persistDelete] Exceção:', err);
  }
};

const syncFromSupabase = async () => {
  try {
    const user = authService.getCurrentUser();
    let query = supabase
      .from('sales_orders')
      .select('*');

    if (user?.companyId) {
      query = query.eq('company_id', user.companyId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    if (data) {
      const mapped = data.map(mapOrderFromDb);
      db.setAll(mapped);
    }
  } catch (err) {
    console.error('[salesService.syncFromSupabase] Falha ao sincronizar:', err);
  }
};

const upsertSalesOrderCanonical = async (sale: SalesOrder): Promise<boolean> => {
  if (!isSqlCanonicalOpsEnabled()) return false;

  try {
    const { error } = await supabase.rpc('rpc_ops_sales_order_upsert_v2', {
      p_payload: sale as any
    });

    if (error) {
      sqlCanonicalOpsLog(`Falha RPC venda canônica v2 (${sale.id}) — tentando v1`, error);

      const { error: fallbackError } = await supabase.rpc('rpc_ops_sales_order_upsert_v1', {
        p_payload: sale as any
      });

      if (fallbackError) {
        sqlCanonicalOpsLog(`Falha RPC venda canônica v1 (${sale.id}) — fallback legado`, fallbackError);
        return false;
      }

      return true;
    }

    return true;
  } catch (error) {
    sqlCanonicalOpsLog(`Erro RPC venda canônica (${sale.id}) — fallback legado`, error);
    return false;
  }
};

const deleteSalesOrderCanonical = async (saleId: string): Promise<boolean> => {
  if (!isSqlCanonicalOpsEnabled()) return false;

  try {
    const { error } = await supabase.rpc('rpc_ops_sales_order_delete_v1', {
      p_legacy_id: saleId
    });

    if (error) {
      sqlCanonicalOpsLog(`Falha delete canônico venda (${saleId}) — fallback legado`, error);
      return false;
    }

    return true;
  } catch (error) {
    sqlCanonicalOpsLog(`Erro delete canônico venda (${saleId}) — fallback legado`, error);
    return false;
  }
};

// ❌ NÃO inicializar automaticamente - aguardar autenticação via supabaseInitService
// void syncFromSupabase();

const startRealtime = () => {
  // ⚠️ DEPRECADO: O canal realtime é gerenciado pelo hook useSalesOrders (TanStack Query).
  // Este método é mantido por compatibilidade de interface mas não deve ser chamado.
  // O hook já cria um singleton channel com cleanup correto.
  if (realtimeChannel) return;
  return;
};

const stopRealtime = () => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
};

// ❌ NÃO inicializar automaticamente - aguardar autenticação
// startRealtime();

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

// ============================================================================
// SINCRONIZAÇÃO FINANCEIRA (Feedback do Financeiro -> Venda)
// ============================================================================


export const salesService = {
  getAll: () => db.getAll(),

  getById: (id: string) => db.getById(id),

  add: async (sale: SalesOrder) => {
    await upsertSalesOrderCanonical(sale);

    // 1. Tentar persistir no Supabase primeiro
    const result = await persistUpsert(sale);
    if (!result.success) return result;

    // 2. Se sucesso, atualizar cache local
    db.add(sale);

    // ℹ️ Receivable é criado SOMENTE quando a mercadoria for entregue
    // (via loadingReceivableSync quando carregamento com unloadWeightKg é registrado)

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'create',
      module: 'Vendas',
      description: `Criou Pedido de Venda ${sale.number} para ${sale.customerName}`,
      entityId: sale.id
    });

    // Audit Log
    void auditService.logAction('create', 'Vendas', `Pedido de venda criado: #${sale.number} - ${sale.customerName} - R$ ${sale.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, {
      entityType: 'SalesOrder',
      entityId: sale.id,
      metadata: { customerId: sale.customerId, totalValue: sale.totalValue, status: sale.status }
    });

    invalidateDashboardCache();
    return { success: true };
  },

  update: async (updatedSale: SalesOrder) => {
    await upsertSalesOrderCanonical(updatedSale);

    // 1. Tentar persistir no Supabase primeiro
    const result = await persistUpsert(updatedSale);
    if (!result.success) return result;

    // 2. Se sucesso, atualizar cache local
    const oldSale = db.getById(updatedSale.id);
    db.update(updatedSale);

    // ✅ DETECÇÃO DE MUDANÇAS FINANCEIRAS (Histórico)
    if (oldSale && !isSqlCanonicalOpsEnabled()) {
      const oldTxs = oldSale.transactions || [];
      const newTxs = updatedSale.transactions || [];

      // 1. Detectar novos recebimentos
      const newReceipts = newTxs.filter(t =>
        (t.type === 'receipt') &&
        !oldTxs.some(old => old.id === t.id)
      );

      for (const tx of newReceipts) {
        if (tx.value > 0) {
          const accId = tx.accountId;
          const currentBalance = accId ? ledgerService.getAccountBalance(accId) : 0;
          await financialHistoryService.add({
            id: `fh-${tx.id}`,
            date: tx.date,
            type: 'Receita Operacional',
            operation: 'inflow',
            amount: tx.value,
            balanceBefore: currentBalance,
            balanceAfter: currentBalance + tx.value,
            bankAccountId: accId,
            description: `Recebimento Venda #${updatedSale.number}`,
            partnerId: updatedSale.customerId,
            referenceType: 'sales_order',
            referenceId: updatedSale.id,
            notes: tx.notes
          });
        }
      }

      // 2. Detectar recebimentos removidos (Estorno)
      const removedReceipts = oldTxs.filter(t =>
        (t.type === 'receipt') &&
        !newTxs.some(newTx => newTx.id === t.id)
      );

      for (const tx of removedReceipts) {
        if (tx.value > 0) {
          const accId = tx.accountId;
          const currentBalance = accId ? ledgerService.getAccountBalance(accId) : 0;
          await financialHistoryService.add({
            id: `fh-rev-${tx.id}`,
            date: new Date().toISOString(),
            type: 'Estorno de Receita',
            operation: 'outflow',
            amount: tx.value,
            balanceBefore: currentBalance,
            balanceAfter: currentBalance - tx.value,
            bankAccountId: accId,
            description: `Estorno Recebimento Venda #${updatedSale.number}`,
            partnerId: updatedSale.customerId,
            referenceType: 'sales_order',
            referenceId: updatedSale.id,
            notes: `Estorno de transação original: ${tx.notes || ''}`
          });
        }
      }
    }

    const { userId, userName } = getLogInfo();
    let action = 'update';
    let desc = `Atualizou Pedido de Venda ${updatedSale.number}`;

    if (oldSale && oldSale.status !== updatedSale.status) {
      if (updatedSale.status === 'approved') {
        action = 'approve';
        desc = `Aprovou Pedido de Venda ${updatedSale.number}`;
      } else if (updatedSale.status === 'completed') {
        action = 'finalize';
        desc = `Finalizou Pedido de Venda ${updatedSale.number}`;
      }
    }

    logService.addLog({
      userId,
      userName,
      action: action as any,
      module: 'Vendas',
      description: desc,
      entityId: updatedSale.id
    });

    // Audit Log
    void auditService.logAction(action as any, 'Vendas', `Pedido de venda: #${updatedSale.number} - ${desc}`, {
      entityType: 'SalesOrder',
      entityId: updatedSale.id,
      metadata: { status: updatedSale.status, totalValue: updatedSale.totalValue, paidValue: updatedSale.paidValue }
    });

    invalidateDashboardCache();
    return { success: true };
  },

  updateTransaction: async (orderId: string, updatedTx: SalesTransaction) => {
    const order = db.getById(orderId);
    if (!order) return;

    // Use modular service for the actual money record
    if (updatedTx.type === 'receipt') {
      await financialTransactionService.add({
        date: updatedTx.date,
        description: `Recebimento Venda #${order.number} (Editado)`,
        amount: updatedTx.value,
        type: 'receipt',
        bankAccountId: updatedTx.accountId,
        companyId: (order as any).companyId || ''
      });
    }

    const newTxs = (order.transactions || []).map(t => t.id === updatedTx.id ? updatedTx : t);
    const updated = isSqlCanonicalOpsEnabled()
      ? { ...order, transactions: newTxs }
      : {
          ...order,
          transactions: newTxs,
          paidValue: newTxs
            .filter(t => t.type === 'receipt')
            .reduce((acc, t) => acc + t.value + (t.discountValue || 0), 0)
        };
    db.update(updated);
    void persistUpsert(updated);
    // ❌ REMOVIDO: void financialSyncService.syncSalesOrder(orderId);
    // Sync agora é feito apenas via financialActionService.processRecord()
    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'update', module: 'Financeiro', description: `Editou recebimento na Venda ${order.number}`, entityId: orderId });
    invalidateDashboardCache();
  },

  deleteTransaction: (orderId: string, txId: string) => {
    const order = db.getById(orderId);
    if (!order) return;

    // ✅ Limpeza COMPLETA via orquestrador centralizado
    // Remove: financial_history + admin_expenses + financial_transactions
    void import('./financial/paymentOrchestrator').then(({ removeFinancialTransaction }) => {
      removeFinancialTransaction(txId);
    });

    const newTxs = (order.transactions || []).filter(t => t.id !== txId);
    const updated = isSqlCanonicalOpsEnabled()
      ? { ...order, transactions: newTxs }
      : {
          ...order,
          transactions: newTxs,
          paidValue: newTxs
            .filter(t => t.type === 'receipt')
            .reduce((acc, t) => acc + t.value + (t.discountValue || 0), 0)
        };
    db.update(updated);
    void persistUpsert(updated);
    // ❌ REMOVIDO: void financialSyncService.syncSalesOrder(orderId);
    // Sync agora é feito apenas via financialActionService.processRecord()
    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'delete', module: 'Financeiro', description: `Estornou recebimento da Venda ${order.number}`, entityId: orderId });
  },

  delete: async (id: string) => {
    const order = db.getById(id);
    if (!order) {
      return { success: false, error: 'Pedido não encontrado' };
    }

    // ⛔ VALIDAÇÃO: Bloquear se houver carregamentos vinculados
    const linkedLoadings = loadingService.getBySalesOrder(id);
    if (linkedLoadings.length > 0) {
      return {
        success: false,
        error: `Não é possível excluir este Pedido de Venda pois existem ${linkedLoadings.length} carregamento(s) vinculado(s) a ele. Exclua as cargas primeiro.`
      };
    }


    const canonicalDeleted = await deleteSalesOrderCanonical(id);
    const canonicalAuthoritative = isSqlCanonicalOpsEnabled() && canonicalDeleted;

    // PASSO 1: Apagar receivables vinculados e suas transações financeiras
    const allReceivables = receivablesService.getAll();
    const linkedReceivables = allReceivables.filter(r => r.salesOrderId === id);

    if (!canonicalAuthoritative) {
      const receivableIds = linkedReceivables.map(r => r.id);

      // PASSO 2: ✅ LIMPEZA FINANCEIRA COMPLETA via orquestrador centralizado
      // Limpa: financial_history + admin_expenses (standalone) + financial_transactions
      try {
        const { cleanupFinancialRecords } = await import('./financial/paymentOrchestrator');
        await cleanupFinancialRecords({
          entityId: id,
          entityType: 'sales_order',
          receivableIds
        });
      } catch (err) {
        console.error('[salesService.delete] Falha na limpeza financeira:', err);
      }

      // PASSO 3: Apagar os receivables
      if (linkedReceivables.length > 0) {
        for (const r of linkedReceivables) {
          try {
            receivablesService.delete(r.id);
          } catch (err) {
            console.error(`[salesService.delete] Falha ao excluir receivable ${r.id}:`, err);
          }
        }
      }
    } else {
      // ✅ SQL-first: delete canônico já remove receivable e vínculos financeiros no banco
      void receivablesService.loadFromSupabase();
    }

    // PASSO 3: Apagar o pedido de venda (cache local + Supabase)
    db.delete(id);

    if (!canonicalAuthoritative) {
      try {
        const { error } = await supabase.from('sales_orders').delete().eq('id', id);
        if (error) {
          db.add(order);
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        db.add(order);
        return { success: false, error: err.message };
      }
    }

    // PASSO 3: Auditoria e limpeza de cache
    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'delete',
      module: 'Vendas',
      description: `Excluiu Pedido de Venda ${order.number}, ${linkedReceivables.length} receivable(s)`,
      entityId: id
    });

    void auditService.logAction('delete', 'Vendas', `Pedido de venda excluído: #${order.number} - ${order.customerName}`, {
      entityType: 'SalesOrder',
      entityId: id,
      metadata: { totalValue: order.totalValue, status: order.status, linkedReceivables: linkedReceivables.length }
    });


    DashboardCache.clearAll();
    invalidateDashboardCache();
    invalidateFinancialCache();

    return { success: true };
  },

  importData: (data: SalesOrder[]) => {
    db.setAll(data);
    const payload = data.map(mapOrderToDb);
    void (async () => {
      try {
        const { error } = await supabase.from('sales_orders').upsert(payload);
        if (error) {
          console.error('[salesService.importData] Erro ao importar:', error.message);
        }
      } catch (err) {
        console.error('[salesService.importData] Exceção:', err);
      }
    })();
  },

  subscribe: (callback: (items: SalesOrder[]) => void) => db.subscribe(callback),

  reload: () => {
    db.clear();
    return loadFromSupabase();
  },
  loadFromSupabase,
  startRealtime,
  stopRealtime
};

// ❌ REMOVIDO: eventBus listener que criava loop circular
// import { eventBus } from './eventBus';
// eventBus.on('receivable:updated', (data) => { financialSyncService.syncSalesOrder(...) })
// A sincronização agora é unidirecional: Financeiro → processa recebimento → atualiza receivable (fim)
