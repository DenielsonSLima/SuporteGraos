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
  FinancialFilterParams,
} from '../services/financialEntriesService';
import { loadingService } from '../services/loadingService';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';

// Hook principal: Contas a Pagar
export function usePayables(params?: FinancialFilterParams) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // 1. Invalida apenas quando o tipo mudado é 'payable' (ou desconhecido como fallback seguro)
    const unsubEntries = financialEntriesService.subscribeRealtime((entryType) => {
      if (!entryType || entryType === 'payable') {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_PAYABLES });
      }
    });

    // 2. Invalida quando houver mudanças em Carregamentos (Logística)
    // Muitos títulos de frete são gerados/atualizados via Logística.
    // Usamos debounce para evitar excesso de rede (Egress Saver).
    let timer: NodeJS.Timeout;
    const unsubLoadings = loadingService.subscribeRealtime(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_PAYABLES });
      }, 1000); // 1s debounce
    });

    return () => {
      unsubEntries();
      unsubLoadings();
      clearTimeout(timer);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: [QUERY_KEYS.FINANCIAL_PAYABLES, params],
    queryFn: () => financialEntriesService.getPayables(params),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

// Hook principal: Contas a Receber
export function useReceivables(params?: FinancialFilterParams) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // 1. Invalida apenas quando o tipo mudado é 'receivable' (ou desconhecido como fallback seguro)
    const unsubEntries = financialEntriesService.subscribeRealtime((entryType) => {
      if (!entryType || entryType === 'receivable') {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.FINANCIAL_RECEIVABLES,
        });
      }
    });

    // 2. Invalida quando houver mudanças em Carregamentos (Logística)
    // Títulos de receita de venda são vinculados a carregamentos.
    let timer: NodeJS.Timeout;
    const unsubLoadings = loadingService.subscribeRealtime(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.FINANCIAL_RECEIVABLES,
        });
      }, 1000); // 1s debounce
    });

    return () => {
      unsubEntries();
      unsubLoadings();
      clearTimeout(timer);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: [QUERY_KEYS.FINANCIAL_RECEIVABLES, params],
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
