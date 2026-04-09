// hooks/useDashboard.ts
// ============================================================================
// Hook TanStack Query para o Dashboard
// ============================================================================
// Cache + Realtime multi-table + keepPreviousData (sem piscar)
// ============================================================================

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { dashboardService } from '../modules/Dashboard/services/dashboardService';
import { supabase } from '../services/supabase';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';

export function useDashboard() {
  const queryClient = useQueryClient();
  // Realtime: consome o canal singleton do serviço
  useEffect(() => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
    };

    const unsub = dashboardService.subscribeRealtime(invalidate);

    // Ouvir evento de init completo para primeira carga (resiliência)
    const handleInitComplete = () => invalidate();
    window.addEventListener('supabase:init:complete', handleInitComplete);

    return () => {
      unsub();
      window.removeEventListener('supabase:init:complete', handleInitComplete);
    };
  }, [queryClient]);

  // Query: carrega dados com cache
  return useQuery({
    queryKey: QUERY_KEYS.DASHBOARD,
    queryFn: () => dashboardService.getDashboardData(),
    staleTime: STALE_TIMES.VOLATILE,
    placeholderData: keepPreviousData,
  });
}
