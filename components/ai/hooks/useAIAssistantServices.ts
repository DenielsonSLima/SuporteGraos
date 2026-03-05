import { useMemo } from 'react';
import { aiContextCache } from '../services/aiContextCache';
import { aiTools, executeToolAction } from '../services/aiToolService';

export function useAIAssistantServices(userName: string) {
  const contextData = useMemo(() => aiContextCache.getSystemContext(userName), [userName]);

  return {
    contextData,
    aiTools,
    executeToolAction,
    invalidateContext: () => aiContextCache.invalidate(),
  };
}