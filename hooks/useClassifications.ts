/**
 * useClassifications.ts
 *
 * Hooks de dados para tipos de produto e tipos de parceiro.
 *
 * • Usa TanStack Query para cache, deduplicação e background refetch.
 * • staleTime alto (5 min) pois esses dados raramente mudam.
 * • Realtime ativa apenas um canal compartilhado para as duas tabelas;
 *   em vez de refetch manual, invalida o cache → Query refaz em background
 *   sem piscar a tela.
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { classificationService } from '../services/classificationService';
import type { ProductType, PartnerType } from '../services/classificationService';
import { QUERY_KEYS } from './queryKeys';

const STALE_5_MIN = 5 * 60 * 1000;

// ─── useProductTypes ──────────────────────────────────────────────────────────

export function useProductTypes() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = classificationService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCT_TYPES });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey:        QUERY_KEYS.PRODUCT_TYPES,
    queryFn:         () => classificationService.getProductTypes(),
    staleTime:       STALE_5_MIN,
    placeholderData: keepPreviousData,
  });
}

// ─── usePartnerTypes ──────────────────────────────────────────────────────────

export function usePartnerTypes() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = classificationService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PARTNER_TYPES });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey:        QUERY_KEYS.PARTNER_TYPES,
    queryFn:         () => classificationService.getPartnerTypes(),
    staleTime:       STALE_5_MIN,
    placeholderData: keepPreviousData,
  });
}

// ─── Product Type Mutations ───────────────────────────────────────────────────

export function useAddProductType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type: Omit<ProductType, 'id' | 'isSystem'>) =>
      classificationService.addProductType(type),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCT_TYPES }); },
  });
}

export function useUpdateProductType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type: ProductType) => classificationService.updateProductType(type),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCT_TYPES }); },
  });
}

export function useDeleteProductType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => classificationService.deleteProductType(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCT_TYPES }); },
  });
}

// ─── Partner Type Mutations ───────────────────────────────────────────────────

export function useAddPartnerType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type: Omit<PartnerType, 'id' | 'isSystem'>) =>
      classificationService.addPartnerType(type),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.PARTNER_TYPES }); },
  });
}

export function useUpdatePartnerType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (type: PartnerType) => classificationService.updatePartnerType(type),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.PARTNER_TYPES }); },
  });
}

export function useDeletePartnerType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => classificationService.deletePartnerType(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: QUERY_KEYS.PARTNER_TYPES }); },
  });
}
