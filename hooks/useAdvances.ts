// hooks/useAdvances.ts
// ============================================================================
// Hooks TanStack Query para Adiantamentos
// ============================================================================

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { advancesService } from '../services/advancesService';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';

export function useAdvances() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = advancesService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADVANCES });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey: QUERY_KEYS.ADVANCES,
    queryFn: () => advancesService.getAll(),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

export function useAdvancesByType(type: 'supplier' | 'client' | 'shareholder' | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ADVANCES, 'type', type],
    queryFn: () => {
      if (!type) return [];
      return advancesService.getByRecipientType(type);
    },
    enabled: !!type,
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

export function useOpenAdvances() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = advancesService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.ADVANCES, 'open'] });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey: [...QUERY_KEYS.ADVANCES, 'open'],
    queryFn: () => advancesService.getOpen(),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}
