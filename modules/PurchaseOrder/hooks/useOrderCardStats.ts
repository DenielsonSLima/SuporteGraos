/**
 * useOrderCardStats.ts
 *
 * Hook co-localizado para OrderCard.
 * Encapsula:
 * - LoadingCache.getByPurchaseOrder (leitura síncrona de cache legado)
 * - ledgerService.subscribe (listener de transações)
 * - loadingService.subscribe (listener de carregamentos)
 *
 * SKIL: TSX não importa services diretamente.
 */

import { useState, useEffect, useMemo } from 'react';
// ✅ SKIL Gap 7: LoadingCache removido — leitura direta via loadingService (sempre fresh)
import { ledgerService } from '../../../services/ledgerService';
import { loadingService } from '../../../services/loadingService';
import type { PurchaseOrder } from '../types';

export function useOrderCardStats(order: PurchaseOrder) {
  const [refreshKey, setRefreshKey] = useState(0);

  // Listener para atualizar stats quando transações mudam
  useEffect(() => {
    const handleChange = () => setRefreshKey(prev => prev + 1);
    const unsubLedger = ledgerService.subscribe(handleChange);
    const unsubLoading = loadingService.subscribe(handleChange);
    return () => {
      unsubLedger();
      unsubLoading();
    };
  }, []);

  return useMemo(() => {
    const loadings = loadingService.getByPurchaseOrder(order.id);
    const activeLoadings = loadings.filter(l => l.status !== 'canceled');
    const loadedQty = activeLoadings.reduce((acc, l) => acc + l.weightSc, 0);
    const contractQty = order.items.reduce((acc, i) => acc + i.quantity, 0);
    const totalLoadedValue = activeLoadings.reduce((acc, l) => acc + (l.totalPurchaseValue || 0), 0);

    const txs = order.transactions || [];
    const cashPaidTx = txs
      .filter(t => t.type === 'payment' || t.type === 'advance')
      .reduce((acc, t) => acc + (t.value || 0), 0);
    const discountTx = txs.reduce((acc, t) => acc + (t.discountValue || 0), 0);

    const cashPaid = Math.max(cashPaidTx, order.paidValue || 0);
    const directDiscounts = Math.max(discountTx, order.discountValue || 0);

    const deductedExpenses = txs
      .filter(t => (t.type === 'expense' || t.type === 'commission') && t.deductFromPartner)
      .reduce((acc, t) => acc + t.value + (t.discountValue || 0), 0);

    const totalSettled = cashPaid + directDiscounts + deductedExpenses;
    const pendingValue = Math.max(0, totalLoadedValue - totalSettled);
    const advanceBalance = Math.max(0, totalSettled - totalLoadedValue);
    const progress = contractQty > 0 ? Math.min((loadedQty / contractQty) * 100, 100) : 0;

    return { loadedQty, contractQty, totalLoadedValue, totalSettled, pendingValue, advanceBalance, progress };
  }, [order, refreshKey]);
}
