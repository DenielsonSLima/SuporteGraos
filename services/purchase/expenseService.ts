import { supabase } from '../supabase';
import { PurchaseOrder, OrderTransaction } from '../../modules/PurchaseOrder/types';
import { financialTransactionService } from '../financial/financialTransactionService';
import { financialActionService } from '../financialActionService';
import { authService } from '../authService';
import { getTodayBR } from '../../utils/dateUtils';
import { update as updateOrder } from './actions';
import { queryClient } from '../../lib/queryClient';
import { QUERY_KEYS } from '../../hooks/queryKeys';

export const expenseService = {
  /**
   * Adiciona uma nova despesa ao pedido
   */
  async addExpense(order: PurchaseOrder, tx: Omit<OrderTransaction, 'id'>) {
    const user = authService.getCurrentUser();
    const companyId = user?.companyId;
    const expenseId = crypto.randomUUID();
    
    const newTx: OrderTransaction = {
      ...tx,
      id: expenseId,
      type: 'expense',
      status: 'active'
    };

    // 1. Atualizar o objeto local do pedido (metadata)
    const updatedOrder = {
      ...order,
      transactions: [...(order.transactions || []), newTx]
    };

    // 2. Persistir na tabela de despesas de operação (para relatórios)
    const { error: expError } = await supabase.from('ops_purchase_order_expenses').insert({
      id: expenseId,
      purchase_order_id: order.id,
      expense_category_id: tx.accountId !== 'none' ? tx.accountId : '00000000-0000-0000-0000-000000000000',
      description: tx.notes || 'Despesa extra',
      value: tx.value,
      expense_date: tx.date || getTodayBR(),
      paid: tx.accountId !== 'none',
      notes: tx.notes || null,
      company_id: companyId,
      deduct_from_partner: tx.deductFromPartner ?? true
    });

    if (expError) throw expError;

    // 3. Processar baixa financeira via Orquestrador (Garante Logs e Vínculos)
    if (tx.accountId && tx.accountId !== 'none') {
      await financialActionService.processRecord(
        expenseId, 
        {
          amount: tx.value,
          discount: 0,
          date: tx.date || getTodayBR(),
          accountId: tx.accountId,
          accountName: tx.accountName,
          notes: `${tx.notes || 'Despesa extra'} [Pedido: ${order.number}] [REF:${expenseId}]`,
          entityName: order.partnerName,
          partnerId: order.partnerId,
          isExtraExpense: true,
          deductFromPartner: tx.deductFromPartner,
          purchaseOrderId: order.id
        },
        'purchase_order_extra'
      );
    }

    // 4. Salvar o pedido (atualiza a metadata JSONB)
    await updateOrder(updatedOrder);

    // 🔥 Invalidação Imediata
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TRANSACTIONS });
    queryClient.invalidateQueries({ queryKey: ['totals'] });
    
    return updatedOrder;
  },

  /**
   * Remove uma despesa e suas vinculações financeiras
   */
  async deleteExpense(order: PurchaseOrder, expenseId: string) {
    // 1. Remover do objeto local (metadata)
    const updatedTransactions = (order.transactions || []).filter(t => t.id !== expenseId);
    const updatedOrder = {
      ...order,
      transactions: updatedTransactions
    };

    // 2. Remover da tabela de despesas (operacional)
    const { error: dbError } = await supabase.from('ops_purchase_order_expenses').delete().eq('id', expenseId);
    if (dbError) console.warn('Aviso: Falha ao remover da tabela operacional de despesas', dbError);

    // 3. Remover a transação financeira vinculada (Busca por REF e ORIGIN)
    try {
      await financialTransactionService.deleteByRef(expenseId);
      await financialTransactionService.deleteByOrigin(expenseId);
    } catch (err) {
      console.error('Erro ao remover vínculos financeiros:', err);
    }

    // 4. Atualizar o pedido principal (metadata)
    await updateOrder(updatedOrder);

    // 🔥 Invalidação Imediata
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TRANSACTIONS });
    queryClient.invalidateQueries({ queryKey: ['totals'] });

    return updatedOrder;
  }
};
