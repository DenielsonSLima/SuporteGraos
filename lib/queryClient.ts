import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dados frescos por 1 min por padrão (hooks individuais sobrescrevem)
      staleTime: 60_000,
      // Garbage collect após 10 min sem uso (libera memória)
      gcTime: 10 * 60 * 1000,
      // Não refetch automático na janela — Realtime + useRealtimeResilience cobrem
      refetchOnWindowFocus: false,
      // Reconexão de rede: refetcha queries stale automaticamente
      refetchOnReconnect: 'always',
      // 1 retry com backoff exponencial
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});
