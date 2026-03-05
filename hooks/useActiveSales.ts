/**
 * useActiveSales.ts
 *
 * Hook TanStack Query para pedidos de venda ativos (approved/pending).
 * Usado pelos módulos de Loadings (LoadingManagement + LoadingForm)
 * para selecionar o destino de uma carga.
 *
 * ✅ Reutiliza useSalesOrders (cache compartilhado, realtime singleton)
 * ✅ Filtra apenas vendas ativas no lado do cliente
 * ✅ Elimina salesService.loadFromSupabase() + startRealtime() + subscribe() diretos
 */

import { useSalesOrders } from './useSalesOrders';
import { SalesOrder } from '../modules/SalesOrder/types';

const ACTIVE_STATUSES = ['approved', 'pending'] as const;

/**
 * Retorna pedidos de venda com status 'approved' ou 'pending'.
 * Compartilha cache e realtime do useSalesOrders — zero overhead extra.
 */
export function useActiveSales() {
  const query = useSalesOrders();

  const activeSales: SalesOrder[] = (query.data ?? []).filter(
    (s) => ACTIVE_STATUSES.includes(s.status as any)
  );

  return {
    ...query,
    data: activeSales,
  };
}
