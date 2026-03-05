// hooks/useAccounts.ts
// ============================================================================
// Hook TanStack Query para gerenciar contas (accounts)
// ============================================================================
// Cache + Realtime + keepPreviousData (sem piscar)
// ============================================================================

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { accountsService, Account } from '../services/accountsService';
import { setAccountsCache } from '../services/financial/handlers/orchestratorHelpers';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';

export type { Account };

interface AccountCreateInput {
  account_type: 'bank' | 'cash' | 'credit_card' | 'investment';
  account_name: string;
  owner?: string;
  agency?: string;
  account_number?: string;
  is_active: boolean;
  allows_negative: boolean;
}

interface AccountUpdateInput {
  id: string;
  data: Partial<Account>;
}

export function useAccounts() {
  const queryClient = useQueryClient();

  // Realtime: invalida cache quando há mudanças
  useEffect(() => {
    const unsub = accountsService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TOTAL_BALANCE });
    });
    return unsub;
  }, [queryClient]);

  // Query: carrega dados com cache
  const query = useQuery({
    queryKey: QUERY_KEYS.ACCOUNTS,
    queryFn: () => accountsService.getAll(),
    staleTime: STALE_TIMES.REFERENCE,
    placeholderData: keepPreviousData,
  });

  // Sincroniza cache do orquestrador de pagamentos sempre que contas mudam
  useEffect(() => {
    if (query.data) {
      setAccountsCache(query.data.map(a => ({ id: a.id, bankName: a.account_name, owner: a.owner })));
    }
  }, [query.data]);

  return query;
}

// Hook auxiliar: busca uma conta específica por ID (SEM subscription própria)
export function useAccountById(id: string | null) {
  return useQuery({
    queryKey: id ? QUERY_KEYS.ACCOUNT_BY_ID(id) : ['account'],
    queryFn: () => {
      if (!id) return null;
      return accountsService.getById(id);
    },
    staleTime: STALE_TIMES.REFERENCE,
    enabled: !!id,
  });
}

// Hook auxiliar: busca TODAS as contas (incluindo inativas) para Settings
export function useAccountsForSettings() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = accountsService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.BANK_ACCOUNTS, 'settings-all'] });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey: [...QUERY_KEYS.BANK_ACCOUNTS, 'settings-all'],
    queryFn: () => accountsService.getAllForSettings(),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

// Hook auxiliar: busca saldo total (SEM subscription própria — já invalidado pelo useAccounts)
export function useTotalBalance() {
  return useQuery({
    queryKey: QUERY_KEYS.TOTAL_BALANCE,
    queryFn: () => accountsService.getTotalBalance(),
    staleTime: STALE_TIMES.REFERENCE,
    placeholderData: keepPreviousData,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (account: AccountCreateInput) => accountsService.add(account),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BANK_ACCOUNTS });
      void queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.BANK_ACCOUNTS, 'settings-all'] });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TOTAL_BALANCE });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: AccountUpdateInput) => accountsService.update(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BANK_ACCOUNTS });
      void queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.BANK_ACCOUNTS, 'settings-all'] });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TOTAL_BALANCE });
    },
  });
}

export function useSoftDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => accountsService.softDelete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BANK_ACCOUNTS });
      void queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.BANK_ACCOUNTS, 'settings-all'] });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TOTAL_BALANCE });
    },
  });
}
