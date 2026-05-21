// hooks/useTransfers.ts
// ============================================================================
// Hook TanStack Query para Transferências entre Contas
// ============================================================================
// REFATORADO: Usa financialRealtimeHub (canal único) em vez de canal individual.
// Garante que mudanças em transfers, accounts, financial_transactions propagam
// para TODOS os computadores em tempo real, sem precisar de F5.
// ============================================================================

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { transfersService } from '../services/transfersService';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { useFinancialRealtime } from './useFinancialRealtime';

export function useTransfers() {
  // Canal único financeiro — invalida todos os caches quando qualquer tabela muda
  useFinancialRealtime();

  return useQuery({
    queryKey: QUERY_KEYS.TRANSFERS,
    queryFn: () => transfersService.getAll(),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

// Hook: Totais do mês via RPC — Zero cálculo no frontend
export function useTransfersMonthTotal() {
  // Realtime via hub financeiro (já ativado pelo useTransfers no mesmo componente)
  useFinancialRealtime();

  return useQuery({
    queryKey: QUERY_KEYS.TRANSFERS_MONTH_TOTAL,
    queryFn: () => transfersService.getMonthTotal(),
    staleTime: STALE_TIMES.DYNAMIC,
    placeholderData: keepPreviousData,
  });
}

// ─── Mutations ────────────────────────────────────────────────

export function useCreateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      accountFromId: string;
      accountToId: string;
      amount: number;
      description?: string;
      transferDate?: string;
    }) => transfersService.transfer(params),
    onSuccess: () => {
      void Promise.all([
        qc.invalidateQueries({ queryKey: QUERY_KEYS.TRANSFERS }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.TRANSFERS_MONTH_TOTAL }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TRANSACTIONS }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_SUMMARY }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.CASHIER_CURRENT })
      ]);
    },
  });
}

export function useUpdateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      id: string;
      accountFromId: string;
      accountToId: string;
      amount: number;
      description?: string;
      transferDate?: string;
    }) => transfersService.update(params.id, params),
    onSuccess: () => {
      void Promise.all([
        qc.invalidateQueries({ queryKey: QUERY_KEYS.TRANSFERS }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.TRANSFERS_MONTH_TOTAL }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TRANSACTIONS }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_SUMMARY }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.CASHIER_CURRENT })
      ]);
    },
  });
}

export function useDeleteTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transfersService.delete(id),
    onSuccess: () => {
      void Promise.all([
        qc.invalidateQueries({ queryKey: QUERY_KEYS.TRANSFERS }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.TRANSFERS_MONTH_TOTAL }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TRANSACTIONS }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_SUMMARY }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.CASHIER_CURRENT })
      ]);
    },
  });
}
