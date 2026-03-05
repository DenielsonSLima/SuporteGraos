/**
 * useLoadingMutations.ts
 *
 * Mutations TanStack Query para operações de escrita em carregamentos.
 * Centraliza loadingService.update() + loadingService.delete() + invalidação de cache.
 *
 * ✅ useMutation com invalidação automática (LOADINGS key)
 * ✅ Dispara eventos globais (financial:updated, data:updated) para realtime interno
 * ✅ Elimina chamadas diretas a loadingService.update/delete + invalidateLoadingCache
 *    de LoadingManagement (5 handlers) e LoadingFinancialTab (4 handlers)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from './queryKeys';
import { loadingService } from '../services/loadingService';
import { Loading } from '../modules/Loadings/types';

/** Dispara eventos globais para módulos que ainda usam CustomEvent */
function dispatchGlobalEvents(detail?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('data:updated', { detail }));
  window.dispatchEvent(new CustomEvent('financial:updated'));
}

/**
 * Mutation para atualizar um carregamento.
 * Invalida cache TanStack + loadingCache legacy.
 */
export function useUpdateLoading() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (loading: Loading) => { loadingService.update(loading); },
    onSuccess: (_result, loading) => {
      // ✅ SKIL Gap 7: LoadingCache removido — TanStack Query é a fonte canônica de cache
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOADINGS });
      dispatchGlobalEvents({ type: 'loading_updated', loadingId: loading.id });
    },
  });
}

/**
 * Mutation para deletar um carregamento.
 * Invalida cache TanStack (LoadingCache legacy removido — Gap 7).
 */
export function useDeleteLoading() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (loadingId: string) => { await loadingService.delete(loadingId); },
    onSuccess: (_result, loadingId) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOADINGS });
      dispatchGlobalEvents({ type: 'loading_deleted', loadingId });
    },
  });
}

/**
 * Mutation para salvar transação (pagamento/adiantamento) no carregamento.
 * Atualiza o loading com a nova transação e invalida caches.
 */
export function useSaveLoadingTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (loading: Loading) => { loadingService.update(loading); },
    onSuccess: (_result, loading) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LOADINGS });
      dispatchGlobalEvents({ type: 'freight_payment', loadingId: loading.id });
    },
  });
}
