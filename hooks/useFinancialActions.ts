/**
 * useFinancialActions.ts
 *
 * Hook de dados para ações financeiras (pagamentos, recebimentos, despesas avulsas).
 *
 * Encapsula financialActionService para que componentes .tsx
 * NÃO importem services diretamente (Skill 1.2, 9.5).
 *
 * • getStandaloneRecords → useQuery (cache + SWR)
 * • processRecord → useMutation (invalidação automática)
 * • addAdminExpense / deleteStandaloneRecord → useMutation
 * • addTransfer / updateTransfer / deleteTransfer → useMutation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialActionService } from '../services/financialActionService';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import type { FinancialRecord } from '../modules/Financial/types';

// ─── Queries ──────────────────────────────────────────────────

export function useStandaloneRecords() {
  return useQuery({
    queryKey: QUERY_KEYS.STANDALONE_RECORDS,
    queryFn: () => financialActionService.getStandaloneRecords(),
    staleTime: STALE_TIMES.VOLATILE,
  });
}

export function useTransferRecords() {
  return useQuery({
    queryKey: QUERY_KEYS.TRANSFERS,
    queryFn: () => financialActionService.getTransfers(),
    staleTime: STALE_TIMES.VOLATILE,
  });
}

// ─── Mutations ────────────────────────────────────────────────

export function useProcessPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { recordId: string; data: any; subType?: string }) =>
      financialActionService.processRecord(params.recordId, params.data, params.subType),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.STANDALONE_RECORDS });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.TRANSFERS });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_ENTRIES });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.FINANCIAL_TRANSACTIONS });
    },
  });
}

export function useAddAdminExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: FinancialRecord) =>
      financialActionService.addAdminExpense(record),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.STANDALONE_RECORDS });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_EXPENSES });
    },
  });
}

export function useDeleteStandaloneRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      financialActionService.deleteStandaloneRecord(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.STANDALONE_RECORDS });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_EXPENSES });
    },
  });
}

export function useAddTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transfer: any) =>
      financialActionService.addTransfer(transfer),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.TRANSFERS });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS });
    },
  });
}

export function useUpdateTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transfer: any) =>
      financialActionService.updateTransfer(transfer),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.TRANSFERS });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS });
    },
  });
}

export function useDeleteTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      financialActionService.deleteTransfer(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.TRANSFERS });
      void qc.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTS });
    },
  });
}
