import { PurchaseOrder, OrderTransaction } from '../../modules/PurchaseOrder/types';
import { db } from './store';
import { supabase } from '../supabase';
import { financialTransactionService } from '../financial/financialTransactionService';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../sqlCanonicalOps';

import { queryClient } from '../../lib/queryClient';
import { QUERY_KEYS } from '../../hooks/queryKeys';

export const updateTransaction = async (orderId: string, transaction: OrderTransaction) => {
  const order = db.getById(orderId);
  if (!order) return;

  const transactions = (order.transactions || []).map(tx =>
    tx.id === transaction.id ? { ...tx, ...transaction } : tx
  );

  const updatedOrder = { ...order, transactions };
  db.update(updatedOrder);

  // Persistence logic handled by syncExpenses in actions.ts if it's an expense
  return true;
};

export const deleteTransaction = async (orderId: string, txId: string) => {
  try {
    // 1. Limpeza no Banco Financeiro (Transações e Links)
    // Deletamos pela REF direta (txId), ORIGIN ou UUID via serviço centralizado
    await financialTransactionService.delete(txId);

    // 2. Limpeza na Tabela de Despesas SQL (Sincronização redundante para relatórios)
    await supabase
      .from('ops_purchase_order_expenses')
      .delete()
      .eq('id', txId);

    // 3. Atualização de Memória Direta (fallback até o cache syncar)
    const order = db.getById(orderId);
    if (order) {
      const updatedTxs = (order.transactions || []).filter(t => t.id !== txId);
      db.update({ ...order, transactions: updatedTxs });
    }

    // 🔥 Invalidação Imediata (TanStack)
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TRANSACTIONS });
    queryClient.invalidateQueries({ queryKey: ['totals'] });

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao deletar transação:', error);
    return { success: false, error: error.message || 'Erro inesperado' };
  }
};
