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

import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { fetchLogisticsKPIs, LogisticsKPIFilters } from '../services/logisticsKpiService';
import { useCurrentUser } from './useCurrentUser';

/**
 * Retorna KPIs agregados de logística com cálculos no banco.
 */
export function useLogisticsKPIs(filters: LogisticsKPIFilters = {}) {
  const currentUser = useCurrentUser();

  const stableFilters = useMemo(() => ({
    carrierName: filters.carrierName || '',
    startDate: filters.startDate || '',
    endDate: filters.endDate || '',
    searchTerm: filters.searchTerm || '',
  }), [filters.carrierName, filters.startDate, filters.endDate, filters.searchTerm]);

  return useQuery({
    queryKey: [...QUERY_KEYS.FREIGHTS, 'kpis', currentUser?.companyId, stableFilters],
    queryFn: () => fetchLogisticsKPIs(currentUser?.companyId!, stableFilters),
    enabled: !!currentUser?.companyId,
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}
