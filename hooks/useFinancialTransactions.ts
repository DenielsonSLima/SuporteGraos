// hooks/useFinancialTransactions.ts
// ============================================================================
// Hooks TanStack Query para o Livro-Razão (Financial Transactions)
// ============================================================================
// REFATORADO:
// ✅ Usa financialRealtimeHub (canal único) em vez de canal individual
// ✅ staleTime padronizado via STALE_TIMES.DYNAMIC
// ✅ Cross-module: mudanças em transfers, accounts, entries propagam automaticamente
// ============================================================================

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { financialTransactionsService } from '../services/financialTransactionsService';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { useFinancialRealtime } from './useFinancialRealtime';


// Hook: Transações de uma conta
export function useAccountTransactions(accountId: string | null) {
  const key = accountId ? QUERY_KEYS.ACCOUNT_TRANSACTIONS(accountId) : ['account_transactions', null] as const;
  useFinancialRealtime();

  return useQuery({
    queryKey: key,
    queryFn: () => {
      if (!accountId) return [];
      return financialTransactionsService.getByAccount(accountId);
    },
    enabled: !!accountId,
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

// Hook: Transações de uma obrigação (entry)
export function useEntryTransactions(entryId: string | null) {
  const key = entryId ? QUERY_KEYS.ENTRY_TRANSACTIONS(entryId) : ['entry_transactions', null] as const;
  useFinancialRealtime();

  return useQuery({
    queryKey: key,
    queryFn: () => {
      if (!entryId) return [];
      return financialTransactionsService.getByEntry(entryId);
    },
    enabled: !!entryId,
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

// Hook: Transações de um período
export function useTransactionsByDateRange(startDate: string, endDate: string) {
  const key = QUERY_KEYS.TRANSACTIONS_DATE_RANGE('all', startDate, endDate);
  useFinancialRealtime();

  return useQuery({
    queryKey: key,
    queryFn: () =>
      financialTransactionsService.getByDateRange(startDate, endDate),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

// Hook: Totais (inflow/outflow/net) de um período — RPC server-side, zero cálculo frontend
export function useTransactionTotals(startDate: string, endDate: string) {
  const key = QUERY_KEYS.TRANSACTION_TOTALS(startDate, endDate);
  useFinancialRealtime();

  return useQuery({
    queryKey: key,
    queryFn: () =>
      financialTransactionsService.getTotalsByDateRange(startDate, endDate),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

// Hook: Resumo de uma conta (créditos vs débitos)
export function useAccountSummary(accountId: string | null) {
  const key = accountId ? QUERY_KEYS.ACCOUNT_SUMMARY(accountId) : ['account_summary', null] as const;
  useFinancialRealtime();

  return useQuery({
    queryKey: key,
    queryFn: () => {
      if (!accountId) return { credits: 0, debits: 0 };
      return financialTransactionsService.getSummaryByAccount(accountId);
    },
    enabled: !!accountId,
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}
