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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Realtime: um único canal ouvindo 6 tabelas
  useEffect(() => {
    const invalidate = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      }, 500);
    };

    const realtimeChannel = supabase
      .channel('realtime:dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_entries' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_transactions' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_loadings' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_purchase_orders' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_sales_orders' }, invalidate)
      .subscribe();

    // Ouvir evento de init completo para primeira carga
    const handleInitComplete = () => invalidate();
    window.addEventListener('supabase:init:complete', handleInitComplete);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(realtimeChannel);
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
