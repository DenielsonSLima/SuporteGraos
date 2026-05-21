// hooks/useAdminExpenses.ts
// ============================================================================
// Hooks TanStack Query para Despesas Administrativas
// ============================================================================
// REFATORADO: Usa financialRealtimeHub (canal único) em vez de canal individual.
// ============================================================================

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { adminExpensesService } from '../services/adminExpensesService';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { useFinancialRealtime } from './useFinancialRealtime';

export function useAdminExpenses() {
  // Canal único financeiro — invalida todos os caches quando qualquer tabela muda
  useFinancialRealtime();

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
