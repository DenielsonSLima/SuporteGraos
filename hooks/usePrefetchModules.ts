/**
 * usePrefetchModules.ts
 *
 * Prefetching estratégico de dados de módulos adjacentes.
 * Antecipa a navegação do usuário pré-carregando dados em background.
 *
 * ✅ Pré-carrega módulos mais visitados a partir do Dashboard
 * ✅ Prefetch baseado no módulo ativo (adjacência)
 * ✅ Usa queryClient.prefetchQuery — não bloqueia a UI
 * ✅ Respeita staleTime — não refetcha dados frescos
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { ModuleId } from '../types';

// Lazy imports para os services (não importa se o módulo não está montado)
const prefetchMap: Record<string, () => Promise<void>> = {};

/**
 * Executa prefetch de dados para módulos adjacentes ao módulo ativo.
 * Chamado uma vez após o módulo ativo renderizar com sucesso.
 */
export function usePrefetchModules(activeModule: ModuleId) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Delay para não competir com o carregamento do módulo ativo
    const timer = setTimeout(() => {
      switch (activeModule) {
        case ModuleId.HOME:
          // Dashboard: pré-carregar Financeiro + Caixa + Performance (mais acessados)
          void queryClient.prefetchQuery({
            queryKey: QUERY_KEYS.FINANCIAL_PAYABLES,
            queryFn: async () => {
              const { financialEntriesService } = await import('../services/financialEntriesService');
              return financialEntriesService.getPayables();
            },
            staleTime: STALE_TIMES.DYNAMIC,
          });
          void queryClient.prefetchQuery({
            queryKey: QUERY_KEYS.FINANCIAL_RECEIVABLES,
            queryFn: async () => {
              const { financialEntriesService } = await import('../services/financialEntriesService');
              return financialEntriesService.getReceivables();
            },
            staleTime: STALE_TIMES.DYNAMIC,
          });
          void queryClient.prefetchQuery({
            queryKey: QUERY_KEYS.ACCOUNTS,
            queryFn: async () => {
              const { accountsService } = await import('../services/accountsService');
              return accountsService.getAll();
            },
            staleTime: STALE_TIMES.REFERENCE,
          });
          break;

        case ModuleId.PURCHASE_ORDER:
          // Pedido de Compra → pré-carregar Logística
          void queryClient.prefetchQuery({
            queryKey: QUERY_KEYS.LOADINGS,
            queryFn: async () => {
              const { loadingService } = await import('../services/loadingService');
              return loadingService.getAll();
            },
            staleTime: STALE_TIMES.DYNAMIC,
          });
          break;

        case ModuleId.LOGISTICS:
          // Logística → pré-carregar Performance
          void queryClient.prefetchQuery({
            queryKey: QUERY_KEYS.PERFORMANCE(6),
            queryFn: async () => {
              const { performanceService } = await import('../modules/Performance/services/performanceService');
              return performanceService.getReport(6);
            },
            staleTime: STALE_TIMES.MODERATE,
          });
          break;

        case ModuleId.FINANCIAL:
          // Financeiro → pré-carregar Caixa
          void queryClient.prefetchQuery({
            queryKey: QUERY_KEYS.CASHIER_CURRENT,
            queryFn: async () => {
              const { cashierService } = await import('../modules/Cashier/services/cashierService');
              return cashierService.getCurrentMonthReport();
            },
            staleTime: STALE_TIMES.VOLATILE,
          });
          break;
      }
    }, 500); // 500ms após render do módulo

    return () => clearTimeout(timer);
  }, [activeModule, queryClient]);
}
