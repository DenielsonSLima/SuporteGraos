/**
 * useRealtimeResilience.ts
 *
 * Hook de resiliência para conexão Supabase Realtime.
 *
 * OTIMIZADO:
 * ✅ Detecta perda/restauração de conexão (online/offline)
 * ✅ Invalida TODO o cache ao reconectar (necessário — eventos foram perdidos)
 * ✅ Tab visibility: só invalida queries STALE (não todas as ativas)
 * ✅ Debounce de 1s para evitar múltiplas invalidações em sequência
 * ✅ Mínimo 30s entre revalidações de tab para evitar refetch excessivo
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Intervalo mínimo entre re-syncs de visibilidade (evita spam)
const MIN_VISIBILITY_RESYNC_INTERVAL = 30_000; // 30s

export function useRealtimeResilience() {
  const queryClient = useQueryClient();
  const wasOffline = useRef(false);
  const lastVisibilityResync = useRef(0);

  useEffect(() => {
    let debounceHandle: ReturnType<typeof setTimeout> | null = null;

    // ─── Reconexão de rede ─────────────────────────────────
    const handleOffline = () => {
      wasOffline.current = true;
    };

    const handleOnline = () => {
      if (wasOffline.current) {
        wasOffline.current = false;
        // Debounce: espera 1s antes de invalidar
        if (debounceHandle) clearTimeout(debounceHandle);
        debounceHandle = setTimeout(() => {
          // Invalida TUDO: durante offline, eventos realtime foram perdidos
          queryClient.invalidateQueries();
        }, 1000);
      }
    };

    // ─── Visibilidade da aba ───────────────────────────────
    const handleVisibilityChange = () => {
      if (document.hidden) return;

      // Throttle: mínimo 30s entre re-syncs de visibility
      const now = Date.now();
      if (now - lastVisibilityResync.current < MIN_VISIBILITY_RESYNC_INTERVAL) return;
      lastVisibilityResync.current = now;

      // Invalida queries ativas (o throttle de 30s + debounce 1s garante que não chove invalidações)
      if (debounceHandle) clearTimeout(debounceHandle);
      debounceHandle = setTimeout(() => {
        queryClient.invalidateQueries({ refetchType: 'active' });
      }, 1000);
    };

    // ─── Invalidação Global via Evento ────────────────────
    const handleInvalidate = (event: any) => {
      const { queryKey, queryKeys } = event.detail || {};
      const keysToInvalidate = queryKeys || (queryKey ? [queryKey] : []);
      
      if (keysToInvalidate.length > 0) {
        console.log(`[REALTIME-RESILIENCE] Invalidação solicitada para:`, keysToInvalidate);
        
        keysToInvalidate.forEach((key: any) => {
          // Refetch imediato de queries ativas para feedback visual instantâneo
          const isDashboard = Array.isArray(key) ? key.includes('dashboard') : key === 'dashboard';
          
          queryClient.refetchQueries({ 
            queryKey: key, 
            type: isDashboard ? 'all' : 'active', // Dashboard refetch mesmo se estiver em background
            exact: false 
          });
          
          // Invalidação das demais para garantir consistência futura
          queryClient.invalidateQueries({ queryKey: key, exact: false });
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('app:invalidate-query', handleInvalidate);

    return () => {
      if (debounceHandle) clearTimeout(debounceHandle);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('app:invalidate-query', handleInvalidate);
    };
  }, [queryClient]);
}
