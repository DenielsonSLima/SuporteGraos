import { PurchaseOrder, OrderTransaction } from '../../modules/PurchaseOrder/types';
import { supabase } from '../supabase';
import { authService } from '../authService';
import { payablesService } from '../financial/payablesService';
import { financialTransactionService } from '../financial/financialTransactionService';
import { getLocalDateString, parseStringToLocalDate, getTodayBR } from '../../utils/dateUtils';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../sqlCanonicalOps';
import { upsertPurchaseOrderCanonical, deletePurchaseOrderCanonical } from './canonical';
import { mapOrderToDb } from './mappers';
import { loadFromSupabase } from './loader';
import { queryClient } from '../../lib/queryClient';
import { QUERY_KEYS } from '../../hooks/queryKeys';

export const syncExpenses = async (order: PurchaseOrder) => {
  try {
    const { data: existingExpenses } = await supabase
      .from('ops_purchase_order_expenses')
      .select('id')
      .eq('purchase_order_id', order.id);

    const existingIds = (existingExpenses || []).map(e => e.id);
    const expenseTransactions = (order.transactions || []).filter(t => t.type === 'expense');
    const metadataIds = expenseTransactions.map(t => t.id);

    // 1. Delete extra expenses that were removed
    const toDelete = existingIds.filter(id => !metadataIds.includes(id));
    if (toDelete.length > 0) {
      await supabase.from('ops_purchase_order_expenses').delete().in('id', toDelete);
      
      // Clean up associated financial transactions
      for (const id of toDelete) {
        await financialTransactionService.deleteByRef(id).catch(() => {});
      }
    }

    const companyId = authService.getCurrentUser()?.companyId || null;
    const expensesPayload = expenseTransactions.map(tx => ({
      id: tx.id,
      purchase_order_id: order.id,
      expense_category_id: tx.accountId && tx.accountId !== 'none' ? tx.accountId : '00000000-0000-0000-0000-000000000000',
      description: tx.notes || 'Despesa extra',
      value: tx.value,
      expense_date: tx.date || getTodayBR(),
      paid: !!tx.accountId && tx.accountId !== 'none',
      notes: tx.notes || null,
      company_id: companyId
    }));

    if (expensesPayload.length > 0) {
      await supabase.from('ops_purchase_order_expenses').upsert(expensesPayload);
      
      // 2. Handle Financial Transactions (Bank Account Debt)
      for (const tx of expenseTransactions) {
        if (tx.accountId && tx.accountId !== 'none') {
          // Check if already exists to avoid duplication
          // O orquestrador pode salvar no [REF:...] ou [ORIGIN:...] dependendo de como foi chamado
          const { data: existing } = await supabase
            .from('financial_transactions')
            .select('id')
            .or(`description.ilike.%[REF:${tx.id}]%,description.ilike.%[ORIGIN:${tx.id}]%`)
            .limit(1)
            .maybeSingle();

          if (!existing) {
            await financialTransactionService.add({
              description: `${tx.notes || 'Despesa extra'} [Pedido: ${order.number}] [REF:${tx.id}]`,
              amount: tx.value,
              type: 'payment',
              date: tx.date || getTodayBR(),
              bankAccountId: tx.accountId,
              companyId: companyId || undefined
            }, {
              purchaseOrderId: order.id,
              linkType: 'payment',
              metadata: { expenseId: tx.id }
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('[PURCHASE_SERVICE] Falha ao sincronizar despesas:', err);
  }
};

// persistUpsert handles legacy persistence when canonical is disabled
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
    const { error } = await supabase.from('ops_purchase_orders').upsert(payload);

    if (error) {
      return { success: false, error: error.message };
    }

    syncExpenses(order).catch(() => {});
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado' };
  }
};

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
  if (orderAmount <= 0) return;

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
    paidAmount: order.paidValue || 0,
    status: (order.paidValue || 0) >= orderAmount ? 'paid' : (order.paidValue || 0) > 0 ? 'partially_paid' : 'pending',
    subType: 'purchase_order',
    notes: `Fornecedor: ${order.partnerName}`
  });
};

export const add = async (order: PurchaseOrder) => {
  // 1. MODO CANÔNICO (SQL-First)
  if (isSqlCanonicalOpsEnabled()) {
    const result = await upsertPurchaseOrderCanonical(order);
    if (!result.success) return result;
    
    // ✅ ALWAYS keep legacy sync for UI/Report compatibility (pode ser async/void)
    syncExpenses(order).catch(() => {});
    createPayableForPurchaseOrder(order);
    return { success: true };
  }

  // 2. MODO LEGADO
  const result = await persistUpsert(order);
  if (!result.success) return result;

  createPayableForPurchaseOrder(order);
  return { success: true };
};

export const update = async (order: PurchaseOrder) => {
  // 1. MODO CANÔNICO (SQL-First)
  if (isSqlCanonicalOpsEnabled()) {
    const result = await upsertPurchaseOrderCanonical(order);
    if (!result.success) return result;

    syncExpenses(order).catch(() => {});
    return { success: true };
  }

  // 2. MODO LEGADO
  const result = await persistUpsert(order);
  if (!result.success) return result;

  syncExpenses(order).catch(() => {});
  return { success: true };
};

export const remove = async (id: string) => {
  // 1. MODO CANÔNICO (SQL-First)
  if (isSqlCanonicalOpsEnabled()) {
    const result = await deletePurchaseOrderCanonical(id);
    if (result.success) {
      // 🔥 Invalidação Imediata
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      return { success: true };
    }
    // Se falhar no canônico, retornamos o erro
    return result;
  }

  // 2. MODO LEGADO
  try {
    const { error } = await supabase.from('ops_purchase_orders').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    
    // 🔥 Invalidação Imediata
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado' };
  }
};

export const cancel = async (id: string, reason?: string) => {
  try {
    const { data: result, error } = await supabase.rpc('rpc_ops_order_cancel', {
      p_order_id: id,
      p_order_type: 'purchase',
      p_reason: reason || 'Cancelamento via painel'
    });

    if (error || (result && !result.success)) {
      return { success: false, error: error?.message || result?.error || 'Erro ao cancelar pedido' };
    }

    // Invalidação Imediata para refletir no frontend
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_ENTRIES });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS });
    
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado' };
  }
};

export const reload = async () => {
  const user = authService.getCurrentUser();
  return loadFromSupabase(user?.companyId);
};

export const importData = async (orders: PurchaseOrder[]) => {
  for (const order of orders) {
    await add(order);
  }
};
