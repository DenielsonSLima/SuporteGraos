/**
 * useLoadings.ts
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { QUERY_KEYS } from './queryKeys';
import { loadingService } from '../services/loadingService';

export function useLoadings() {
  return useQuery({
    queryKey: QUERY_KEYS.LOADINGS,
    queryFn: () => loadingService.loadFromSupabase(),
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
}

export function useLoadingsByPurchaseOrder(purchaseOrderId: string | undefined) {
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
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
}

export function useLoadingsBySalesOrder(salesOrderId: string | undefined) {
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
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
}
