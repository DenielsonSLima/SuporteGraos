// hooks/useFinancialEntries.ts
// ============================================================================
// Hooks TanStack Query para gerenciar Contas a Pagar/Receber
// ============================================================================
// REFATORADO:
// ✅ Usa financialRealtimeHub (canal único) em vez de canais individuais
// ✅ staleTime padronizado via STALE_TIMES
// ✅ Cross-module: mudanças em financial_transactions invalidam entries
// ✅ Hooks auxiliares NÃO registram subscription própria
// ============================================================================

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  financialEntriesService,
  FinancialEntryType,
  EntryStatus,
  FinancialFilterParams,
} from '../services/financialEntriesService';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { useFinancialRealtime } from './useFinancialRealtime';

// Hook principal: Contas a Pagar
export function usePayables(params?: FinancialFilterParams) {
  // Canal único financeiro — invalida todos os caches quando qualquer tabela muda
  useFinancialRealtime();

  return useQuery({
    queryKey: [...QUERY_KEYS.FINANCIAL_PAYABLES, params],
    queryFn: () => financialEntriesService.getPayables(params),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

// Hook principal: Contas a Receber
export function useReceivables(params?: FinancialFilterParams) {
  // Canal único financeiro
  useFinancialRealtime();

  return useQuery({
    queryKey: [...QUERY_KEYS.FINANCIAL_RECEIVABLES, params],
    queryFn: () => financialEntriesService.getReceivables(params),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

// Hook auxiliar: Filtra por status (SEM subscription própria — usa invalidação hierárquica)
export function useEntriesByStatus(type: FinancialEntryType, status: EntryStatus) {
  return useQuery({
    queryKey: [type, status],
    queryFn: () => financialEntriesService.getByStatus(type, status),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

// Hook auxiliar: Busca por ID (SEM subscription — dado pontual)
export function useEntryById(id: string | null) {
  return useQuery({
    queryKey: ['entry', id],
    queryFn: () => {
      if (!id) return null;
      return financialEntriesService.getById(id);
    },
    enabled: !!id,
    staleTime: STALE_TIMES.DYNAMIC,
  });
}

// Hook auxiliar: Totais (SEM subscription própria — usa invalidação via payables/receivables)
export function useTotalsByType(type: FinancialEntryType, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['totals', type, startDate, endDate],
    queryFn: () => financialEntriesService.getTotalsByType(type, startDate, endDate),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}
