// hooks/useFinancialEntries.ts
// ============================================================================
// Hooks TanStack Query para gerenciar Contas a Pagar/Receber
// ============================================================================
// OTIMIZADO:
// ✅ staleTime padronizado via STALE_TIMES (era hardcoded)
// ✅ Cada hook principal registra 1 subscription (não duplica)
// ✅ Hooks auxiliares NÃO registram subscription própria
//    (são invalidados pela key hierárquica)
// ============================================================================

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  financialEntriesService,
  FinancialEntryType,
  EntryStatus,
} from '../services/financialEntriesService';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';

// Hook principal: Contas a Pagar
export function usePayables() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Invalida apenas quando o tipo mudado é 'payable' (ou desconhecido como fallback seguro)
    const unsub = financialEntriesService.subscribeRealtime((entryType) => {
      if (!entryType || entryType === 'payable') {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_PAYABLES });
      }
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey: QUERY_KEYS.FINANCIAL_PAYABLES,
    queryFn: () => financialEntriesService.getPayables(),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

// Hook principal: Contas a Receber
export function useReceivables() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Invalida apenas quando o tipo mudado é 'receivable' (ou desconhecido como fallback seguro)
    const unsub = financialEntriesService.subscribeRealtime((entryType) => {
      if (!entryType || entryType === 'receivable') {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.FINANCIAL_RECEIVABLES,
        });
      }
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey: QUERY_KEYS.FINANCIAL_RECEIVABLES,
    queryFn: () => financialEntriesService.getReceivables(),
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
export function useTotalsByType(type: FinancialEntryType) {
  return useQuery({
    queryKey: ['totals', type],
    queryFn: () => financialEntriesService.getTotalsByType(type),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}
