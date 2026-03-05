import { useCallback, useMemo } from 'react';
import { authService } from '../services/authService';
import { auditService } from '../services/auditService';
import { initializeSupabaseData, resetSupabaseInit } from '../services/supabaseInitService';
import { dashboardService } from '../modules/Dashboard/services/dashboardService';

const INIT_BLOCKING_WINDOW_MS = 2500;

const withTimeout = async (promise: Promise<any>, timeoutMs: number) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<'timeout'>((resolve) => {
    timeoutId = setTimeout(() => resolve('timeout'), timeoutMs);
  });

  const result = await Promise.race([promise.then(() => 'ok' as const), timeoutPromise]);
  if (timeoutId) clearTimeout(timeoutId);
  return result;
};

export function useAppSessionServices() {
  const prefetchDashboard = useCallback(() => {
    setTimeout(() => {
      dashboardService.prefetchDashboardData();
    }, 0);
  }, []);

  const restoreSession = useCallback(async () => {
    return authService.restoreSession();
  }, []);

  const initializeDataInBackground = useCallback(async () => {
    const initPromise = initializeSupabaseData();
    const initResult = await withTimeout(initPromise, INIT_BLOCKING_WINDOW_MS);
    if (initResult === 'timeout') {
      void initPromise.catch((error) => {
        console.error('[APP] Inicialização em background falhou:', error);
      });
    }
  }, []);

  const initializeDataAfterLogin = useCallback(async () => {
    const initPromise = initializeSupabaseData();
    const initResult = await withTimeout(initPromise, INIT_BLOCKING_WINDOW_MS);
    if (initResult === 'timeout') {
      void initPromise.catch((error) => {
        console.error('[APP] Inicialização em background falhou:', error);
      });
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
  }, []);

  const resetInit = useCallback(() => {
    resetSupabaseInit();
  }, []);

  const getCurrentSessionId = useCallback(() => authService.getCurrentSessionId(), []);
  const heartbeatSession = useCallback((sessionId: string) => auditService.heartbeatSession(sessionId), []);
  const closeStaleSessions = useCallback((minutes: number) => auditService.closeStaleSessions(minutes), []);

  return useMemo(() => ({
    prefetchDashboard,
    restoreSession,
    initializeDataInBackground,
    initializeDataAfterLogin,
    logout,
    resetInit,
    getCurrentSessionId,
    heartbeatSession,
    closeStaleSessions,
  }), [
    prefetchDashboard,
    restoreSession,
    initializeDataInBackground,
    initializeDataAfterLogin,
    logout,
    resetInit,
    getCurrentSessionId,
    heartbeatSession,
    closeStaleSessions,
  ]);
}