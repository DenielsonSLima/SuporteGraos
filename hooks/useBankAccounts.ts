/**
 * useBankAccounts.ts
 *
 * Hook de dados para contas bancárias.
 *
 * • staleTime 2 min: contas mudam pouco mas são usadas em vários módulos financeiros.
 * • Realtime invalida o cache quando qualquer sessão alterar bank_accounts.
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { bankAccountService } from '../services/bankAccountService';
import type { BankAccount } from '../modules/Financial/types';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';

export function useBankAccounts() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = bankAccountService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BANK_ACCOUNTS });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey:        QUERY_KEYS.BANK_ACCOUNTS,
    queryFn:         () => bankAccountService.getAll(),
    staleTime:       STALE_TIMES.MODERATE,
    placeholderData: keepPreviousData,
  });
}

// ─── Mutations ────────────────────────────────────────────────

export function useAddBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (account: BankAccount) => bankAccountService.add(account),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.BANK_ACCOUNTS }); },
  });
}

export function useUpdateBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (account: BankAccount) => bankAccountService.update(account),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.BANK_ACCOUNTS }); },
  });
}

export function useRemoveBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bankAccountService.delete(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.BANK_ACCOUNTS }); },
  });
}
