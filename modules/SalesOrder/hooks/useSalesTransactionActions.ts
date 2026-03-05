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

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SALES_ORDERS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOADINGS });
  };

  /** Atualiza uma transação existente e refresca o cache */
  const updateTransaction = async (updated: SalesTransaction) => {
    await salesService.updateTransaction(orderId, updated);
    refreshAll();
  };

  /** Exclui uma transação e seu registro financeiro correspondente */
  const deleteTransaction = async (txId: string) => {
    await salesService.deleteTransaction(orderId, txId);
    try {
      await financialActionService.deleteStandaloneRecord('hist-' + txId);
    } catch (err) {
      console.error('[useSalesTransactionActions] Falha ao excluir registro financeiro:', err);
    }
    refreshAll();
  };

  return { updateTransaction, deleteTransaction };
}
