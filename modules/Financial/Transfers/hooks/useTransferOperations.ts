/**
 * useTransferOperations.ts
 *
 * Hook co-localizado para TransfersTab.
 * Encapsula invalidações e eventos de atualização financeira.
 *
 * SKIL: TSX não importa services diretamente.
 */

import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../../../../hooks/queryKeys';

export function useTransferOperations() {
  const queryClient = useQueryClient();

  /**
   * Invalida todos os caches financeiros relevantes após transferência.
   */
  const refreshFinancialViews = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSFERS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TRANSACTIONS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_SUMMARY });   // ADICIONADO
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CASHIER_CURRENT });     // ADICIONADO
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });           // ADICIONADO
    // Removidos: window.dispatchEvent — sem listeners registrados no sistema
  };

  return {
    refreshFinancialViews,
  };
}
