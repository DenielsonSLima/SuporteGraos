/**
 * useShareholders.ts
 *
 * Hook de dados para sócios.
 *
 * • staleTime de 1 min.
 * • Realtime invalida o cache quando qualquer sessão alterar
 *   shareholders ou shareholder_transactions.
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { shareholderService } from '../services/shareholderService';
import type { Shareholder } from '../services/shareholderService';
import { QUERY_KEYS } from './queryKeys';

const STALE_1_MIN = 60 * 1000;

export function useShareholders() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = shareholderService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SHAREHOLDERS });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey:        QUERY_KEYS.SHAREHOLDERS,
    queryFn:         async () => {
      await shareholderService.loadFromSupabase();
      return shareholderService.getAll();
    },
    staleTime:       STALE_1_MIN,
    placeholderData: keepPreviousData,
  });
}

// ─── Mutations ────────────────────────────────────────────────

export function useAddShareholder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Shareholder, 'id'>) => shareholderService.add(data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.SHAREHOLDERS }); },
  });
}

export function useUpdateShareholder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Shareholder) => shareholderService.update(data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.SHAREHOLDERS }); },
  });
}

export function useDeleteShareholder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => shareholderService.delete(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.SHAREHOLDERS }); },
  });
}

export function useShareholderTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { shareholderId: string; transaction: any }) =>
      shareholderService.addTransaction(params.shareholderId, params.transaction),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.SHAREHOLDERS }); },
  });
}

export function useUpdateShareholderTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { shareholderId: string; transaction: any }) =>
      shareholderService.updateTransaction(params.shareholderId, params.transaction),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.SHAREHOLDERS }); },
  });
}

export function useDeleteShareholderTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { shareholderId: string; transactionId: string }) =>
      shareholderService.deleteTransaction(params.shareholderId, params.transactionId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.SHAREHOLDERS }); },
  });
}

// Hook: Totais de créditos/débitos de um sócio via RPC — Zero cálculo no frontend
export function useShareholderTotals(shareholderId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!shareholderId) return;
    const unsub = shareholderService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: ['shareholder_totals', shareholderId] });
    });
    return unsub;
  }, [queryClient, shareholderId]);

  return useQuery({
    queryKey: ['shareholder_totals', shareholderId],
    queryFn: () => {
      if (!shareholderId) return { totalCredits: 0, totalDebits: 0, balance: 0 };
      return shareholderService.getShareholderTotals(shareholderId);
    },
    enabled: !!shareholderId,
    staleTime: STALE_1_MIN,
    placeholderData: keepPreviousData,
  });
}
