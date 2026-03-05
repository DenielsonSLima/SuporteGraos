/**
 * useFreights.ts
 *
 * Hook TanStack Query para freights computados pela VIEW v_logistics_freights.
 *
 * ✅ Cálculos no banco (balance, financial_status, breakage)
 * ✅ Cache DYNAMIC (1min) com realtime via loadings
 * ✅ Substitui computeFreightsFromLoadings (frontend calc → backend VIEW)
 *
 * Regra 5.4: "Frontend NÃO faz cálculos."
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { fetchFreights } from '../services/freightService';
import { loadingService } from '../services/loadingService';

/**
 * Retorna freights com campos computados no banco.
 * Invalida automaticamente quando loadings mudam (realtime).
 */
export function useFreights() {
  const queryClient = useQueryClient();

  // Quando loadings mudam (realtime), os freights derivados também mudam
  useEffect(() => {
    const unsub = loadingService.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FREIGHTS });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey: QUERY_KEYS.FREIGHTS,
    queryFn: fetchFreights,
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}
