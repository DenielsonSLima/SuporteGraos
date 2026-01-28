
import { PurchaseOrder, OrderTransaction, OrderStatus } from '../modules/PurchaseOrder/types';
import { Persistence } from './persistence';
import { logService } from './logService';
import { authService } from './authService';
import { loadingService } from './loadingService';
import { supabase } from './supabase';
import { payablesService } from './financial/payablesService';

const INITIAL_ORDERS: PurchaseOrder[] = [];
const db = new Persistence<PurchaseOrder>('purchase_orders', INITIAL_ORDERS);

type DbStatus = 'pending' | 'approved' | 'received' | 'cancelled';

const statusToDb = (status: OrderStatus): DbStatus => {
  switch (status) {
    case 'approved':
    case 'pending':
    case 'draft':
      return 'pending';
    case 'transport':
      return 'approved';
    case 'completed':
      return 'received';
    case 'canceled':
      return 'cancelled';
    default:
      return 'pending';
  }
};

const statusFromDb = (status?: string): OrderStatus => {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'received':
      return 'completed';
    case 'cancelled':
      return 'canceled';
    case 'pending':
    default:
      return 'pending';
  }
};

const mapOrderToDb = (order: PurchaseOrder) => ({
  id: order.id,
  number: order.number,
  partner_id: order.partnerId || null,
  date: order.date,
  status: statusToDb(order.status),
  total_value: order.totalValue ?? 0,
  received_value: order.paidValue ?? 0,
  notes: order.notes || null,
  metadata: order,
  company_id: null
});

const mapOrderFromDb = (row: any): PurchaseOrder => {
  const meta: PurchaseOrder | undefined = row?.metadata;
  const base: PurchaseOrder = meta ? { ...meta } : {
    id: row?.id,
    number: row?.number || '',
    date: row?.date || new Date().toISOString().slice(0, 10),
    status: statusFromDb(row?.status),
    consultantName: '',
    partnerId: row?.partner_id || '',
    partnerName: '',
    partnerDocument: '',
    partnerCity: '',
    partnerState: '',
    useRegisteredLocation: false,
    loadingCity: '',
    loadingState: '',
    harvest: '',
    hasBroker: false,
    items: [],
    transactions: [],
    totalValue: row?.total_value || 0,
    paidValue: row?.received_value || 0,
    transportValue: 0
  } as PurchaseOrder;

  // Migração: se loadingCity/loadingState não existem no metadata, usar partnerCity/State como fallback
  if (meta && (!meta.loadingCity || !meta.loadingState)) {
    base.loadingCity = meta.partnerCity || '';
    base.loadingState = meta.partnerState || '';
    if (meta.useRegisteredLocation === undefined) {
      base.useRegisteredLocation = true; // Assume endereço cadastrado para pedidos antigos
    }
  }

  return {
    ...base,
    id: row?.id ?? base.id,
    number: row?.number ?? base.number,
    date: row?.date ?? base.date,
    status: statusFromDb(row?.status ?? base.status),
    totalValue: row?.total_value ?? base.totalValue ?? 0,
    paidValue: row?.received_value ?? base.paidValue ?? 0,
    notes: row?.notes ?? base.notes
  };
};

const persistUpsert = async (order: PurchaseOrder) => {
  try {
    const { error } = await supabase.from('purchase_orders').upsert(mapOrderToDb(order));
    if (error) {
      console.error('Erro ao salvar pedido no Supabase', error);
      return;
    }
    // Sincroniza despesas extras (não-bloqueante)
    syncExpenses(order).catch(err => {
      console.warn('⚠️ Falha ao sincronizar despesas extras (não-crítico):', err);
    });
  } catch (err) {
    console.error('Erro inesperado ao salvar pedido no Supabase', err);
  }
};

const syncExpenses = async (order: PurchaseOrder) => {
  try {
    // Busca despesas existentes no Supabase
    const { data: existingExpenses } = await supabase
      .from('purchase_expenses')
      .select('id')
      .eq('purchase_order_id', order.id);

    const existingIds = (existingExpenses || []).map(e => e.id);
    
    // Despesas do tipo 'expense' no metadata
    const expenseTransactions = (order.transactions || []).filter(t => t.type === 'expense');
    const metadataIds = expenseTransactions.map(t => t.id);

    // Remove despesas deletadas
    const toDelete = existingIds.filter(id => !metadataIds.includes(id));
    if (toDelete.length > 0) {
      await supabase.from('purchase_expenses').delete().in('id', toDelete);
    }

    // Upsert despesas atuais
    const expensesPayload = expenseTransactions.map(tx => ({
      id: tx.id,
      purchase_order_id: order.id,
      expense_category_id: tx.accountId || '00000000-0000-0000-0000-000000000000',
      description: tx.notes || 'Despesa extra',
      value: tx.value,
      expense_date: tx.date,
      paid: false,
      notes: tx.notes || null,
      company_id: null
    }));

    if (expensesPayload.length > 0) {
      const { error } = await supabase.from('purchase_expenses').upsert(expensesPayload);
      if (error) {
        console.error('Erro ao sincronizar despesas extras', error);
      }
    }
  } catch (err) {
    console.error('Erro ao sincronizar despesas extras', err);
  }
};

const persistDelete = async (id: string) => {
  try {
    // O CASCADE no banco já remove as despesas automaticamente
    const { error } = await supabase.from('purchase_orders').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir pedido no Supabase', error);
    }
  } catch (err) {
    console.error('Erro inesperado ao excluir pedido no Supabase', err);
  }
};

const syncFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (data) {
      const mapped = data.map(mapOrderFromDb);
      db.setAll(mapped);
    }
  } catch (err) {
    console.error('❌ Erro ao sincronizar purchase_orders do Supabase:', err);
  }
};

void syncFromSupabase();

// ============================================================================
// SYNC DE PAYABLES PARA PEDIDOS EXISTENTES
// ============================================================================

// Sincronizar payables para pedidos que ainda não têm
const syncPayablesForExistingOrders = () => {
  setTimeout(() => {
    const orders = db.getAll();
    const payables = payablesService.getAll();
    
    orders.forEach(order => {
      if (order.totalValue && order.totalValue > 0 && order.partnerId) {
        const hasPayable = payables.some(
          p => p.purchaseOrderId === order.id && p.subType === 'purchase_order'
        );
        
        if (!hasPayable) {
          console.log('🔄 Sincronizando payable para pedido existente:', order.number);
          createPayableForPurchaseOrder(order);
        }
      }
    });
  }, 2000); // Aguarda 2s para garantir que tudo carregou
};

syncPayablesForExistingOrders();

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

// ============================================================================
// FUNÇÃO HELPER PARA CRIAR PAYABLE
// ============================================================================

const createPayableForPurchaseOrder = (order: PurchaseOrder) => {
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
  
  // Debug: Validar dados antes de criar payable
  console.log('🔍 DEBUG - Criando payable do pedido de compra:', {
    orderId: order.id,
    partnerId: order.partnerId,
    partnerName: order.partnerName,
    totalValue: order.totalValue,
    paidValue: order.paidValue,
    date: order.date
  });

  const orderAmount = Number(order.totalValue) || 0;
  const orderPaidAmount = Number(order.paidValue) || 0;
  
  if (orderAmount <= 0) {
    console.warn('⚠️ Valor do pedido inválido:', order.totalValue);
    return;
  }

  payablesService.add({
    id: generateUUID(),
    purchaseOrderId: order.id,
    partnerId: order.partnerId,
    partnerName: order.partnerName,
    description: `Pedido de Compra ${order.number}`,
    dueDate: new Date(new Date(order.date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 dias
    amount: orderAmount,
    paidAmount: orderPaidAmount,
    status: orderPaidAmount >= orderAmount ? 'paid' : orderPaidAmount > 0 ? 'partially_paid' : 'pending',
    subType: 'purchase_order', // ✅ TIPO: PEDIDO DE COMPRA
    notes: `Fornecedor: ${order.partnerName}`
  });

  console.log('✅ Payable do pedido de compra criado com sucesso');
};

export const purchaseService = {
  getAll: () => db.getAll(),
  getById: (id: string) => db.getById(id),
  add: (order: PurchaseOrder) => {
    db.add(order);
    void persistUpsert(order);
    
    // ✅ Criar automaticamente um payable para o pedido de compra
    if (order.totalValue && order.totalValue > 0 && order.partnerId) {
      createPayableForPurchaseOrder(order);
    }
    
    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'create', module: 'Compras', description: `Criou Pedido de Compra ${order.number}`, entityId: order.id });
  },
  update: (updatedOrder: PurchaseOrder) => {
    db.update(updatedOrder);
    void persistUpsert(updatedOrder);
    
    // ✅ Verificar se já existe um payable para este pedido, se não, criar
    if (updatedOrder.totalValue && updatedOrder.totalValue > 0 && updatedOrder.partnerId) {
      const allPayables = payablesService.getAll();
      const existingPayable = allPayables.find(
        p => p.purchaseOrderId === updatedOrder.id && p.subType === 'purchase_order'
      );
      
      if (!existingPayable) {
        console.log('🔄 Pedido atualizado sem payable - criando agora:', updatedOrder.id);
        createPayableForPurchaseOrder(updatedOrder);
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
      }
    }
    
    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'update', module: 'Compras', description: `Atualizou Pedido ${updatedOrder.number}`, entityId: updatedOrder.id });
  },
  
  updateTransaction: (orderId: string, updatedTx: OrderTransaction) => {
    const order = db.getById(orderId);
    if (!order) return;
    const newTxs = (order.transactions || []).map(t => t.id === updatedTx.id ? updatedTx : t);
    const newPaidValue = newTxs.filter(t => t.type === 'payment' || t.type === 'advance').reduce((acc, t) => acc + t.value, 0);
    const updated = { ...order, transactions: newTxs, paidValue: newPaidValue };
    db.update(updated);
    void persistUpsert(updated);
    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'update', module: 'Financeiro', description: `Editou pagamento no Pedido ${order.number}`, entityId: orderId });
  },

  deleteTransaction: (orderId: string, txId: string) => {
    const order = db.getById(orderId);
    if (!order) return;
    
    // Note: Removed syncDeleteFromOrigin call to avoid circular dependency. 
    // Financial records should be managed via Financial module if needed.

    const newTxs = (order.transactions || []).filter(t => t.id !== txId);
    const newPaidValue = newTxs.filter(t => t.type === 'payment' || t.type === 'advance').reduce((acc, t) => acc + t.value, 0);
    const updated = { ...order, transactions: newTxs, paidValue: newPaidValue };
    db.update(updated);
    void persistUpsert(updated);
    
    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'delete', module: 'Financeiro', description: `Estornou pagamento do Pedido ${order.number}`, entityId: orderId });
  },

  delete: (id: string) => {
    const order = db.getById(id);
    if (!order) return;

    // 1. Limpa todos os romaneios vinculados
    const linkedLoadings = loadingService.getByPurchaseOrder(id);
    linkedLoadings.forEach(l => {
        loadingService.delete(l.id);
    });

    // 2. Exclui o pedido principal
    db.delete(id);
    void persistDelete(id);

    // 3. Log da ação pesada
    const { userId, userName } = getLogInfo();
    logService.addLog({ 
        userId, 
        userName, 
        action: 'delete', 
        module: 'Compras', 
        description: `EXCLUSÃO EM CASCATA: Pedido ${order.number}, Romaneios (${linkedLoadings.length}) removidos.`, 
        entityId: id 
    });
  },
  
  importData: (data: PurchaseOrder[]) => {
    db.setAll(data);
    const payload = data.map(mapOrderToDb);
    void (async () => {
      try {
        const { error } = await supabase.from('purchase_orders').upsert(payload);
        if (error) {
          console.error('Erro ao importar pedidos no Supabase', error);
        }
      } catch (err) {
        console.error('Erro inesperado ao importar pedidos no Supabase', err);
      }
    })();
  },

  // ✅ REALTIME: Inscrever em mudanças em tempo real
  subscribeToUpdates: (callback: (order: PurchaseOrder) => void) => {
    const channel = supabase.channel('purchase_orders_realtime');
    
    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_orders' },
        (payload: any) => {
          const newData = payload.new;
          if (newData) {
            const order = mapOrderFromDb(newData);
            // Atualizar cache local
            if (payload.eventType === 'INSERT') {
              db.add(order);
            } else if (payload.eventType === 'UPDATE') {
              db.update(order);
            } else if (payload.eventType === 'DELETE') {
              db.delete(order.id);
            }
            // Notificar subscribers
            callback(order);
          }
        }
      )
      .subscribe();

    // Retornar função para desinscrever
    return () => {
      supabase.removeChannel(channel);
    };
  }
};
