/**
 * useCarriers.ts
 *
 * Hook TanStack Query para transportadoras (Logistics).
 *
 * ✅ Reutiliza parceirosService com filtro CARRIER
 * ✅ Cache REFERENCE (5min) — transportadoras mudam pouco
 * ✅ Retorna apenas os nomes ordenados (uso principal: filtro de dropdown)
 * ✅ Compartilha realtime do useParceiros (invalida CARRIERS key)
 */

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { parceirosService } from '../services/parceirosService';
import { PARTNER_CATEGORY_IDS } from '../constants';

/**
 * Retorna a lista de nomes de transportadoras (ordenada A-Z).
 * Usado no LogisticsModule para o dropdown de filtro por transportadora.
 */
export function useCarriers() {
  const queryClient = useQueryClient();

  // Realtime: invalida quando parceiros mudam
  useEffect(() => {
    const unsub = parceirosService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CARRIERS });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey: QUERY_KEYS.CARRIERS,
    queryFn: async (): Promise<string[]> => {
      const result = await parceirosService.getPartners({
        page: 1,
        pageSize: 2000,
        category: PARTNER_CATEGORY_IDS.CARRIER,
      });

      return (result.data || [])
        .filter((p: any) =>
          Array.isArray(p.categories)
            ? p.categories.includes(PARTNER_CATEGORY_IDS.CARRIER)
            : p.partnerTypeId === PARTNER_CATEGORY_IDS.CARRIER
        )
        .map((p: any) => p.name as string)
        .sort();
    },
    staleTime: STALE_TIMES.REFERENCE,
    placeholderData: keepPreviousData,
  });
}
