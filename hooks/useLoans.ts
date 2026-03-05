// hooks/useLoans.ts
// ============================================================================
// Hooks TanStack Query para Empréstimos e Parcelas
// ============================================================================

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { loansService, Loan } from '../services/loansService';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';

export function useLoans() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = loansService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOANS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOAN_INSTALLMENTS });
    });
    return unsub;
  }, [queryClient]);

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
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!loanId) return;
    const unsub = loansService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.LOAN_INSTALLMENTS, loanId] });
    });
    return unsub;
  }, [queryClient, loanId]);

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
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = loansService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: ['loans_active_totals'] });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey: ['loans_active_totals'],
    queryFn: () => loansService.getActiveTotals(),
    staleTime: STALE_TIMES.MODERATE,
    placeholderData: keepPreviousData,
  });
}
