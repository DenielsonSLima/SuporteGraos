/**
 * usePerformance.ts
 *
 * Hook TanStack Query para o módulo Performance.
 * Substitui useState + useEffect + window events.
 *
 * ✅ Cache por período (monthsBack) — trocar filtro usa cache
 * ✅ Realtime via invalidação do TanStack
 * ✅ keepPreviousData — mostra dados anteriores enquanto carrega
 * ✅ Deduplicação automática
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { performanceService } from '../modules/Performance/services/performanceService';
import { financialEntriesService } from '../services/financialEntriesService';

/**
 * Relatório de performance analítica — dados SQL via RPC.
 * Cache de 2 min por período; invalida com mudanças financeiras.
 */
export function usePerformanceReport(monthsBack: number | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const invalidate = () => {
      // Invalida TODOS os períodos de performance
      queryClient.invalidateQueries({ queryKey: ['performance'] });
    };

    const unsub = financialEntriesService.subscribeRealtime(invalidate);
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey: QUERY_KEYS.PERFORMANCE(monthsBack),
    queryFn: () => performanceService.getReport(monthsBack),
    staleTime: STALE_TIMES.MODERATE,
    placeholderData: keepPreviousData,
  });
}
