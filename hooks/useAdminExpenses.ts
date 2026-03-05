// hooks/useAdminExpenses.ts
// ============================================================================
// Hooks TanStack Query para Despesas Administrativas
// ============================================================================

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { adminExpensesService } from '../services/adminExpensesService';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';

export function useAdminExpenses() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = adminExpensesService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_EXPENSES });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_EXPENSES,
    queryFn: () => adminExpensesService.getAll(),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

export function useAdminExpensesByCategory(categoryId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ADMIN_EXPENSES, 'category', categoryId],
    queryFn: () => {
      if (!categoryId) return [];
      return adminExpensesService.getByCategory(categoryId);
    },
    enabled: !!categoryId,
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

export function useAdminExpensesByDateRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ADMIN_EXPENSES, 'range', startDate, endDate],
    queryFn: () => adminExpensesService.getByDateRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}
