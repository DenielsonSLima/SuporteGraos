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
    return () => {
      unsubLedger();
    };
  }, []);

  return useMemo(() => {
    // ═══════ SQL-FIRST DATA ═══════
    // Estes campos já chegam calculados pelo banco (vêm da view vw_purchase_orders_enriched)
    const totalLoadedValue = Number(order.totalPurchaseValCalc) || 0;
    const totalSettled = Number(order.paidValue) || 0;
    const loadedQty = Number(order.totalSc) || 0;
    
    const contractQty = order.items.reduce((acc, i) => acc + i.quantity, 0);
    const pendingValue = Math.max(0, totalLoadedValue - totalSettled);
    const advanceBalance = Math.max(0, totalSettled - totalLoadedValue);
    const progress = contractQty > 0 ? Math.min((loadedQty / contractQty) * 100, 100) : 0;

    return { 
      loadedQty, 
      contractQty, 
      totalLoadedValue, 
      totalSettled, 
      pendingValue, 
      advanceBalance, 
      progress 
    };
  }, [order, refreshKey]);
}
