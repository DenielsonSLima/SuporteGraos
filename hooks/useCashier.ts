/**
 * useCashier.ts
 *
 * Hooks TanStack Query para o módulo Caixa.
 *
 * REFATORADO:
 * ✅ Usa financialRealtimeHub (canal único) em vez de canais individuais
 * ✅ Cache inteligente com staleTime
 * ✅ keepPreviousData — sem piscar ao re-fetchar
 * ✅ Deduplicação automática de requests
 * ✅ Cross-module: mudanças em transfers, accounts, transactions propagam automaticamente
 */

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { cashierService } from '../modules/Cashier/services/cashierService';
import { useFinancialRealtime } from './useFinancialRealtime';

/**
 * Relatório do mês atual — dados vêm do SQL (RPC).
 * Invalida automaticamente quando houver mudança em qualquer tabela financeira.
 */
export function useCashierCurrentMonth() {
  // Canal único financeiro — invalida todos os caches quando qualquer tabela muda
  useFinancialRealtime();

  return useQuery({
    queryKey: QUERY_KEYS.CASHIER_CURRENT,
    queryFn: () => cashierService.getCurrentMonthReport(),
    staleTime: 5000, // ⚡ Dados estáveis por 5s ao abrir a aba (previne flick de refetch imediato)
    placeholderData: keepPreviousData,
  });
}

/**
 * Histórico de fechamentos mensais.
 * Invalida quando qualquer tabela financeira muda.
 */
export function useCashierHistory() {
  // Canal único financeiro
  useFinancialRealtime();

  return useQuery({
    queryKey: QUERY_KEYS.CASHIER_HISTORY,
    queryFn: () => cashierService.getHistory(),
    staleTime: STALE_TIMES.MODERATE,
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook para buscar estatísticas modulares (Compras, Fretes, Despesas, etc.)
 * Atualiza em tempo real via hub financeiro.
 */
export function useCashierModularStats(referenceDate?: string) {
  // Canal único financeiro
  useFinancialRealtime();

  return useQuery({
    queryKey: ['cashier_modular_stats', referenceDate],
    queryFn: () => cashierService.getModularStats(referenceDate),
    staleTime: 5000,
    placeholderData: keepPreviousData,
  });
}
