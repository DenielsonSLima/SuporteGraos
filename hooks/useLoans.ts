// hooks/useLoans.ts
// ============================================================================
// Hooks TanStack Query para Empréstimos e Parcelas
// ============================================================================
// REFATORADO: Usa financialRealtimeHub (canal único) em vez de canais individuais.
// ============================================================================

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { loansService, Loan } from '../services/loansService';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { useFinancialRealtime } from './useFinancialRealtime';

export function useLoans() {
  // Canal único financeiro — invalida todos os caches quando qualquer tabela muda
  useFinancialRealtime();

  return useQuery({
    queryKey: QUERY_KEYS.LOANS,
    queryFn: () => loansService.getAll(),
    staleTime: STALE_TIMES.MODERATE,
    placeholderData: keepPreviousData,
  });
}

export function useCreateLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      lenderId?: string;
      principalAmount: number;
      interestRate?: number;
      startDate?: string;
      endDate?: string;
      numInstallments?: number;
      description?: string;
      accountId?: string;
      accountName?: string;
      type?: 'taken' | 'granted';
    }) => loansService.create(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOANS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_ENTRIES });
    },
  });
}

export function useUpdateLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<Loan, 'id' | 'company_id' | 'created_at' | 'updated_at'>> }) =>
      loansService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOANS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOAN_INSTALLMENTS });
    },
  });
}

export function useDeleteLoan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (loanId: string) => loansService.delete(loanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOANS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOAN_INSTALLMENTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_ENTRIES });
    },
  });
}

export function useLoanInstallments(loanId: string | null) {
  // Canal único financeiro
  useFinancialRealtime();

  return useQuery({
    queryKey: [...QUERY_KEYS.LOAN_INSTALLMENTS, loanId],
    queryFn: () => {
      if (!loanId) return [];
      return loansService.getInstallments(loanId);
    },
    enabled: !!loanId,
    staleTime: STALE_TIMES.MODERATE,
    placeholderData: keepPreviousData,
  });
}

// Hook: Totais de empréstimos ativos via RPC — Zero cálculo no frontend
export function useLoansActiveTotals() {
  // Canal único financeiro
  useFinancialRealtime();

  return useQuery({
    queryKey: ['loans_active_totals'],
    queryFn: () => loansService.getActiveTotals(),
    staleTime: STALE_TIMES.MODERATE,
    placeholderData: keepPreviousData,
  });
}
