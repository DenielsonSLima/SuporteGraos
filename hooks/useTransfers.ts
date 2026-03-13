// hooks/useTransfers.ts
// ============================================================================
// Hook TanStack Query para Transferências entre Contas
// ============================================================================

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { transfersService } from '../services/transfersService';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';

export function useTransfers() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = transfersService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSFERS });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey: QUERY_KEYS.TRANSFERS,
    queryFn: () => transfersService.getAll(),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

// Hook: Totais do mês via RPC — Zero cálculo no frontend
export function useTransfersMonthTotal() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = transfersService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: ['transfers_month_total'] });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey: ['transfers_month_total'],
    queryFn: () => transfersService.getMonthTotal(),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

// ─── Mutations ────────────────────────────────────────────────

export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      accountFromId: string;
      accountToId: string;
      amount: number;
      description?: string;
      transferDate?: string;
    }) => transfersService.transfer(params),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.TRANSFERS });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TRANSACTIONS });
    },
  });
}

export function useUpdateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      id: string;
      accountFromId: string;
      accountToId: string;
      amount: number;
      description?: string;
      transferDate?: string;
    }) => transfersService.update(params.id, params),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.TRANSFERS });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TRANSACTIONS });
    },
  });
}

export function useDeleteTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transfersService.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.TRANSFERS });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TRANSACTIONS });
    },
  });
}
