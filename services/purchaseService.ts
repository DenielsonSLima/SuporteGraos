
import { PurchaseOrder, OrderTransaction, OrderStatus } from '../modules/PurchaseOrder/types';
import { Persistence } from './persistence';
import { logService } from './logService';
import { authService } from './authService';
import { loadingService } from './loadingService';
import { supabase } from './supabase';
import { payablesService } from './financial/payablesService';
import { DashboardCache, invalidateDashboardCache } from './dashboardCache';
import { invalidateFinancialCache } from './financialCache';
import { auditService } from './auditService';
import { supabaseWithRetry } from '../utils/fetchWithRetry';
import { financialHistoryService } from './financial/financialHistoryService';
import { ledgerService } from './ledgerService';
import { financialTransactionService } from './financial/financialTransactionService';
import { standaloneRecordsService } from './standaloneRecordsService';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from './sqlCanonicalOps';
import {
  mapOrderToDb, mapOrderFromDb, mapOrderFromOpsRow,
  persistUpsert, upsertPurchaseOrderCanonical, deletePurchaseOrderCanonical,
  getLogInfo, createPayableForPurchaseOrder
} from './purchaseServiceHelpers';

const INITIAL_ORDERS: PurchaseOrder[] = [];
const db = new Persistence<PurchaseOrder>('purchase_orders', INITIAL_ORDERS, { useStorage: false });

// ============================================================================
// CARREGAMENTO INICIAL (SUPABASE)
// ============================================================================

const loadFromSupabase = async (): Promise<PurchaseOrder[]> => {
  if (isSqlCanonicalOpsEnabled()) {
    try {
      const user = authService.getCurrentUser();
      let query = supabase
        .from('vw_purchase_orders_enriched')
        .select('*');

      if (user?.companyId) {
        query = query.eq('company_id', user.companyId);
      }

      const data = await supabaseWithRetry(() =>
        query.order('order_date', { ascending: false })
      );

      const mapped = (data as any[] || []).map(mapOrderFromOpsRow);

      // Enriquecer pedidos com city/state faltando a partir do parceiro
      const missingAddressOrders = mapped.filter(o => o.partnerId && (!o.partnerCity || !o.partnerState));
      if (missingAddressOrders.length > 0) {
        const partnerIds = [...new Set(missingAddressOrders.map(o => o.partnerId))];
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
              if ((!order.partnerCity || !order.partnerState) && order.partnerId) {
                const addr = addrMap.get(order.partnerId);
                if (addr) {
                  if (!order.partnerCity) order.partnerCity = addr.city;
                  if (!order.partnerState) order.partnerState = addr.state;
                  if (!order.loadingCity) order.loadingCity = addr.city;
                  if (!order.loadingState) order.loadingState = addr.state;
                }
              }
            }
          }
        } catch (addrErr) {
          sqlCanonicalOpsLog('Falha ao enriquecer endereço do parceiro em purchase orders', addrErr);
        }
      }

      db.setAll(mapped);
      return mapped;
    } catch (error) {
      sqlCanonicalOpsLog('Falha ao carregar ops_purchase_orders (modo canônico)', error);
      return db.getAll();
    }
  }

  try {
    const user = authService.getCurrentUser();
    let query = supabase
      .from('purchase_orders')
      .select('*');

    // Aplicar filtro de empresa se disponivel
    if (user?.companyId) {
      query = query.eq('company_id', user.companyId);
    }

    const data = await supabaseWithRetry(() =>
      query.order('date', { ascending: false })
    );

    const mapped = (data as any[] || []).map(mapOrderFromDb);
    db.setAll(mapped);
    return mapped;
  } catch (error) {
    console.error('[purchaseService] Erro ao carregar pedidos de compra:', error);
    return [];
  }
};

// ❌ NÃO inicializar automaticamente - aguardar autenticação via supabaseInitService
// void loadFromSupabase();

// ✅ REALTIME: Inscrever em mudanças em tempo real
const subscribeToUpdates = (callback: (order: PurchaseOrder, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void) => {
  const channelName = `purchase_orders_${Date.now()}`;
  const isCanonical = isSqlCanonicalOpsEnabled();
  const tableName = isCanonical ? 'ops_purchase_orders' : 'purchase_orders';
  const channel = supabase.channel(channelName);

  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: tableName
      },
      (payload: any) => {

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newData = payload.new;
          if (newData) {
            const order = isCanonical ? mapOrderFromOpsRow(newData) : mapOrderFromDb(newData);
            // Atualizar cache local - verificar se já existe para evitar duplicação
            const existing = db.getById(order.id);
            if (existing) {
              db.update(order);
            } else {
              db.add(order);
            }
            // Notificar subscribers
            callback(order, payload.eventType);
          }
        } else if (payload.eventType === 'DELETE') {
          const oldData = payload.old;
          if (oldData?.id) {
            db.delete(oldData.id);
            // Notificar com ID do deletado
            callback({ id: oldData.id } as PurchaseOrder, 'DELETE');
          }
        }
      }
    )
    .subscribe((status) => {
    });

  // Retornar função para desinscrever
  return () => {
    supabase.removeChannel(channel);
  };
};

let purchaseRealtimeUnsub: (() => void) | null = null;
const startRealtime = () => {
  if (purchaseRealtimeUnsub) return;
  purchaseRealtimeUnsub = subscribeToUpdates(() => {
    // Atualizacao em tempo real do cache local
  });
};

const stopRealtime = () => {
  if (purchaseRealtimeUnsub) {
    purchaseRealtimeUnsub();
    purchaseRealtimeUnsub = null;
  }
};

export const purchaseService = {
  getAll: () => db.getAll(),
  getById: (id: string) => db.getById(id),
  subscribe: (callback: (items: PurchaseOrder[]) => void) => db.subscribe(callback),
  reload: () => {
    return loadFromSupabase();
  },
  loadFromSupabase,
  startRealtime,
  stopRealtime,
  importData: (data: PurchaseOrder[]) => {
    if (!data) return;
    db.setAll(data);
    const companyId = authService.getCurrentUser()?.companyId;
    if (!companyId) return;

    void (async () => {
      try {
        const payload = data.map(order => ({
          ...mapOrderToDb(order),
          company_id: companyId
        }));
        const { error } = await supabase.from('purchase_orders').upsert(payload, { onConflict: 'id' });
        if (error) console.error('❌ Erro ao sincronizar pedidos de compra:', error);

      } catch (err) {
        console.error('[purchaseService] Erro na sincronização batch:', err);
      }
    })();
  },
  add: async (order: PurchaseOrder) => {
    await upsertPurchaseOrderCanonical(order);

    // 1. Tentar persistir no Supabase primeiro
    const result = await persistUpsert(order);
    if (!result.success) return result;

    // 2. Se sucesso, atualizar cache local
    db.add(order);

    // ✅ Operações secundárias: NÃO bloqueiam o retorno do save
    // Payable, log e audit rodam em background para evitar travamento da UI
    void (async () => {
      try {
        if (order.totalValue && order.totalValue > 0 && order.partnerId) {
          await createPayableForPurchaseOrder(order);
        }
      } catch (err) {
        console.error('Erro ao criar payable (background):', err);
      }
    })();

    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'create', module: 'Compras', description: `Criou Pedido de Compra ${order.number}`, entityId: order.id });

    // Audit Log (já era void)
    void auditService.logAction('create', 'Compras', `Pedido de compra criado: #${order.number} - ${order.partnerName} - R$ ${order.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, {
      entityType: 'PurchaseOrder',
      entityId: order.id,
      metadata: { partnerId: order.partnerId, totalValue: order.totalValue, status: order.status }
    });

    invalidateDashboardCache();
    invalidateFinancialCache();
    return { success: true };
  },
  update: async (updatedOrder: PurchaseOrder) => {
    await upsertPurchaseOrderCanonical(updatedOrder);

    // 1. Tentar persistir no Supabase primeiro
    const result = await persistUpsert(updatedOrder);
    if (!result.success) return result;

    // 2. Se sucesso, atualizar cache local
    const oldOrder = db.getById(updatedOrder.id);
    db.update(updatedOrder);
    invalidateFinancialCache();

    // ✅ DETECÇÃO DE MUDANÇAS FINANCEIRAS (Histórico)
    if (oldOrder) {
      const oldTxs = oldOrder.transactions || [];
      const newTxs = updatedOrder.transactions || [];

      // Transactions are now handled via financialTransactionService in updateTransaction
    }

    // 3. Detectar pagamentos modificados (valor ou conta)
    // Simplificação: só loga se houver diferença de valor. Se mudar conta, idealmente estorna e recria, mas aqui vamos focar no valor.
    // Se a conta mudar, o saldo da conta antiga não é corrigido aqui automaticamente sem estorno complexo.
    // Para MVP de correção, focamos no valor.

    // ✅ Verificar se já existe um payable para este pedido, se não, criar
    // Roda em background para não bloquear o retorno do update
    if (!isSqlCanonicalOpsEnabled() && updatedOrder.totalValue && updatedOrder.totalValue > 0 && updatedOrder.partnerId) {
      void (async () => {
        try {
          const allPayables = payablesService.getAll();
          const existingPayable = allPayables.find(
            p => p.purchaseOrderId === updatedOrder.id && p.subType === 'purchase_order'
          );

          if (!existingPayable) {
            await createPayableForPurchaseOrder(updatedOrder);
          } else {
            // Atualizar valores do payable existente
            const orderAmount = Number(updatedOrder.totalValue) || 0;
            const orderPaidAmount = Number(updatedOrder.paidValue) || 0;

            payablesService.update({
              ...existingPayable,
              amount: orderAmount,
              paidAmount: orderPaidAmount,
              status: orderPaidAmount >= orderAmount ? 'paid' : orderPaidAmount > 0 ? 'partially_paid' : 'pending'
            });

            // Single Ledger: Também atualizar a financial_entry (Dual Write)
            await createPayableForPurchaseOrder(updatedOrder);
          }
        } catch (err) {
          console.error('Erro ao atualizar payable (background):', err);
        }
      })();
    }

    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'update', module: 'Compras', description: `Atualizou Pedido ${updatedOrder.number}`, entityId: updatedOrder.id });

    // Audit Log
    void auditService.logAction('update', 'Compras', `Pedido de compra atualizado: #${updatedOrder.number} - Status: ${updatedOrder.status}`, {
      entityType: 'PurchaseOrder',
      entityId: updatedOrder.id,
      metadata: { status: updatedOrder.status, totalValue: updatedOrder.totalValue, paidValue: updatedOrder.paidValue }
    });

    invalidateDashboardCache();
    return { success: true };
  },

  updateTransaction: async (orderId: string, updatedTx: OrderTransaction) => {
    const order = db.getById(orderId);
    if (!order) return;

    if (updatedTx.type === 'payment' || updatedTx.type === 'advance') {
      await financialTransactionService.add({
        date: updatedTx.date,
        description: `Pagamento Pedido #${order.number} (Editado)`,
        amount: updatedTx.value,
        type: 'payment',
        bankAccountId: updatedTx.accountId,
        financialRecordId: order.id,
        companyId: (order as any).companyId || ''
      });
    }

    const newTxs = (order.transactions || []).map(t => t.id === updatedTx.id ? updatedTx : t);
    const updated = { ...order, transactions: newTxs };
    db.update(updated);
    void persistUpsert(updated);
    // ❌ REMOVIDO: void financialSyncService.syncPurchaseOrder(orderId);
    // Sync agora é feito apenas via financialActionService.processRecord()
    invalidateFinancialCache();
    invalidateDashboardCache();
    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'update', module: 'Financeiro', description: `Editou pagamento no Pedido ${order.number}`, entityId: orderId });
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

    // Note: Removed syncDeleteFromOrigin call to avoid circular dependency. 
    // Financial records should be managed via Financial module if needed.

    const newTxs = (order.transactions || []).filter(t => t.id !== txId);
    const updated = { ...order, transactions: newTxs };
    db.update(updated);
    void persistUpsert(updated);
    // ❌ REMOVIDO: void financialSyncService.syncPurchaseOrder(orderId);
    // Sync agora é feito apenas via financialActionService.processRecord()
    invalidateFinancialCache();

    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'delete', module: 'Financeiro', description: `Estornou pagamento do Pedido ${order.number}`, entityId: orderId });
  },

  delete: async (id: string) => {
    const order = db.getById(id);
    if (!order) {
      return { success: false, error: 'Pedido não encontrado' };
    }

    const canonicalDeleted = await deletePurchaseOrderCanonical(id);
    const canonicalAuthoritative = isSqlCanonicalOpsEnabled() && canonicalDeleted;


    const allPayables = payablesService.getAll();
    const linkedPayables = allPayables.filter(p => p.purchaseOrderId === id);

    if (!canonicalAuthoritative) {
      // ========================================================================
      // PASSO 1: Apagar CARREGAMENTOS vinculados (e seus filhos: frete, comissão)
      // ========================================================================
      const linkedLoadings = loadingService.getByPurchaseOrder(id);
      if (linkedLoadings.length > 0) {
        for (const l of linkedLoadings) {
          try {
            // loadingService.delete já cuida de comissões, freight_expenses e payables de frete/comissão
            await loadingService.delete(l.id);
            // Aguardar exclusão no banco (ops_loadings — logistics_loadings NÃO existe)
            await supabase.from('ops_loadings').delete().or(`legacy_id.eq.${l.id},id.eq.${l.id}`);
          } catch (err) {
            console.error(`[purchaseService] Erro ao deletar carregamento ${l.id}:`, err);
          }
        }
      }

      // ========================================================================
      // PASSO 2: Apagar PAYABLES vinculados e suas TRANSAÇÕES FINANCEIRAS
      // ========================================================================
      const payableIds = linkedPayables.map(p => p.id);

      // ========================================================================
      // PASSO 3: ✅ LIMPEZA COMPLETA via orquestrador centralizado
      // Limpa: financial_history + admin_expenses (standalone) + financial_transactions
      // em uma operação consistente
      // ========================================================================
      try {
        const { cleanupFinancialRecords } = await import('./financial/paymentOrchestrator');
        await cleanupFinancialRecords({
          entityId: id,
          entityType: 'purchase_order',
          payableIds
        });
      } catch (err) {
        console.error('[purchaseService] Erro ao limpar registros financeiros:', err);
      }

      // PASSO 4: Apagar os PAYABLES (Agora tratados via CASCADE no banco, mas mantemos limpeza de cache/UI)
      if (linkedPayables.length > 0) {
        for (const p of linkedPayables) {
          try {
            // Apenas deleta do cache/estado local se necessário, 
            // o banco já apagou via CASCADE do purchase_orders
            payablesService.delete(p.id);
          } catch (err) {
            console.error(`[purchaseService] Erro ao deletar payable ${p.id}:`, err);
          }
        }
      }
    } else {
      // ✅ SQL-first: delete canônico já remove vínculos financeiros no banco
      void payablesService.loadFromSupabase();
    }

    // ========================================================================
    // PASSO 5: Apagar o PEDIDO DE COMPRA (cache local + Supabase)
    // ========================================================================
    db.delete(id);

    if (!canonicalAuthoritative) {
      try {
        const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
        if (error) {
          db.add(order);
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        db.add(order);
        return { success: false, error: err.message };
      }
    }

    // ========================================================================
    // PASSO 5: Auditoria e limpeza de cache
    // ========================================================================
    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'delete',
      module: 'Compras',
      description: `Excluiu Pedido ${order.number}, ${linkedPayables.length} payable(s)`,
      entityId: id
    });

    void auditService.logAction('delete', 'Compras', `Pedido de compra excluído: #${order.number} - ${order.partnerName}`, {
      entityType: 'PurchaseOrder',
      entityId: id,
      metadata: { totalValue: order.totalValue, status: order.status, linkedPayables: linkedPayables.length, canonicalAuthoritative }
    });


    DashboardCache.clearAll();
    invalidateDashboardCache();
    invalidateFinancialCache();

    return { success: true };
  },
};

// ❌ REMOVIDO: eventBus.on('payable:updated', ...)
// Motivo: Criava loop infinito → payable atualizado → syncPurchaseOrder → update payable → payable atualizado...
// A sincronização agora é unidirecional: Financeiro → processa pagamento → atualiza payable (fim)
