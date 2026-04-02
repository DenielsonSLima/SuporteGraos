/**
 * useSalesTransactionActions.ts
 *
 * Hook co-localizado que encapsula operações de CRUD sobre transações
 * (recebimentos) de um pedido de venda.
 *
 * SKILL: TSX não importa services diretamente. Toda lógica de dados
 *        reside em hooks ou services.
 */

import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../hooks/queryKeys';
import { salesService } from '../../../services/salesService';
import { financialActionService } from '../../../services/financialActionService';
import { SalesTransaction } from '../types';

export function useSalesTransactionActions(orderId: string) {
  const queryClient = useQueryClient();

  const refreshAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SALES_ORDERS }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOADINGS }),
      queryClient.invalidateQueries({ queryKey: ['sales_order_transactions', orderId] })
    ]);
  };

  /** Atualiza uma transação existente e refresca o cache */
  const updateTransaction = async (updated: SalesTransaction) => {
    await salesService.updateTransaction(orderId, updated);
    await refreshAll();
  };

  /** Exclui uma transação e seu registro financeiro correspondente */
  const deleteTransaction = async (txId: string) => {
    await salesService.deleteTransaction(orderId, txId);
    await refreshAll();
  };

  return { updateTransaction, deleteTransaction };
}
