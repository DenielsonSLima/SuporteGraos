/**
 * useProfile.ts
 *
 * Hook TanStack Query para o perfil do usuário autenticado.
 * ✅ Busca dados reais de app_users (sem mock)
 * ✅ Mutation via Edge Function manage-users (igual a UsersSettings)
 * ✅ Realtime: invalida quando app_users muda
 * ✅ Frontend só exibe — zero dados hardcoded
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { userService, UserData } from '../services/userService';
import { authService } from '../services/authService';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';

// ─── Busca o perfil do usuário autenticado ────────────────────────────────────

async function fetchMyProfile(): Promise<UserData | null> {
  const currentUser = authService.getCurrentUser();
  if (!currentUser?.id) return null;

  const { data, error } = await supabase
    .from('app_users')
    .select(
      'auth_user_id, first_name, last_name, cpf, email, phone, role, active, permissions, allow_recovery',
    )
    .eq('auth_user_id', currentUser.id)
    .single();

  if (error || !data) return null;

  return {
    id:            data.auth_user_id,
    firstName:     data.first_name  ?? '',
    lastName:      data.last_name   ?? '',
    cpf:           data.cpf         ?? '',
    email:         data.email       ?? '',
    phone:         data.phone       ?? '',
    role:          data.role        ?? 'user',
    active:        data.active      !== false,
    permissions:   Array.isArray(data.permissions) ? data.permissions : [],
    allowRecovery: data.allow_recovery !== false,
  };
}

// ─── Hook de leitura ──────────────────────────────────────────────────────────

export function useProfile() {
  const queryClient = useQueryClient();

  // Realtime: invalida cache quando o próprio registro muda
  useEffect(() => {
    const unsub = userService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE });
    });
    return unsub;
  }, [queryClient]);

  return useQuery<UserData | null>({
    queryKey: QUERY_KEYS.PROFILE,
    queryFn: fetchMyProfile,
    staleTime: STALE_TIMES.MODERATE,
    placeholderData: (prev) => prev ?? null,
  });
}

// ─── Mutation: atualizar dados do perfil ──────────────────────────────────────

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profile: UserData) => userService.update(profile),
    onSuccess: () => {
      // Invalida tanto o perfil quanto a lista de usuários
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USERS });
    },
  });
}
