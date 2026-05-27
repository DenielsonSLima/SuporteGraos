/**
 * useSalesStats.ts
 *
 * Hook TanStack Query para estatísticas globais de vendas.
 * ✅ Cache + Realtime (invalida via hook de ordens de venda)
 * ✅ Centraliza chamadas ao RPC rpc_get_sales_order_stats_v3
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { salesService } from '../services/salesService';
import { useCurrentUser } from './useCurrentUser';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';

import { SalesLoadParams } from '../services/sales/loader';

export function useSalesStats(params: SalesLoadParams = {}) {
  const currentUser = useCurrentUser();
  const companyId = currentUser?.companyId;

  return useQuery({
    queryKey: [...QUERY_KEYS.SALES_STATS, companyId, params],
    queryFn: async () => {
      if (!companyId) return null;
      return salesService.getStats(companyId, params);
    },
    enabled: !!companyId,
    staleTime: STALE_TIMES.DYNAMIC, 
    placeholderData: keepPreviousData,
  });
}
