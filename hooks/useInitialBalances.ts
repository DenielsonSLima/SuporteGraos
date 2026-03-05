/**
 * useInitialBalances.ts
 *
 * Hook de dados para saldos iniciais de abertura.
 *
 * • staleTime 5 min: saldos iniciais são configurados uma vez e raramente mudam.
 * • Realtime invalida o cache quando qualquer sessão alterar initial_balances.
 */

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { initialBalanceService } from '../services/initialBalanceService';
import { QUERY_KEYS } from './queryKeys';

const STALE_5_MIN = 5 * 60 * 1000;

export function useInitialBalances() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = initialBalanceService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INITIAL_BALANCES });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey:        QUERY_KEYS.INITIAL_BALANCES,
    queryFn:         () => initialBalanceService.getAll(),
    staleTime:       STALE_5_MIN,
    placeholderData: keepPreviousData,
  });
}

interface InitialBalanceInput {
  id: string;
  accountId: string;
  accountName: string;
  date: string;
  value: number;
}

export function useAddInitialBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: InitialBalanceInput) => initialBalanceService.add(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INITIAL_BALANCES });
    },
  });
}

export function useDeleteInitialBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => initialBalanceService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INITIAL_BALANCES });
    },
  });
}
