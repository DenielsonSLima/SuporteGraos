// hooks/useFinancialTransactions.ts
// ============================================================================
// Hooks TanStack Query para o Livro-Razão (Financial Transactions)
// ============================================================================
// OTIMIZADO:
// ✅ staleTime padronizado via STALE_TIMES.DYNAMIC (era hardcoded 30s)
// ✅ 1 subscription compartilhada para todos os hooks de transações
// ✅ Hooks com accountId/entryId são invalidados pela key hierárquica
// ============================================================================

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { financialTransactionsService } from '../services/financialTransactionsService';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';

/**
 * Hook interno: registra UMA subscription no financialTransactionsService
 * e invalida toda a família de queries de transações.
 */
function useTransactionsRealtimeInvalidation(invalidateKey?: readonly unknown[]) {
  const queryClient = useQueryClient();
  const keyRef = useRef(invalidateKey);
  keyRef.current = invalidateKey;

  useEffect(() => {
    const unsub = financialTransactionsService.subscribeRealtime(() => {
      if (keyRef.current) {
        queryClient.invalidateQueries({ queryKey: keyRef.current });
      } else {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TRANSACTIONS });
      }
    });
    return unsub;
  }, [queryClient]);
}

// Hook: Transações de uma conta
export function useAccountTransactions(accountId: string | null) {
  const key = accountId ? QUERY_KEYS.ACCOUNT_TRANSACTIONS(accountId) : ['account_transactions', null] as const;
  useTransactionsRealtimeInvalidation(accountId ? key : undefined);

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
  useTransactionsRealtimeInvalidation(entryId ? key : undefined);

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
  useTransactionsRealtimeInvalidation(key);

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
  const key = ['transaction_totals', startDate, endDate] as const;
  useTransactionsRealtimeInvalidation(key);

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
  useTransactionsRealtimeInvalidation(accountId ? key : undefined);

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
