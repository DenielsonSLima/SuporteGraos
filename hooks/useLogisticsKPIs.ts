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
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { fetchLogisticsKPIs, LogisticsKPIFilters } from '../services/logisticsKpiService';
import { useCurrentUser } from './useCurrentUser';
import { useEffect } from 'react';
import { loadingService } from '../services/loadingService';
import { advancesService } from '../services/advancesService';

/**
 * Retorna KPIs agregados de logística com cálculos no banco.
 */
export function useLogisticsKPIs(filters: LogisticsKPIFilters = {}) {
  const currentUser = useCurrentUser();
  const queryClient = useQueryClient();

  const stableFilters = useMemo(() => ({
    carrierName: filters.carrierName || '',
    startDate: filters.startDate || '',
    endDate: filters.endDate || '',
    searchTerm: filters.searchTerm || '',
  }), [filters.carrierName, filters.startDate, filters.endDate, filters.searchTerm]);

  useEffect(() => {
    // Invalida KPIs quando houver mudança em romaneios (loadings)
    const unsubLoadings = loadingService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.FREIGHTS, 'kpis'] });
    });

    // Invalida KPIs quando houver mudança em adiantamentos (pois afetam o Total Pago)
    const unsubAdvances = advancesService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.FREIGHTS, 'kpis'] });
    });

    return () => {
      unsubLoadings();
      unsubAdvances();
    };
  }, [queryClient]);

  return useQuery({
    queryKey: [...QUERY_KEYS.FREIGHTS, 'kpis', currentUser?.companyId, stableFilters],
    queryFn: () => fetchLogisticsKPIs(currentUser?.companyId!, stableFilters),
    enabled: !!currentUser?.companyId,
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}
