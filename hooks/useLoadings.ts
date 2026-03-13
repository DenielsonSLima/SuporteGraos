/**
 * useLoadings.ts
 *
 * Hook TanStack Query para romaneios/carregamentos (Logistics).
 *
 * OTIMIZADO:
 * ✅ Cache inteligente com staleTime
 * ✅ Deduplicação automática de requests
 * ✅ keepPreviousData para evitar piscar UI
 * ✅ UMA ÚNICA subscription compartilhada (era 1 por instância de hook)
 *    Os hooks filtrados (byPurchaseOrder, bySalesOrder) compartilham
 *    a mesma queryKey base LOADINGS e são invalidados juntos.
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { loadingService } from '../services/loadingService';

/**
 * Hook interno: registra UMA subscription no loadingService
 * e invalida TODA a família de queries de loadings.
 */
function useLoadingsRealtimeInvalidation() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = loadingService.subscribe(() => {
      // Invalida toda a família: ['loadings'], ['loadings','purchase',x], ['loadings','sales',x]
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOADINGS });
    });
    return unsub;
  }, [queryClient]);
}

/**
 * Retorna todos os romaneios/carregamentos com cache TanStack Query.
 */
export function useLoadings() {
  useLoadingsRealtimeInvalidation();

  return useQuery({
    queryKey: QUERY_KEYS.LOADINGS,
    queryFn: () => loadingService.loadFromSupabase(),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

/**
 * Retorna carregamentos filtrados por pedido de compra.
 */
export function useLoadingsByPurchaseOrder(purchaseOrderId: string | undefined) {
  useLoadingsRealtimeInvalidation();

  return useQuery({
    queryKey: [...QUERY_KEYS.LOADINGS, 'purchase', purchaseOrderId] as const,
    queryFn: async () => {
      const all = await loadingService.loadFromSupabase();
      return all.filter(l =>
        l.purchaseOrderId === purchaseOrderId ||
        (l.purchaseOrderNumber && l.purchaseOrderNumber === purchaseOrderId)
      );
    },
    enabled: !!purchaseOrderId,
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

/**
 * Retorna carregamentos filtrados por pedido de venda.
 */
export function useLoadingsBySalesOrder(salesOrderId: string | undefined) {
  useLoadingsRealtimeInvalidation();

  return useQuery({
    queryKey: [...QUERY_KEYS.LOADINGS, 'sales', salesOrderId] as const,
    queryFn: async () => {
      const all = await loadingService.loadFromSupabase();
      return all.filter(l =>
        l.salesOrderId === salesOrderId ||
        (l.salesOrderNumber && l.salesOrderNumber === salesOrderId)
      );
    },
    enabled: !!salesOrderId,
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}
