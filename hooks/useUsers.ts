/**
 * useUsers.ts
 *
 * Hook de dados para usuários do sistema.
 *
 * • staleTime de 1 min: usuários mudam pouco mas são mais dinâmicos que classificações.
 * • Realtime invalida o cache quando qualquer admin alterar a tabela app_users.
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { userService } from '../services/userService';
import type { UserData } from '../services/userService';
import { QUERY_KEYS } from './queryKeys';

export type { UserData };

const STALE_1_MIN = 60 * 1000;

export function useUsers() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = userService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USERS });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey:        QUERY_KEYS.USERS,
    queryFn:         () => userService.getAll(),
    staleTime:       STALE_1_MIN,
    placeholderData: keepPreviousData,
  });
}

// ─── Mutations ────────────────────────────────────────────────

export function useAddUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { user: UserData; generatePassword?: boolean }) =>
      userService.add(params.user, params.generatePassword),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.USERS }); },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (user: UserData) => userService.update(user),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.USERS }); },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.delete(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.USERS }); },
  });
}

export function useInactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => userService.inactivate(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.USERS }); },
  });
}

export function useGenerateRecoveryToken() {
  return useMutation({
    mutationFn: (userId: string) => userService.generateRecoveryToken(userId),
  });
}
