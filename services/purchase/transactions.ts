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
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(txId);

    // 1. ESTORNO ATÔMICO VIA RPC (Cascata completa: saldo banco + entry + pedido)
    if (isUUID) {
      // txId já é UUID real da financial_transactions → RPC direto
      const { data: result, error: rpcError } = await supabase.rpc('rpc_ops_financial_void_transaction', {
        p_transaction_id: txId
      });
      if (rpcError) {
        console.error('[PO-DELETE] RPC error:', rpcError);
        throw new Error(rpcError.message);
      }
      if (result && !result.success) {
        throw new Error(result.error || 'Erro no estorno atômico');
      }
    } else {
      // txId é ID de metadata (não-UUID) → buscar a transação real pelo financial_links
      const { data: links } = await supabase
        .from('financial_links')
        .select('transaction_id')
        .eq('purchase_order_id', orderId)
        .not('transaction_id', 'is', null);

      if (links && links.length > 0) {
        // Estornar TODAS as transações vinculadas ao pedido (ordem inversa para segurança)
        for (const link of links) {
          const { data: result, error: rpcError } = await supabase.rpc('rpc_ops_financial_void_transaction', {
            p_transaction_id: link.transaction_id
          });
          if (rpcError) {
            console.error('[PO-DELETE] RPC error for tx:', link.transaction_id, rpcError);
          }
        }
      }

      // Fallback: Limpeza por tag na descrição (para transações legadas sem links)
      await financialTransactionService.deleteByRef(txId);
      await financialTransactionService.deleteByOrigin(txId);
    }

    // 2. Limpeza na Tabela de Despesas SQL (Sincronização redundante para relatórios)
    if (isUUID) {
      await supabase
        .from('ops_purchase_order_expenses')
        .delete()
        .eq('id', txId);
    }

    // 3. Atualização de Memória Direta (fallback até o cache syncar)
    const order = db.getById(orderId);
    if (order) {
      const updatedTxs = (order.transactions || []).filter(t => t.id !== txId);
      db.update({ ...order, transactions: updatedTxs });
    }

    // 🔥 Invalidação Imediata (TanStack)
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TRANSACTIONS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS });
    queryClient.invalidateQueries({ queryKey: ['totals'] });
    queryClient.invalidateQueries({ queryKey: ['purchase_order_transactions', orderId] });

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao deletar transação:', error);
    return { success: false, error: error.message || 'Erro inesperado' };
  }
};
