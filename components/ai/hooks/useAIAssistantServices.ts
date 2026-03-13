
// useAIAssistantServices.ts - ASYNC (Foundation V3)
import { useState, useEffect, useCallback } from 'react';
import { aiContextCache } from '../services/aiContextCache';
import { aiTools, executeToolAction } from '../services/aiToolService';

export function useAIAssistantServices(userName: string) {
  const [contextData, setContextData] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const fetchContext = useCallback(async () => {
    if (!userName || userName === 'Usuário') return;

    setLoading(true);
    try {
      // ✅ Agora aguardamos o contexto assincronamente
      const data = await aiContextCache.getSystemContext(userName);
      setContextData(data || '');
    } catch (err) {
      console.error('[AI Hook] Erro ao carregar contexto:', err);
    } finally {
      setLoading(false);
    }
  }, [userName]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  const invalidateContext = useCallback(async () => {
    aiContextCache.invalidate(userName);
    await fetchContext();
  }, [userName, fetchContext]);

  return {
    contextData,
    loadingContext: loading,
    aiTools,
    executeToolAction,
    invalidateContext
  };
}