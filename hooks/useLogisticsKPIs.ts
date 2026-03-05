/**
 * useLogisticsKPIs.ts
 *
 * Hook TanStack Query para KPIs de Logística.
 * SKIL §5.4: SUM/COUNT executados no banco via RPC — zero .reduce() no frontend.
 *
 * ✅ Cache DYNAMIC (1min) com invalidação via loadings realtime
 * ✅ Aceita filtros (transportadora, período, busca textual)
 * ✅ Substitui os .reduce() de LogisticsKPIs, OpenFreights, AllFreights
 */

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { fetchLogisticsKPIs, LogisticsKPIFilters } from '../services/logisticsKpiService';
import { loadingService } from '../services/loadingService';

/**
 * Retorna KPIs agregados de logística com cálculos no banco.
 * Invalida quando loadings mudam (realtime).
 */
export function useLogisticsKPIs(filters: LogisticsKPIFilters = {}) {
  const queryClient = useQueryClient();

  // Memoiza filtros para estabilidade da queryKey
  const stableFilters = useMemo(() => ({
    carrierName: filters.carrierName || '',
    startDate: filters.startDate || '',
    endDate: filters.endDate || '',
    searchTerm: filters.searchTerm || '',
  }), [filters.carrierName, filters.startDate, filters.endDate, filters.searchTerm]);

  // Invalida quando loadings mudam (realtime)
  useEffect(() => {
    const unsub = loadingService.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.FREIGHTS, 'kpis'] });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey: [...QUERY_KEYS.FREIGHTS, 'kpis', stableFilters],
    queryFn: () => fetchLogisticsKPIs(stableFilters),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}
