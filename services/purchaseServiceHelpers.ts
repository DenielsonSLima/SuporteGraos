
import { PurchaseOrder, OrderStatus } from '../modules/PurchaseOrder/types';
import { authService } from './authService';
import { supabase } from './supabase';
import { payablesService } from './financial/payablesService';
import { getTodayBR, parseStringToLocalDate, getLocalDateString } from '../utils/dateUtils';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from './sqlCanonicalOps';

// ============================================================================
// TIPOS
// ============================================================================

export type DbStatus = 'pending' | 'approved' | 'received' | 'cancelled';

// ============================================================================
// MAPPERS DE STATUS
// ============================================================================

export const statusToDb = (status: OrderStatus): DbStatus => {
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

export const statusFromDb = (status?: string): OrderStatus => {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'received':
      return 'completed';
    case 'cancelled':
    case 'canceled':
      return 'canceled';
    case 'pending':
    default:
      return 'pending';
  }
};

// ============================================================================
// MAPPERS DE ENTIDADE
// ============================================================================

export const mapOrderToDb = (order: PurchaseOrder) => ({
  id: order.id,
  number: order.number,
  partner_id: order.partnerId || null,
  date: order.date,
  status: statusToDb(order.status),
  total_value: order.totalValue ?? 0,
  received_value: order.paidValue ?? 0,
  partner_name: order.partnerName,
  notes: order.notes || null,
  metadata: order,
  company_id: authService.getCurrentUser()?.companyId || null
});

export const mapOrderFromDb = (row: any): PurchaseOrder => {
  const meta: PurchaseOrder | undefined = row?.metadata;
  const base = {
    id: row.id,
    number: row.number,
    date: row.date || getTodayBR(),
    status: statusFromDb(row?.status),
    consultantName: '',
    partnerId: row?.partner_id || '',
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
      base.useRegisteredLocation = true;
    }
  }

  return {
    ...base,
    ...meta,
    id: row.id,
    number: row.number,
    date: row.date || base.date,
    partnerId: row.partner_id || base.partnerId,
    status: statusFromDb(row.status),
    totalValue: row.total_value ?? base.totalValue,
    partnerName: row?.partner_name ?? meta.partnerName ?? base.partnerName ?? 'Parceiro Não Informado',
    paidValue: Number(row?.received_value ?? base.paidValue ?? 0),
    notes: row.notes || base.notes
  };
};

export const mapOrderFromOpsRow = (row: any): PurchaseOrder => {
  const meta: PurchaseOrder | undefined = row?.metadata;

  return {
    id: row?.legacy_id ?? row?.id ?? meta?.id ?? '',
    number: row?.number ?? meta?.number ?? '',
    date: row?.order_date ?? meta?.date ?? getTodayBR(),
    status: (meta?.status as OrderStatus) ?? statusFromDb(row?.status),
    consultantName: meta?.consultantName ?? '',
    partnerId: row?.partner_id ?? meta?.partnerId ?? '',
    partnerName: row?.partner_name ?? meta?.partnerName ?? 'Parceiro Não Informado',
    partnerDocument: meta?.partnerDocument ?? '',
    partnerCity: meta?.partnerCity ?? '',
    partnerState: meta?.partnerState ?? '',
    useRegisteredLocation: meta?.useRegisteredLocation ?? false,
    loadingCity: meta?.loadingCity ?? '',
    loadingState: meta?.loadingState ?? '',
    loadingComplement: meta?.loadingComplement,
    harvest: meta?.harvest ?? '',
    hasBroker: meta?.hasBroker ?? false,
    brokerId: meta?.brokerId,
    brokerName: meta?.brokerName,
    brokerCommissionPerSc: meta?.brokerCommissionPerSc,
    deductBrokerCommission: meta?.deductBrokerCommission,
    brokerPaidValue: Number(row?.broker_paid_value ?? 0),
    brokerBalanceValue: Number(row?.broker_balance_value ?? 0),
    items: meta?.items ?? [],
    transactions: meta?.transactions ?? [],
    totalValue: Number(row?.total_value ?? 0),
    paidValue: Number(row?.paid_value ?? 0),
    balanceValue: Number(row?.balance_value ?? 0),
    discountValue: Number(row?.discount_value ?? 0),
    transportValue: Number(row?.transport_value ?? meta?.transportValue ?? 0),
    totalPurchaseValCalc: Number(row?.total_purchase_val_calc ?? 0),
    totalFreightValCalc: Number(row?.total_freight_val_calc ?? 0),
    totalSalesValCalc: Number(row?.total_sales_val_calc ?? 0),
    totalKg: Number(row?.total_kg ?? 0),
    totalSc: Number(row?.total_sc ?? 0),
    notes: row.notes || meta?.notes,
    notesList: meta?.notesList,
  };
};

// ============================================================================
// PERSISTÊNCIA
// ============================================================================

export const syncExpenses = async (order: PurchaseOrder) => {
  try {
    const { data: existingExpenses } = await supabase
      .from('purchase_expenses')
      .select('id')
      .eq('purchase_order_id', order.id);

    const existingIds = (existingExpenses || []).map(e => e.id);
    const expenseTransactions = (order.transactions || []).filter(t => t.type === 'expense');
    const metadataIds = expenseTransactions.map(t => t.id);

    const toDelete = existingIds.filter(id => !metadataIds.includes(id));
    if (toDelete.length > 0) {
      await supabase.from('purchase_expenses').delete().in('id', toDelete);
    }

    const expensesPayload = expenseTransactions.map(tx => ({
      id: tx.id,
      purchase_order_id: order.id,
      expense_category_id: tx.accountId || '00000000-0000-0000-0000-000000000000',
      description: tx.notes || 'Despesa extra',
      value: tx.value,
      expense_date: tx.date,
      paid: false,
      notes: tx.notes || null,
      company_id: authService.getCurrentUser()?.companyId || null
    }));

    if (expensesPayload.length > 0) {
      const { error } = await supabase.from('purchase_expenses').upsert(expensesPayload);
      if (error) {
      }
    }
  } catch (err) {
  }
};

export const persistUpsert = async (order: PurchaseOrder) => {
  if (isSqlCanonicalOpsEnabled()) {
    sqlCanonicalOpsLog(`purchaseService.persistUpsert legado ignorado (${order.id}) em modo canônico`);
    return { success: true };
  }

  try {
    const user = authService.getCurrentUser();
    if (!user?.companyId) {
      return { success: false, error: 'Sessão inválida ou empresa não identificada' };
    }

    const payload = mapOrderToDb(order);
    const { error } = await supabase.from('purchase_orders').upsert(payload);

    if (error) {
      return { success: false, error: error.message };
    }

    syncExpenses(order).catch(() => {});

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado' };
  }
};

export const upsertPurchaseOrderCanonical = async (order: PurchaseOrder): Promise<boolean> => {
  if (!isSqlCanonicalOpsEnabled()) return false;

  try {
    const { error } = await supabase.rpc('rpc_ops_purchase_order_upsert_v2', {
      p_payload: order as any
    });

    if (error) {
      sqlCanonicalOpsLog(`Falha RPC compra canônica v2 (${order.id}) — tentando v1`, error);

      const { error: fallbackError } = await supabase.rpc('rpc_ops_purchase_order_upsert_v1', {
        p_payload: order as any
      });

      if (fallbackError) {
        sqlCanonicalOpsLog(`Falha RPC compra canônica v1 (${order.id}) — fallback legado`, fallbackError);
        return false;
      }

      return true;
    }

    return true;
  } catch (error) {
    sqlCanonicalOpsLog(`Erro RPC compra canônica (${order.id}) — fallback legado`, error);
    return false;
  }
};

export const deletePurchaseOrderCanonical = async (orderId: string): Promise<boolean> => {
  if (!isSqlCanonicalOpsEnabled()) return false;

  try {
    const { error } = await supabase.rpc('rpc_ops_purchase_order_delete_v1', {
      p_legacy_id: orderId
    });

    if (error) {
      sqlCanonicalOpsLog(`Falha delete canônico compra (${orderId}) — fallback legado`, error);
      return false;
    }

    return true;
  } catch (error) {
    sqlCanonicalOpsLog(`Erro delete canônico compra (${orderId}) — fallback legado`, error);
    return false;
  }
};

// ============================================================================
// HELPERS
// ============================================================================

export const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

// ============================================================================
// PAYABLE SYNC
// ============================================================================

export const createPayableForPurchaseOrder = async (order: PurchaseOrder) => {
  if (isSqlCanonicalOpsEnabled()) {
    sqlCanonicalOpsLog('createPayableForPurchaseOrder ignorado: SQL canônico ativo');
    return;
  }

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

  const orderAmount = Number(order.totalValue) || 0;
  const orderPaidAmount = Number(order.paidValue) || 0;

  if (orderAmount <= 0) {
    return;
  }

  const pDate = parseStringToLocalDate(order.date);
  const dueDateObj = new Date(pDate);
  dueDateObj.setDate(pDate.getDate() + 30);
  const dueDate = getLocalDateString(dueDateObj);

  payablesService.add({
    id: generateUUID(),
    purchaseOrderId: order.id,
    partnerId: order.partnerId,
    partnerName: order.partnerName,
    description: `Pedido de Compra ${order.number}`,
    dueDate,
    amount: orderAmount,
    paidAmount: orderPaidAmount,
    status: orderPaidAmount >= orderAmount ? 'paid' : orderPaidAmount > 0 ? 'partially_paid' : 'pending',
    subType: 'purchase_order',
    notes: `Fornecedor: ${order.partnerName}`
  });

  // Dual Write: Sincronizar com financial_entries
  try {
    const companyId = authService.getCurrentUser()?.companyId;
    if (companyId) {
      const { data: existing } = await supabase
        .from('financial_entries')
        .select('id')
        .eq('origin_id', order.id)
        .eq('origin_type', 'purchase_order')
        .single();

      if (existing) {
        await supabase.from('financial_entries').update({
          total_amount: orderAmount,
          due_date: dueDate
        }).eq('id', existing.id);
      } else {
        await supabase.from('financial_entries').insert({
          company_id: companyId,
          type: 'payable',
          origin_type: 'purchase_order',
          origin_id: order.id,
          total_amount: orderAmount,
          due_date: dueDate,
          status: 'open',
          paid_amount: 0,
          remaining_amount: orderAmount,
          created_date: new Date().toISOString().split('T')[0]
        });
      }
    }
  } catch (err) {
  }
};
