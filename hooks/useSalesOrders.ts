/**
 * useSalesOrders.ts
 *
 * Hook TanStack Query para Pedidos de Venda.
 * ✅ Cache + SWR (Stale-While-Revalidate)
 * ✅ Realtime: invalida automaticamente quando qualquer venda muda no banco
 * ✅ Multi-usuário: canal único (singleton) com cleanup correto
 * ✅ Delega fetch ao salesService (preserva modo canônico + enriquecimento de endereços)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { salesService } from '../services/salesService';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { SalesOrder } from '../modules/SalesOrder/types';
import { isSqlCanonicalOpsEnabled } from '../services/sqlCanonicalOps';

// ─── Canal realtime singleton com múltiplos ouvintes ────────────────────────
// Garante que apenas 1 canal WebSocket fica aberto, mesmo que o hook seja
// usado em múltiplos componentes ao mesmo tempo (multi-tab, etc.).
// ✅ Escuta ops_sales_orders E ops_loadings — a VIEW vw_sales_orders_enriched
//    faz JOIN com ops_loadings para calcular transitValue/transitCount/deliveredValue.
//    Sem escutar ops_loadings, os KPIs de "Mercadoria em Trânsito" ficam stale
//    até o staleTime expirar (5 min).
const _salesListeners = new Set<() => void>();
let _salesChannel: ReturnType<typeof supabase.channel> | null = null;

function ensureSalesChannel() {
  if (_salesChannel) return;
  const tableName = isSqlCanonicalOpsEnabled() ? 'ops_sales_orders' : 'sales_orders';
  _salesChannel = supabase
    .channel(`realtime:${tableName}:hook`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      () => _salesListeners.forEach(cb => cb()),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'ops_loadings' },
      () => _salesListeners.forEach(cb => cb()),
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'financial_entries',
        filter: 'origin_type=eq.sales_order'
      },
      () => _salesListeners.forEach(cb => cb()),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'financial_transactions' },
      () => _salesListeners.forEach(cb => cb()),
    )
    .subscribe();
}

function subscribeToSalesRealtime(onInvalidate: () => void): () => void {
  _salesListeners.add(onInvalidate);
  ensureSalesChannel();

  return () => {
    _salesListeners.delete(onInvalidate);
    if (_salesListeners.size === 0 && _salesChannel) {
      supabase.removeChannel(_salesChannel);
      _salesChannel = null;
    }
  };
}

// ─── Hook principal ─────────────────────────────────────────────────────────

export function useSalesOrders() {
  const queryClient = useQueryClient();

  // Realtime: invalida cache quando qualquer venda muda no banco
  useEffect(() => {
    const unsub = subscribeToSalesRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SALES_ORDERS });
    });
    return unsub;
  }, [queryClient]);

  return useQuery<SalesOrder[]>({
    queryKey: QUERY_KEYS.SALES_ORDERS,
    // Delega ao salesService que sabe lidar com modo canônico e enriquecimento
    queryFn: () => salesService.loadFromSupabase(),
    staleTime: 1000 * 60 * 5, // ⚡ REALTIME: O canal via useEffect já invalida; não precisa de fetch constante
    placeholderData: (prev) => prev,      // Mantém dados antigos enquanto revalida
  });
}

/**
 * Hook auxiliar: filtra pedidos de um parceiro específico (no lado do cliente).
 * Não cria subscription própria — usa a invalidação hierárquica do SALES_ORDERS.
 */
export function usePartnerSalesOrders(partnerId: string) {
  const query = useSalesOrders();

  return {
    ...query,
    data: query.data?.filter(o => o.customerId === partnerId) ?? [],
  };
}

// ─── Mutations ────────────────────────────────────────────────

const mutationErrorHandler = (err: unknown) => {
  console.error('[useSalesOrders] Mutation falhou:', err);
};

export function useAddSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sale: SalesOrder) => salesService.add(sale),
    onSuccess: async () => { 
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.SALES_ORDERS });
    },
    onError: mutationErrorHandler,
  });
}

export function useUpdateSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sale: SalesOrder) => salesService.update(sale),
    onSuccess: async () => { 
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.SALES_ORDERS });
    },
    onError: mutationErrorHandler,
  });
}

export function useDeleteSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => salesService.delete(id),
    onSuccess: async () => { 
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.SALES_ORDERS });
    },
    onError: mutationErrorHandler,
  });
}

export function useUpdateSalesTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { orderId: string; transaction: any }) =>
      salesService.updateTransaction(params.orderId, params.transaction),
    onSuccess: async () => { 
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.SALES_ORDERS });
    },
    onError: mutationErrorHandler,
  });
}

export function useDeleteSalesTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { orderId: string; txId: string }) => {
      await salesService.deleteTransaction(params.orderId, params.txId);
    },
    onSuccess: async () => { 
      await qc.invalidateQueries({ queryKey: QUERY_KEYS.SALES_ORDERS });
    },
    onError: mutationErrorHandler,
  });
}
