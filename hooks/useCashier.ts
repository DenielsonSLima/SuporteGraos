/**
 * useCashier.ts
 *
 * Hooks TanStack Query para o módulo Caixa.
 *
 * OTIMIZADO:
 * ✅ Cache inteligente com staleTime
 * ✅ keepPreviousData — sem piscar ao re-fetchar
 * ✅ Deduplicação automática de requests
 * ✅ 1 ÚNICA subscription compartilhada (era 6 = 3 por hook × 2 hooks)
 *    A subscription fica no financialEntriesService que já escuta a tabela
 *    financial_entries — qualquer mudança financeira invalida o caixa.
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { financialEntriesService } from '../services/financialEntriesService';
import { supabase } from '../services/supabase';
import { financialTransactionService } from '../services/financial/financialTransactionService';
import { accountsService } from '../services/accountsService';
import { assetService } from '../services/assetService';
import { cashierService } from '../modules/Cashier/services/cashierService';

/**
 * Relatório do mês atual — dados vêm do SQL (RPC).
 * Invalida automaticamente quando houver mudança em:
 * 1. Entries (obrigações)
 * 2. Transactions (movimentações/caixa)
 * 3. Accounts (saldos/transferências)
 */
export function useCashierCurrentMonth() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CASHIER_CURRENT });
    };

    const unsubEntries = financialEntriesService.subscribeRealtime(invalidate);
    const unsubTx = financialTransactionService.subscribeRealtime(invalidate);
    const unsubAccounts = accountsService.subscribeRealtime(invalidate);
    const unsubAssets = assetService.subscribeRealtime(invalidate);

    // Invalida também em mudanças de Pedidos e Carregamentos (Realtime UI)
    const subOrders = supabase.channel('cashier_orders_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_purchase_orders' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_sales_orders' }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_loadings' }, invalidate)
      .subscribe();

    return () => {
      unsubEntries();
      unsubTx();
      unsubAccounts();
      unsubAssets();
      supabase.removeChannel(subOrders);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: QUERY_KEYS.CASHIER_CURRENT,
    queryFn: () => cashierService.getCurrentMonthReport(),
    staleTime: STALE_TIMES.VOLATILE,
    placeholderData: keepPreviousData,
  });
}

/**
 * Histórico de fechamentos mensais.
 * Invalida quando entries financeiras mudam.
 */
export function useCashierHistory() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsub = financialEntriesService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CASHIER_HISTORY });
    });
    return unsub;
  }, [queryClient]);

  return useQuery({
    queryKey: QUERY_KEYS.CASHIER_HISTORY,
    queryFn: () => cashierService.getHistory(),
    staleTime: STALE_TIMES.MODERATE,
    placeholderData: keepPreviousData,
  });
}
