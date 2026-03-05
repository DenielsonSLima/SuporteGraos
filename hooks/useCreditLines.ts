// hooks/useCreditLines.ts
// ============================================================================
// Hooks TanStack Query para Linhas de Crédito
// ============================================================================

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { creditLinesService } from '../services/creditLinesService';
import { QUERY_KEYS } from './queryKeys';

const STALE_TIME = 2 * 60 * 1000;

export function useCreditLines() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = creditLinesService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CREDIT_LINES });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey: QUERY_KEYS.CREDIT_LINES,
    queryFn: () => creditLinesService.getAll(),
    staleTime: STALE_TIME,
    placeholderData: keepPreviousData,
  });
}

export function useActiveCreditLines() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = creditLinesService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.CREDIT_LINES, 'active'] });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey: [...QUERY_KEYS.CREDIT_LINES, 'active'],
    queryFn: () => creditLinesService.getActive(),
    staleTime: STALE_TIME,
    placeholderData: keepPreviousData,
  });
}

export function useCreditLineTotals() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = creditLinesService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CREDIT_LINE_TOTALS });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey: QUERY_KEYS.CREDIT_LINE_TOTALS,
    queryFn: () => creditLinesService.getTotals(),
    staleTime: STALE_TIME,
    placeholderData: keepPreviousData,
  });
}
