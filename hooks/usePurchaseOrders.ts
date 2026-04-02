/**
 * usePurchaseOrders.ts
 *
 * Hook TanStack Query para Pedidos de Compra.
 * ✅ Cache + SWR (Stale-While-Revalidate)
 * ✅ Realtime: invalida automaticamente quando qualquer pedido muda no banco
 * ✅ Multi-usuário: canal único (singleton) com cleanup correto
 * ✅ Delega fetch ao purchaseService (preserva modo canônico + enriquecimento de endereços)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { purchaseService } from '../services/purchaseService';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { PurchaseOrder } from '../modules/PurchaseOrder/types';
import { isSqlCanonicalOpsEnabled } from '../services/sqlCanonicalOps';

// ─── Canal realtime singleton com múltiplos ouvintes ────────────────────────
// Garante que apenas 1 canal WebSocket fica aberto, mesmo que o hook seja
// usado em múltiplos componentes ao mesmo tempo.
const _purchaseListeners = new Set<() => void>();
let _purchaseChannel: ReturnType<typeof supabase.channel> | null = null;

function ensurePurchaseChannel() {
  if (_purchaseChannel) return;
  const tableName = isSqlCanonicalOpsEnabled() ? 'ops_purchase_orders' : 'purchase_orders';
  _purchaseChannel = supabase
    .channel(`realtime:${tableName}:hook`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      () => _purchaseListeners.forEach(cb => cb()),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ops_loadings' },
      () => _purchaseListeners.forEach(cb => cb()),
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'financial_entries',
        filter: 'origin_type=eq.purchase_order'
      },
      () => _purchaseListeners.forEach(cb => cb()),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'financial_transactions' },
      () => _purchaseListeners.forEach(cb => cb()),
    )
    .subscribe();
}

function subscribeToPurchaseRealtime(onInvalidate: () => void): () => void {
  _purchaseListeners.add(onInvalidate);
  ensurePurchaseChannel();

  return () => {
    _purchaseListeners.delete(onInvalidate);
    if (_purchaseListeners.size === 0 && _purchaseChannel) {
      supabase.removeChannel(_purchaseChannel);
      _purchaseChannel = null;
    }
  };
}

// ─── Hook principal ─────────────────────────────────────────────────────────

export function usePurchaseOrders() {
  const queryClient = useQueryClient();

  // Realtime: invalida cache quando qualquer pedido de compra muda no banco
  useEffect(() => {
    const unsub = subscribeToPurchaseRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS });
    });
    return unsub;
  }, [queryClient]);

  return useQuery<PurchaseOrder[]>({
    queryKey: QUERY_KEYS.PURCHASE_ORDERS,
    // Delega ao purchaseService que sabe lidar com modo canônico e enriquecimento
    queryFn: () => purchaseService.loadFromSupabase(),
    staleTime: 0, // ⚡ REALTIME: Refetch imediato em qualquer mudança do banco
    placeholderData: (prev) => prev,      // Sem piscar ao revalidar
  });
}

/**
 * Hook auxiliar: filtra pedidos de um parceiro específico (no lado do cliente).
 * Não cria subscription própria — usa a invalidação hierárquica do PURCHASE_ORDERS.
 */
export function usePartnerPurchaseOrders(partnerId: string) {
  const query = usePurchaseOrders();

  return {
    ...query,
    data: query.data?.filter(o => o.partnerId === partnerId || o.brokerId === partnerId) || []
  };
}

// ─── Mutations ────────────────────────────────────────────────

export function useAddPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (order: PurchaseOrder) => purchaseService.add(order),
    onSuccess: async () => { 
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS });
    },
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (order: PurchaseOrder) => purchaseService.update(order),
    onSuccess: async () => { 
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS });
    },
  });
}

export function useDeletePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchaseService.delete(id),
    onSuccess: async () => { 
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS });
    },
  });
}

export function useUpdatePurchaseTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { orderId: string; transaction: any }) =>
      purchaseService.updateTransaction(params.orderId, params.transaction),
    onSuccess: async () => { 
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS });
    },
  });
}

export function useDeletePurchaseTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { orderId: string; txId: string }) => {
      await purchaseService.deleteTransaction(params.orderId, params.txId);
    },
    onSuccess: async () => { 
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS });
    },
  });
}
