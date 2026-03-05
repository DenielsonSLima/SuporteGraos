/**
 * useAssets.ts
 *
 * Hook TanStack Query para Patrimônio (Bens).
 * ✅ Cache + SWR (Stale-While-Revalidate)
 * ✅ Realtime: invalida automaticamente quando qualquer ativo muda no banco
 * ✅ useMutation: add, update, delete — sem chamar serviço direto no componente
 * ✅ Zero lógica de negócio no componente — frontend só exibe
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { assetService } from '../services/assetService';
import { Asset } from '../modules/Assets/types';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { supabase } from '../services/supabase';

// ─── Canal realtime singleton para a tabela assets ───────────────────────────
const _assetListeners = new Set<() => void>();
let _assetChannel: ReturnType<typeof supabase.channel> | null = null;

function ensureAssetChannel() {
  if (_assetChannel) return;
  _assetChannel = supabase
    .channel('realtime:assets:hook')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () =>
      _assetListeners.forEach((cb) => cb()),
    )
    .subscribe();
}

function subscribeToAssetRealtime(onInvalidate: () => void): () => void {
  _assetListeners.add(onInvalidate);
  ensureAssetChannel();
  return () => {
    _assetListeners.delete(onInvalidate);
    if (_assetListeners.size === 0 && _assetChannel) {
      supabase.removeChannel(_assetChannel);
      _assetChannel = null;
    }
  };
}

// ─── Hook principal — leitura ─────────────────────────────────────────────────

export function useAssets() {
  const queryClient = useQueryClient();

  // Realtime: invalida cache quando qualquer ativo muda no banco
  useEffect(() => {
    const unsub = subscribeToAssetRealtime(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ASSETS });
    });
    return unsub;
  }, [queryClient]);

  return useQuery<Asset[]>({
    queryKey: QUERY_KEYS.ASSETS,
    queryFn: async () => {
      // Força reload do serviço (reseta flag isLoaded) para buscar dados frescos
      await assetService.reload();
      return assetService.getAll();
    },
    staleTime: STALE_TIMES.MODERATE,    // 2 min — dados de patrimônio não são voláteis
    placeholderData: keepPreviousData,
  });
}

// ─── Mutações ─────────────────────────────────────────────────────────────────

export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (asset: Asset) => {
      assetService.add(asset);
      // Retorno síncrono pois o serviço persiste async internamente
      return Promise.resolve(asset);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ASSETS });
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (asset: Asset) => {
      assetService.update(asset);
      return Promise.resolve(asset);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ASSETS });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assetId: string) => {
      assetService.delete(assetId);
      return Promise.resolve(assetId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ASSETS });
    },
  });
}
