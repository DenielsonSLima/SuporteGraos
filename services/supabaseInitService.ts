/**
 * SERVIÇO DE INICIALIZAÇÃO SUPABASE - ORCHESTRATOR
 */

import { supabase, getSupabaseSession } from './supabase';
import { isSqlCanonicalOpsEnabled } from './sqlCanonicalOps';

// Modular components
import { InitStats } from './init/initTypes';
import { initDiagnostics } from './init/initDiagnostics';
import { loadLegacyData } from './init/initLegacy';

let _isInitialized = false;
let _initPromise: Promise<InitStats> | null = null;

const waitForSupabaseSession = async (maxWaitMs = 3000, intervalMs = 150) => {
  const start = performance.now();
  let session = await getSupabaseSession();
  if (session) return session;

  while (performance.now() - start < maxWaitMs) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));
    session = await getSupabaseSession();
    if (session) return session;
  }
  return null;
};

const emitInitEvent = initDiagnostics.emitEvent;

export const initializeSupabaseData = async (): Promise<InitStats> => {
  const session = await waitForSupabaseSession();
  if (!session) {
    _initPromise = null;
    _isInitialized = false;
    return { totalTime: 0, tablesLoaded: 0, errors: ['Não autenticado'], data: {} };
  }

  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const startTime = performance.now();
    initDiagnostics.start();
    const stats: InitStats = { totalTime: 0, tablesLoaded: 0, errors: [], data: {} };

    try {
      const canonicalOpsEnabled = isSqlCanonicalOpsEnabled();

      if (canonicalOpsEnabled) {
        // MODO CANÔNICO: Carregamento seletivo via SQL-first
        const results = await Promise.allSettled([
          supabase.from('states').select('id, uf, name').order('uf'),
          supabase.from('cities').select('id, name, state_id').order('name'),
          supabase.from('partner_types').select('id, name').order('name'),
          supabase.from('product_types').select('id, name').order('name'),
          supabase.from('accounts').select('*').eq('is_active', true)
        ]);
        
        // TODO: Processar resultados do modo canônico se necessário
        stats.tablesLoaded = results.filter(r => r.status === 'fulfilled').length;

        const [settingsModule, loadingModule] = await Promise.all([
          import('./settingsService'),
          import('./loadingService')
        ]);
        await Promise.all([
          settingsModule.settingsService.loadFromSupabase(),
          loadingModule.loadingService.loadFromSupabase()
        ]);
        settingsModule.settingsService.startRealtime();
        loadingModule.loadingService.startRealtime();

        initDiagnostics.setCriticalCompleted(true);
        initDiagnostics.setFullCompleted(true);
        emitInitEvent('supabase:init:full', { diagnostics: initDiagnostics.get() });
      } else {
        // MODO LEGACY: Delegar para módulo especializado (500+ linhas extraídas)
        await loadLegacyData(stats);
      }

      initDiagnostics.setPhase1Time(performance.now() - startTime);
      _isInitialized = true;
    } catch (error) {
      stats.errors.push('Erro crítico: ' + (error as Error).message);
    }

    stats.totalTime = performance.now() - startTime;
    return stats;
  })();

  return _initPromise;
};

export const isSupabaseInitialized = () => _isInitialized;
export const isSupabaseInitCompleted = () => initDiagnostics.isCriticalCompleted();
export const isSupabaseFullInitCompleted = () => initDiagnostics.isFullCompleted();
export const getInitDiagnostics = () => initDiagnostics.get();
export const resetSupabaseInit = () => {
  _isInitialized = false;
  _initPromise = null;
  initDiagnostics.setCriticalCompleted(false);
  initDiagnostics.setFullCompleted(false);
};

export const waitForInit = async (): Promise<InitStats> => {
  const session = await waitForSupabaseSession();
  if (!session) return { totalTime: 0, tablesLoaded: 0, errors: ['Não autenticado'], data: {} };
  return initializeSupabaseData();
};

export { stopAllRealtime } from './supabaseRealtimeCleanup';
