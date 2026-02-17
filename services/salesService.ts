
import { SalesOrder, SalesTransaction, SalesStatus } from '../modules/SalesOrder/types';
import { Persistence } from './persistence';
import { logService } from './logService';
import { authService } from './authService';
import { supabase } from './supabase';
import { receivablesService, Receivable } from './financial/receivablesService';
import { DashboardCache, invalidateDashboardCache } from './dashboardCache';
import { auditService } from './auditService';


const INITIAL_SALES: SalesOrder[] = [];
const db = new Persistence<SalesOrder>('sales_orders', INITIAL_SALES, { useStorage: false });
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

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
  notes: order.notes || null,
  metadata: order,
  company_id: authService.getCurrentUser()?.companyId || null
});

const mapOrderFromDb = (row: any): SalesOrder => {
  const meta: SalesOrder | undefined = row?.metadata;
  const base: SalesOrder = meta ? { ...meta } : {
    id: row?.id,
    number: row?.number || '',
    date: row?.date || new Date().toISOString().slice(0, 10),
    status: statusFromDb(row?.status),
    consultantName: '',
    customerId: row?.partner_id || '',
    customerName: '',
    customerDocument: '',
    customerCity: '',
    customerState: '',
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
    id: row?.id ?? base.id,
    number: row?.number ?? base.number,
    date: row?.date ?? base.date,
    status: statusFromDb(row?.status ?? base.status),
    totalValue: row?.total_value ?? base.totalValue ?? 0,
    notes: row?.notes ?? base.notes
  };
};

// ============================================================================
// CARREGAMENTO INICIAL (SUPABASE)
// ============================================================================

const loadFromSupabase = async (retries = 2): Promise<SalesOrder[]> => {
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
    console.log('🔄 Pedidos de venda sincronizando em tempo real...');
    return mapped;
  } catch (error) {
    if (retries > 0) {
      console.warn(`⚠️ Retry loadFromSupabase salesService (${retries} restantes)...`);
      await new Promise(r => setTimeout(r, 1000));
      return loadFromSupabase(retries - 1);
    }
    console.error('❌ Erro ao carregar pedidos de venda:', error);
    return [];
  }
};

// ❌ NÃO inicializar automaticamente - aguardar autenticação via supabaseInitService
// void loadFromSupabase();

const persistUpsert = async (order: SalesOrder) => {
  try {
    const payload: any = mapOrderToDb(order);
    const isValidUuid = (v?: string) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
    if (!isValidUuid(payload.id)) {
      delete payload.id; // permite que o banco gere UUID automaticamente
    }
    const { error } = await supabase.from('sales_orders').upsert(payload).select();
    if (error) {
      console.error('Erro ao salvar pedido de venda no Supabase', error);
      return;
    }
    // Atualiza cache local para refletir possíveis IDs gerados no banco
    await syncFromSupabase();
  } catch (err) {
    console.error('Erro inesperado ao salvar pedido de venda no Supabase', err);
  }
};

const persistDelete = async (id: string) => {
  try {
    const { error } = await supabase.from('sales_orders').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir pedido de venda no Supabase', error);
    }
  } catch (err) {
    console.error('Erro inesperado ao excluir pedido de venda no Supabase', err);
  }
};

const syncFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('sales_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (data) {
      const mapped = data.map(mapOrderFromDb);
      db.setAll(mapped);
    }
  } catch (err) {
    console.error('❌ Erro ao sincronizar sales_orders do Supabase:', err);
  }
};

// ❌ NÃO inicializar automaticamente - aguardar autenticação via supabaseInitService
// void syncFromSupabase();

const startRealtime = () => {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('realtime:sales_orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_orders' }, (payload) => {
      const rec = payload.new || payload.old;
      if (!rec) return;

      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const mapped = mapOrderFromDb(rec);
        const existing = db.getById(mapped.id);
        if (existing) db.update(mapped);
        else db.add(mapped);
      } else if (payload.eventType === 'DELETE') {
        db.delete(rec.id);
      }
      // console.log(`🔔 Realtime sales_orders: ${payload.eventType}`);
    })
    .subscribe(status => {
      if (status === 'SUBSCRIBED') {
        // console.log('✅ Realtime ativo: sales_orders');
      }
    });
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
const syncFinancialStatus = async (salesOrderId: string) => {
  if (!salesOrderId) return;

  // 1. Buscar todos os receivables vinculados a este pedido
  const allReceivables = receivablesService.getAll();
  const linkedReceivables = allReceivables.filter(r => r.salesOrderId === salesOrderId);

  if (linkedReceivables.length === 0) return;

  // 2. Calcular total recebido
  const totalReceived = linkedReceivables.reduce((sum, r) => sum + (r.receivedAmount || 0), 0);

  // 3. Buscar o pedido
  const order = db.getById(salesOrderId);
  if (!order) return;

  // 4. Verificar se precisa atualizar
  if (Math.abs((order.paidValue || 0) - totalReceived) < 0.01) {
    return;
  }

  console.log(`🔄 Sincronizando Venda ${order.number}: Recebido ${order.paidValue} -> ${totalReceived}`);

  // 5. Atualizar pedido
  const updatedOrder = {
    ...order,
    paidValue: totalReceived
  };

  db.update(updatedOrder);
  await persistUpsert(updatedOrder);

  invalidateDashboardCache();
  window.dispatchEvent(new Event('sales_orders:updated'));
};

const syncReceivableForOrder = (orderId: string, newPaidValue: number) => {
  const receivable = receivablesService.getAll().find(r => r.salesOrderId === orderId);
  if (!receivable) return;

  const receivedAmount = Number(newPaidValue.toFixed(2));
  const status: Receivable['status'] = receivedAmount >= receivable.amount - 0.01
    ? 'received'
    : receivedAmount > 0
      ? 'partially_received'
      : 'pending';

  receivablesService.update({
    ...receivable,
    receivedAmount,
    status
  });
};

export const salesService = {
  getAll: () => db.getAll(),

  getById: (id: string) => db.getById(id),

  add: (sale: SalesOrder) => {
    db.add(sale);
    void persistUpsert(sale);

    // ✅ Criar automaticamente um receivable para o pedido de venda
    if (sale.totalValue && sale.totalValue > 0 && sale.customerId) {
      const generateUUID = (): string => {
        if (typeof self !== 'undefined' && self.crypto && self.crypto.randomUUID) {
          return self.crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      };
      receivablesService.add({
        id: generateUUID(),
        salesOrderId: sale.id,
        partnerId: sale.customerId, // Já validado acima
        description: `Pedido de Venda ${sale.number}`,
        dueDate: new Date(new Date(sale.date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: sale.totalValue,
        receivedAmount: sale.paidValue || 0,
        status: (sale.paidValue || 0) >= sale.totalValue ? 'received' : 'pending',
        notes: `Cliente: ${sale.customerName}`
      });
    }

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
  },

  update: (updatedSale: SalesOrder) => {
    const oldSale = db.getById(updatedSale.id);
    db.update(updatedSale);
    void persistUpsert(updatedSale);

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
  },

  updateTransaction: (orderId: string, updatedTx: SalesTransaction) => {
    const order = db.getById(orderId);
    if (!order) return;
    const newTxs = (order.transactions || []).map(t => t.id === updatedTx.id ? updatedTx : t);
    const newPaidValue = newTxs
      .filter(t => t.type === 'receipt')
      .reduce((acc, t) => acc + t.value + (t.discountValue || 0), 0);
    const updated = { ...order, transactions: newTxs, paidValue: newPaidValue };
    db.update(updated);
    void persistUpsert(updated);
    syncReceivableForOrder(orderId, newPaidValue);
    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'update', module: 'Financeiro', description: `Editou recebimento na Venda ${order.number}`, entityId: orderId });
    invalidateDashboardCache();
  },

  deleteTransaction: (orderId: string, txId: string) => {
    const order = db.getById(orderId);
    if (!order) return;
    const newTxs = (order.transactions || []).filter(t => t.id !== txId);
    const newPaidValue = newTxs
      .filter(t => t.type === 'receipt')
      .reduce((acc, t) => acc + t.value + (t.discountValue || 0), 0);
    const updated = { ...order, transactions: newTxs, paidValue: newPaidValue };
    db.update(updated);
    void persistUpsert(updated);
    syncReceivableForOrder(orderId, newPaidValue);
    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'delete', module: 'Financeiro', description: `Estornou recebimento da Venda ${order.number}`, entityId: orderId });
  },

  delete: async (id: string) => {
    const order = db.getById(id);
    if (!order) {
      console.warn('⚠️ Pedido de venda não encontrado para exclusão:', id);
      return { success: false, error: 'Pedido não encontrado' };
    }

    // ✅ Apagar receivables vinculados ao pedido de venda
    const allReceivables = receivablesService.getAll();
    const linkedReceivables = allReceivables.filter(r => r.salesOrderId === id);

    console.log(`🗑️ Apagando ${linkedReceivables.length} receivables vinculados ao pedido ${order.number}`);
    linkedReceivables.forEach(r => {
      receivablesService.delete(r.id);
    });

    // ✅ Apagar do cache local
    db.delete(id);

    // ✅ Apagar do Supabase e aguardar resultado
    try {
      const { error } = await supabase.from('sales_orders').delete().eq('id', id);
      if (error) {
        console.error('❌ Erro ao excluir pedido de venda no Supabase:', error);
        // Reverter exclusão local se falhar no Supabase
        db.add(order);
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      console.error('❌ Erro inesperado ao excluir pedido de venda:', err);
      db.add(order);
      return { success: false, error: err.message };
    }

    // ✅ Log de auditoria
    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'delete',
      module: 'Vendas',
      description: `Excluiu Pedido de Venda ${order.number}`,
      entityId: id
    });

    // Audit Log
    void auditService.logAction('delete', 'Vendas', `Pedido de venda excluído: #${order.number} - ${order.customerName}`, {
      entityType: 'SalesOrder',
      entityId: id,
      metadata: { totalValue: order.totalValue, status: order.status, linkedReceivables: linkedReceivables.length }
    });

    console.log('✅ Pedido de venda excluído com sucesso:', order.number);

    // 🎯 LIMPAR CACHE DO DASHBOARD IMEDIATAMENTE
    DashboardCache.clearAll();
    invalidateDashboardCache();

    return { success: true };
  },

  importData: (data: SalesOrder[]) => {
    db.setAll(data);
    const payload = data.map(mapOrderToDb);
    void (async () => {
      try {
        const { error } = await supabase.from('sales_orders').upsert(payload);
        if (error) {
          console.error('Erro ao importar vendas no Supabase', error);
        }
      } catch (err) {
        console.error('Erro inesperado ao importar vendas no Supabase', err);
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
  syncFinancialStatus
};

import { eventBus } from './eventBus';

// ✅ Inscrever no EventBus para atualizações financeiras
eventBus.on('receivable:updated', (data: { salesOrderId: string }) => {
  if (data && data.salesOrderId) {
    console.log('🔔 Evento recebido: receivable:updated', data);
    salesService.syncFinancialStatus(data.salesOrderId);
  }
});
