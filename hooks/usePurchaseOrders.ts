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
import { mapOrderFromDb, mapOrderFromOpsRow } from '../services/purchase/mappers';

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
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'purchase_expenses' },
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

import { PurchaseLoadParams, PurchaseLoadResult } from '../services/purchase/loader';

export function usePurchaseOrders(params: PurchaseLoadParams = {}) {
  const queryClient = useQueryClient();

  // Realtime: invalida cache quando qualquer pedido de compra muda no banco
  useEffect(() => {
    const unsub = subscribeToPurchaseRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS });
    });
    return unsub;
  }, [queryClient]);

  // Se houver busca ou filtros de data, ignoramos o stale agressivo
  const isSearching = !!(params.searchTerm || params.startDate || params.endDate || params.shareholder);

  return useQuery<PurchaseLoadResult>({
    queryKey: [...QUERY_KEYS.PURCHASE_ORDERS, params],
    // Delega ao purchaseService que sabe lidar com modo canônico e enriquecimento
    queryFn: () => purchaseService.loadFromSupabase(params),
    staleTime: isSearching ? 0 : 1000 * 60 * 5, 
    placeholderData: (prev) => prev,      // Sem piscar ao revalidar
  });
}

/**
 * Hook auxiliar: filtra pedidos de um parceiro específico (no lado do cliente).
 * Não cria subscription própria — usa a invalidação hierárquica do PURCHASE_ORDERS.
 */
export function usePartnerPurchaseOrders(partnerId: string) {
  // Para parceiro, buscamos todos do parceiro (limite maior)
  const query = usePurchaseOrders({ pageSize: 1000 }); 

  return {
    ...query,
    data: query.data?.data.filter(o => o.partnerId === partnerId || o.brokerId === partnerId) || []
  };
}

/**
 * Hook para buscar um único pedido de compra por ID.
 * Garante que temos a versão mais recente do banco (SQL-First).
 */
export function usePurchaseOrder(orderId: string) {
  const isCanonical = isSqlCanonicalOpsEnabled();
  const tableName = isCanonical ? 'vw_purchase_orders_enriched' : 'ops_purchase_orders';

  return useQuery<PurchaseOrder | null>({
    queryKey: [QUERY_KEYS.PURCHASE_ORDERS, 'detail', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (error || !data) return null;
      return isCanonical ? mapOrderFromOpsRow(data) : mapOrderFromDb(data);
    },
    staleTime: 1000 * 10, // 10s stale time for details is safe
  });
}

// ─── Mutations ────────────────────────────────────────────────

export function useAddPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (order: PurchaseOrder) => purchaseService.add(order),
    onSuccess: async () => { 
      await Promise.all([
        qc.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.CASHIER_CURRENT })
      ]);
    },
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (order: PurchaseOrder) => purchaseService.update(order),
    onSuccess: async () => { 
      await Promise.all([
        qc.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.CASHIER_CURRENT })
      ]);
    },
  });
}

export function useDeletePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => purchaseService.delete(id),
    onSuccess: async () => { 
      await Promise.all([
        qc.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.CASHIER_CURRENT })
      ]);
    },
  });
}

export function useUpdatePurchaseTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { orderId: string; transaction: any }) =>
      purchaseService.updateTransaction(params.orderId, params.transaction),
    onSuccess: async () => { 
      await Promise.all([
        qc.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.CASHIER_CURRENT })
      ]);
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
      await Promise.all([
        qc.invalidateQueries({ queryKey: QUERY_KEYS.PURCHASE_ORDERS }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.CASHIER_CURRENT })
      ]);
    },
  });
}
