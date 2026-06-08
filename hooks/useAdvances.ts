// hooks/useAdvances.ts
// ============================================================================
// Hooks TanStack Query para Adiantamentos
// ============================================================================
// REFATORADO: Usa financialRealtimeHub (canal único) em vez de canais individuais.
// Garante que mudanças em financial_transactions (rollback de adiantamento)
// propagam para TODOS os computadores em tempo real.
// ============================================================================

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { advancesService } from '../services/advancesService';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { useFinancialRealtime } from './useFinancialRealtime';

export function useAdvances() {
  // Canal único financeiro — invalida todos os caches quando qualquer tabela muda
  useFinancialRealtime();

  return useQuery({
    queryKey: QUERY_KEYS.ADVANCES,
    queryFn: () => advancesService.getAll(),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

// Hook: Totais de adiantamentos ativos via RPC — Zero cálculo no frontend
export function useAdvancesActiveTotals(searchTerm: string = '', status: string = 'active') {
  // Canal único financeiro
  useFinancialRealtime();

  return useQuery({
    queryKey: [...QUERY_KEYS.ADVANCES_ACTIVE_TOTALS, searchTerm, status],
    queryFn: () => advancesService.getActiveTotals(searchTerm, status),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

export function useAdvancesByType(type: 'supplier' | 'client' | 'shareholder' | null) {
  return useQuery({
    queryKey: [...QUERY_KEYS.ADVANCES, 'type', type],
    queryFn: () => {
      if (!type) return [];
      return advancesService.getByRecipientType(type);
    },
    enabled: !!type,
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

export function useOpenAdvances() {
  // Canal único financeiro
  useFinancialRealtime();

  return useQuery({
    queryKey: [...QUERY_KEYS.ADVANCES, 'open'],
    queryFn: () => advancesService.getOpen(),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

export function useAdvanceSummaries() {
  // Canal único financeiro
  useFinancialRealtime();

  return useQuery({
    queryKey: [...QUERY_KEYS.ADVANCES, 'summaries'],
    queryFn: () => advancesService.getSummaries(),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

export function useAdvanceChildren(parentId: string | null) {
  // Canal único financeiro
  useFinancialRealtime();

  return useQuery({
    queryKey: [...QUERY_KEYS.ADVANCES, 'children', parentId],
    queryFn: () => {
      if (!parentId) return [];
      return advancesService.getChildren(parentId);
    },
    enabled: !!parentId,
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook para buscar as fontes de consumo de um adiantamento
 * (carregamentos vinculados via pedido de compra)
 */
export function useAdvanceConsumptionSources(advanceId: string | null) {
  useFinancialRealtime();

  return useQuery({
    queryKey: [...QUERY_KEYS.ADVANCES, 'consumption-sources', advanceId],
    queryFn: () => {
      if (!advanceId) return [];
      return advancesService.getConsumptionSources(advanceId);
    },
    enabled: !!advanceId,
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

