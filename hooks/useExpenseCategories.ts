/**
 * useExpenseCategories.ts
 *
 * Hook de dados para categorias de despesa.
 *
 * • staleTime 5 min: categorias mudam raramente.
 * • Realtime invalida quando qualquer sessão alterar expense_categories.
 */


import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { expenseCategoryService } from '../services/expenseCategoryService';
import type { ExpenseCategory, ExpenseSubtype } from '../services/expenseCategoryService';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';

export function useExpenseCategories() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = expenseCategoryService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EXPENSE_CATEGORIES });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey:        QUERY_KEYS.EXPENSE_CATEGORIES,
    queryFn:         () => expenseCategoryService.getAll(),
    staleTime:       STALE_TIMES.REFERENCE,
    placeholderData: keepPreviousData,
  });
}

// ─── Category Mutations ───────────────────────────────────────

export function useAddExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<ExpenseCategory, 'id' | 'icon' | 'isSystem' | 'subtypes'>) =>
      expenseCategoryService.add(input),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.EXPENSE_CATEGORIES }); },
  });
}

export function useUpdateExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: string; input: Partial<Omit<ExpenseCategory, 'id' | 'icon' | 'isSystem' | 'subtypes'> & { name?: string; color?: string; type?: string }> }) =>
      expenseCategoryService.update(params.id, params.input),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.EXPENSE_CATEGORIES }); },
  });
}

export function useDeleteExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expenseCategoryService.delete(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.EXPENSE_CATEGORIES }); },
  });
}

// ─── Subcategory Mutations ────────────────────────────────────

export function useAddExpenseSubcategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { categoryId: string; name: string }) =>
      expenseCategoryService.addSubcategory(params.categoryId, params.name),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.EXPENSE_CATEGORIES }); },
  });
}

export function useUpdateExpenseSubcategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { subcategoryId: string; name: string }) =>
      expenseCategoryService.updateSubcategory(params.subcategoryId, params.name),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.EXPENSE_CATEGORIES }); },
  });
}

export function useDeleteExpenseSubcategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subcategoryId: string) =>
      expenseCategoryService.deleteSubcategory(subcategoryId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.EXPENSE_CATEGORIES }); },
  });
}
