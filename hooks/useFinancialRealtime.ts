/**
 * useFinancialRealtime.ts
 *
 * Hook TanStack Query que conecta o financialRealtimeHub ao QueryClient.
 *
 * Quando qualquer tabela financeira muda (transfers, accounts, financial_transactions,
 * financial_entries, advances, loans, shareholders), este hook invalida TODOS os
 * caches financeiros relevantes de uma vez.
 *
 * CONSUMO:
 *   Basta chamar `useFinancialRealtime()` dentro de qualquer hook financeiro.
 *   Ele é idempotente — múltiplas chamadas compartilham o mesmo canal WebSocket.
 *
 * BENEFÍCIO:
 *   - Multi-usuário: quando o Usuário A exclui uma transferência, o Usuário B
 *     vê a atualização automaticamente sem F5.
 *   - Cross-module: uma mudança em `financial_transactions` invalida não só o
 *     extrato, mas também contas, caixa, adiantamentos, etc.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { financialRealtimeHub } from '../services/financialRealtimeHub';
import { QUERY_KEYS } from './queryKeys';

// Todas as query keys financeiras que devem ser invalidadas quando qualquer tabela muda
const FINANCIAL_QUERY_KEYS = [
  QUERY_KEYS.TRANSFERS,
  QUERY_KEYS.TRANSFERS_MONTH_TOTAL,
  QUERY_KEYS.ACCOUNTS,
  QUERY_KEYS.TOTAL_BALANCE,
  QUERY_KEYS.FINANCIAL_TRANSACTIONS,
  QUERY_KEYS.FINANCIAL_ENTRIES,
  QUERY_KEYS.FINANCIAL_PAYABLES,
  QUERY_KEYS.FINANCIAL_RECEIVABLES,
  QUERY_KEYS.FINANCIAL_SUMMARY,
  QUERY_KEYS.CASHIER_CURRENT,
  QUERY_KEYS.CASHIER_HISTORY,
  QUERY_KEYS.DASHBOARD,
  QUERY_KEYS.ADVANCES,
  QUERY_KEYS.LOANS,
  QUERY_KEYS.LOAN_INSTALLMENTS,
  QUERY_KEYS.SHAREHOLDERS,
  QUERY_KEYS.CREDITS,
  QUERY_KEYS.ADMIN_EXPENSES,
  QUERY_KEYS.STANDALONE_RECORDS,
] as const;

export function useFinancialRealtime(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = financialRealtimeHub.subscribe(() => {
      for (const key of FINANCIAL_QUERY_KEYS) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    });
    return unsub;
  }, [queryClient]);
}
