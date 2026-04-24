/**
 * useSalesStats.ts
 *
 * Hook TanStack Query para estatísticas globais de vendas.
 * ✅ Cache + Realtime (invalida via hook de ordens de venda)
 * ✅ Centraliza chamadas ao RPC rpc_get_sales_order_stats_v3
 */

import { useQuery } from '@tanstack/react-query';
import { salesService } from '../services/salesService';
import { useCurrentUser } from './useCurrentUser';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';

export function useSalesStats() {
  const currentUser = useCurrentUser();
  const companyId = currentUser?.companyId;

  return useQuery({
    queryKey: [...QUERY_KEYS.SALES_STATS, companyId],
    queryFn: async () => {
      if (!companyId) return null;
      return salesService.getStats(companyId);
    },
    enabled: !!companyId,
    // Como o realtime já invalida a query, podemos ter um staleTime 
    // um pouco maior para evitar excesso de requests durante navegação rápida.
    staleTime: STALE_TIMES.DYNAMIC, 
  });
}
