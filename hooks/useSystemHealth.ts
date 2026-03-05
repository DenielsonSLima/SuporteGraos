import { useCallback } from 'react';
import { systemHealthService } from '../services/systemHealthService';

export function useSystemHealth() {
  const checkSupabaseDatabase = useCallback(async () => {
    return systemHealthService.checkSupabaseDatabase();
  }, []);

  const checkSupabaseRealtime = useCallback(async () => {
    return systemHealthService.checkSupabaseRealtime();
  }, []);

  return {
    checkSupabaseDatabase,
    checkSupabaseRealtime,
  };
}
