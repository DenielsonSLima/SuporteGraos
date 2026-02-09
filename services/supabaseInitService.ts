/**
 * SERVIÇO DE INICIALIZAÇÃO SUPABASE - FASE 1 + FASE 2
 * Carrega todos os dados da Fase 1 e Fase 2 em paralelo para máxima performance
 */

import { supabase, getSupabaseSession } from './supabase';
import { transporterService } from './transporterService';
import { vehicleService } from './vehicleService';
import { driverService } from './driverService';

interface InitStats {
  totalTime: number;
  tablesLoaded: number;
  errors: string[];
  data: {
    ufs?: any[];
    cities?: any[];
    partnerTypes?: any[];
    productTypes?: any[];
    bankAccounts?: any[];
    initialBalances?: any[];
    expenseTypes?: any[];
    expenseCategories?: any[];
    costCenters?: any[];
    shareholders?: any[];
    shareholderTransactions?: any[];
    transporters?: any[];
    vehicles?: any[];
    drivers?: any[];
    partners?: any[];
  };
}

type ServiceLoadStatus = 'ok' | 'timeout' | 'error';

interface ServiceLoadMetric {
  name: string;
  durationMs: number;
  status: ServiceLoadStatus;
  error?: string;
}

interface InitDiagnostics {
  startedAt: string;
  phase1Ms?: number;
  criticalMs?: number;
  backgroundMs?: number;
  services: ServiceLoadMetric[];
}

let _isInitialized = false;
let _initPromise: Promise<InitStats> | null = null;
let _initCriticalCompleted = false;
let _initFullCompleted = false;
let _initDiagnostics: InitDiagnostics | null = null;

const CRITICAL_TIMEOUT_MS = 20000;
const BACKGROUND_TIMEOUT_MS = 15000;

const startDiagnostics = () => {
  _initDiagnostics = {
    startedAt: new Date().toISOString(),
    services: []
  };
  if (typeof window !== 'undefined') {
    (window as any).__initDiagnostics = _initDiagnostics;
  }
};

const recordServiceMetric = (metric: ServiceLoadMetric) => {
  if (_initDiagnostics) {
    _initDiagnostics.services.push(metric);
  }
};

const emitInitEvent = (name: string, detail?: any) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
};

const shouldLogDiagnostics = () => {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('diag') === '1';
};

export const getInitDiagnostics = () => _initDiagnostics;

const waitForSupabaseSession = async (maxWaitMs = 3000, intervalMs = 150) => {
  const start = performance.now();
  console.log('[SUPABASE_INIT] ⏳ waitForSupabaseSession() iniciado - maxWait:', maxWaitMs, 'ms');
  
  let session = await getSupabaseSession();
  if (session) {
    console.log('[SUPABASE_INIT] ✅ Sessão encontrada imediatamente!');
    return session;
  }
  
  let attempts = 0;
  while (performance.now() - start < maxWaitMs) {
    attempts++;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
    session = await getSupabaseSession();
    if (session) {
      console.log('[SUPABASE_INIT] ✅ Sessão encontrada após', attempts, 'tentativas,', Math.round(performance.now() - start), 'ms');
      return session;
    }
  }
  
  console.error('[SUPABASE_INIT] ❌ TIMEOUT! Sessão NÃO encontrada após', attempts, 'tentativas,', Math.round(performance.now() - start), 'ms');
  return null;
};

/**
 * Carrega TODOS os dados da Fase 1 + Fase 2 em uma única chamada paralela
 * Muito mais rápido que carregar sequencialmente em cada serviço
 */
export const initializeSupabaseData = async (): Promise<InitStats> => {
  console.log('\\n[SUPABASE_INIT] 🚀 initializeSupabaseData() chamado');
  console.log('[SUPABASE_INIT] ⏱️  Timestamp:', new Date().toISOString());
  
  // ✅ Não iniciar se não estiver autenticado
  console.log('[SUPABASE_INIT] 🔍 Verificando autenticação...');
  const session = await waitForSupabaseSession();
  if (!session) {
    console.log('[SUPABASE_INIT] ❌ Não autenticado - abortando');
    _initPromise = null;
    _isInitialized = false;
    return {
      totalTime: 0,
      tablesLoaded: 0,
      errors: ['Não autenticado: inicialização adiada'],
      data: {}
    };
  }
  console.log('[SUPABASE_INIT] ✅ Sessão válida encontrada');

  // Se já está inicializando, retorna a mesma promise
  if (_initPromise) {
    console.log('[SUPABASE_INIT] ⚡ Inicialização já em andamento - retornando promise existente');
    return _initPromise;
  }

  _initPromise = (async () => {
    const startTime = performance.now();
    startDiagnostics();
    console.log('[SUPABASE_INIT] 📊 Iniciando Promise.allSettled() com 14 tabelas...');
    console.log('[SUPABASE_INIT] ⏱️  Início das queries:', startTime.toFixed(2));

    const stats: InitStats = {
      totalTime: 0,
      tablesLoaded: 0,
      errors: [],
      data: {}
    };

    try {
      // CARREGAMENTO PARALELO - Todas as queries ao mesmo tempo!
      const [
        ufsResult,
        citiesResult,
        partnerTypesResult,
        productTypesResult,
        bankAccountsResult,
        initialBalancesResult,
        expenseTypesResult,
        expenseCategoriesResult,
        shareholdersResult,
        shareholderTransactionsResult,
        transportersResult,
        vehiclesResult,
        driversResult,
        partnersResult
      ] = await Promise.allSettled([
        supabase.from('ufs').select('id, uf, name, code').order('code'),
        supabase.from('cities').select('id, name, uf_id, code').order('name'),
        supabase.from('partner_types').select('id, name, description, is_system').order('name'),
        supabase.from('product_types').select('id, name, description, is_system').order('name'),
        supabase.from('contas_bancarias').select('id, bank_name, owner, agency, account_number, account_type, active').eq('active', true).order('bank_name'),
        supabase.from('initial_balances').select('*').order('date'),
        supabase.from('expense_types').select('*').order('id'),
        supabase.from('expense_categories').select('*').order('expense_type_id, name'),
        supabase.from('shareholders').select('*').order('name'),
        supabase.from('shareholder_transactions').select('*').order('date', { ascending: false }),
        supabase.from('transporters').select('*').order('name'),
        supabase.from('vehicles').select('*').order('plate'),
        supabase.from('drivers').select('*').order('name'),
        supabase.from('partners').select('*').order('name')
      ]);

      // Processar UFs
      if (ufsResult.status === 'fulfilled' && !ufsResult.value.error) {
        stats.data.ufs = ufsResult.value.data || [];
      } else {
        stats.errors.push('UFs: ' + (ufsResult.status === 'rejected' ? ufsResult.reason : (ufsResult.value as any).error?.message));
      }

      // Processar Cities
      if (citiesResult.status === 'fulfilled' && !citiesResult.value.error) {
        stats.data.cities = citiesResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('Cities: ' + (citiesResult.status === 'rejected' ? citiesResult.reason : (citiesResult.value as any).error?.message));
      }

      // Processar Partner Types
      if (partnerTypesResult.status === 'fulfilled' && !partnerTypesResult.value.error) {
        stats.data.partnerTypes = partnerTypesResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('PartnerTypes: ' + (partnerTypesResult.status === 'rejected' ? partnerTypesResult.reason : (partnerTypesResult.value as any).error?.message));
      }

      // Processar Product Types
      if (productTypesResult.status === 'fulfilled' && !productTypesResult.value.error) {
        stats.data.productTypes = productTypesResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('ProductTypes: ' + (productTypesResult.status === 'rejected' ? productTypesResult.reason : (productTypesResult.value as any).error?.message));
      }

      // Processar Bank Accounts
      if (bankAccountsResult.status === 'fulfilled' && !bankAccountsResult.value.error) {
        stats.data.bankAccounts = bankAccountsResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('BankAccounts: ' + (bankAccountsResult.status === 'rejected' ? bankAccountsResult.reason : (bankAccountsResult.value as any).error?.message));
      }

      // Processar Initial Balances
      if (initialBalancesResult.status === 'fulfilled' && !initialBalancesResult.value.error) {
        stats.data.initialBalances = initialBalancesResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('InitialBalances: ' + (initialBalancesResult.status === 'rejected' ? initialBalancesResult.reason : (initialBalancesResult.value as any).error?.message));
      }

      // Processar Expense Types
      if (expenseTypesResult.status === 'fulfilled' && !expenseTypesResult.value.error) {
        stats.data.expenseTypes = expenseTypesResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('ExpenseTypes: ' + (expenseTypesResult.status === 'rejected' ? expenseTypesResult.reason : (expenseTypesResult.value as any).error?.message));
      }

      // Processar Expense Categories
      if (expenseCategoriesResult.status === 'fulfilled' && !expenseCategoriesResult.value.error) {
        stats.data.expenseCategories = expenseCategoriesResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('ExpenseCategories: ' + (expenseCategoriesResult.status === 'rejected' ? expenseCategoriesResult.reason : (expenseCategoriesResult.value as any).error?.message));
      }

      // Processar Shareholders
      if (shareholdersResult.status === 'fulfilled' && !shareholdersResult.value.error) {
        stats.data.shareholders = shareholdersResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('Shareholders: ' + (shareholdersResult.status === 'rejected' ? shareholdersResult.reason : (shareholdersResult.value as any).error?.message));
      }

      // Processar Shareholder Transactions
      if (shareholderTransactionsResult.status === 'fulfilled' && !shareholderTransactionsResult.value.error) {
        stats.data.shareholderTransactions = shareholderTransactionsResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('ShareholderTransactions: ' + (shareholderTransactionsResult.status === 'rejected' ? shareholderTransactionsResult.reason : (shareholderTransactionsResult.value as any).error?.message));
      }

      // ============= FASE 2: PARCEIROS =============

      // Processar Transporters
      if (transportersResult.status === 'fulfilled' && !transportersResult.value.error) {
        stats.data.transporters = transportersResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('Transporters: ' + (transportersResult.status === 'rejected' ? transportersResult.reason : (transportersResult.value as any).error?.message));
      }

      // Processar Vehicles
      if (vehiclesResult.status === 'fulfilled' && !vehiclesResult.value.error) {
        stats.data.vehicles = vehiclesResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('Vehicles: ' + (vehiclesResult.status === 'rejected' ? vehiclesResult.reason : (vehiclesResult.value as any).error?.message));
      }

      // Processar Drivers
      if (driversResult.status === 'fulfilled' && !driversResult.value.error) {
        stats.data.drivers = driversResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('Drivers: ' + (driversResult.status === 'rejected' ? driversResult.reason : (driversResult.value as any).error?.message));
      }

      // Processar Partners
      if (partnersResult.status === 'fulfilled' && !partnersResult.value.error) {
        stats.data.partners = partnersResult.value.data || [];
        stats.tablesLoaded++;

      } else {
        stats.errors.push('Partners: ' + (partnersResult.status === 'rejected' ? partnersResult.reason : (partnersResult.value as any).error?.message));
      }

      const endTime = performance.now();
      stats.totalTime = endTime - startTime;
      if (_initDiagnostics) {
        _initDiagnostics.phase1Ms = Math.round(stats.totalTime);
      }

      _isInitialized = true;
      
      console.log('[SUPABASE_INIT] \\n✅ TODAS AS QUERIES COMPLETADAS!');
      console.log('[SUPABASE_INIT] 📊 Resumo de Carregamento:');
      console.log('[SUPABASE_INIT]   - Tabelas carregadas:', stats.tablesLoaded);
      console.log('[SUPABASE_INIT]   - UFs:', stats.data.ufs?.length || 0);
      console.log('[SUPABASE_INIT]   - Cidades:', stats.data.cities?.length || 0);
      console.log('[SUPABASE_INIT]   - Tipos de Parceiros:', stats.data.partnerTypes?.length || 0);
      console.log('[SUPABASE_INIT]   - Tipos de Produtos:', stats.data.productTypes?.length || 0);
      console.log('[SUPABASE_INIT]   - Contas Bancárias:', stats.data.bankAccounts?.length || 0);
      console.log('[SUPABASE_INIT]   - Parceiros:', stats.data.partners?.length || 0);
      console.log('[SUPABASE_INIT] ⏱️  Tempo total:', stats.totalTime.toFixed(2) + 'ms');

      if (stats.errors.length > 0) {
        console.warn('[SUPABASE_INIT] ⚠️ Erros durante carregamento:');
        stats.errors.forEach((err, i) => console.warn(`[SUPABASE_INIT]   ${i + 1}. ${err}`));
      } else {
        console.log('[SUPABASE_INIT] ✅ Nenhum erro durante carregamento!');
      }

      console.log('[SUPABASE_INIT] _isInitialized = true');
      
      if (stats.errors.length > 0) {
        console.warn('⚠️ Erros durante carregamento:', stats.errors);
      }

    } catch (error) {
      console.error('❌ Erro crítico no carregamento:', error);
      stats.errors.push('Erro crítico: ' + (error as Error).message);
    }

    // ✅ INICIAR REALTIME SUBSCRIPTIONS (dados já foram carregados acima)
    if (stats.tablesLoaded > 0) {
      console.log('[SUPABASE_INIT] � Carregando dados dos services individuais...');
      try {
        // Importar services dinamicamente para evitar circular dependency
        const transporterModule = await import('./transporterService');
        const vehicleModule = await import('./vehicleService');
        const driverModule = await import('./driverService');
        const shareholderModule = await import('./shareholderService');
        const partnerAddressModule = await import('./partnerAddress/index');
        const partnerModule = await import('./partnerService');
        const salesModule = await import('./salesService');
        const assetModule = await import('./assetService');
        const loadingModule = await import('./loadingService');
        const advancesModule = await import('./financial/advancesService');
        const receivablesModule = await import('./financial/receivablesService');
        const payablesModule = await import('./financial/payablesService');
        const transfersModule = await import('./financial/transfersService');
        const loansModule = await import('./financial/loansService');
        const financialHistoryModule = await import('./financial/financialHistoryService');
        const purchaseModule = await import('./purchaseService');
        const standaloneModule = await import('./standaloneRecordsService');
        const auditModule = await import('./auditService');
        const logModule = await import('./logService');
        const settingsModule = await import('./settingsService');
        const bankAccountModule = await import('./bankAccountService');
        const expenseCategoryModule = await import('./expenseCategoryService');
        const initialBalanceModule = await import('./initialBalanceService');
        const classificationModule = await import('./classificationService');
        const locationModule = await import('./locationService');
        
        // 📥 CARREGAR DADOS DE CADA SERVICE (em paralelo) - critico primeiro
        console.log('[SUPABASE_INIT] 📥 Iniciando carga paralela dos services (critico)...');
        const criticalStartTime = performance.now();

        const withTimeout = async <T,>(promise: Promise<T>, serviceName: string, timeoutMs: number): Promise<T | null> => {
          const start = performance.now();
          let status: ServiceLoadStatus = 'ok';
          let errorMessage: string | undefined;
          let timedOut = false;
          let timeoutId: ReturnType<typeof setTimeout> | null = null;

          try {
            const timeoutPromise = new Promise<null>((resolve) => {
              timeoutId = setTimeout(() => {
                timedOut = true;
                console.warn(`[LOAD] TIMEOUT em ${serviceName} (${timeoutMs}ms)`);
                resolve(null);
              }, timeoutMs);
            });

            const result = await Promise.race([
              promise.then((value) => value),
              timeoutPromise
            ]);

            if (timedOut) {
              status = 'timeout';
              return null;
            }

            console.log(`[LOAD] OK ${serviceName}`);
            return result as T;
          } catch (error: any) {
            status = 'error';
            errorMessage = error?.message || String(error);
            console.warn(`[LOAD] ERROR ${serviceName}:`, errorMessage);
            return null;
          } finally {
            if (timeoutId) clearTimeout(timeoutId);
            recordServiceMetric({
              name: serviceName,
              durationMs: Math.round(performance.now() - start),
              status,
              error: errorMessage
            });
          }
        };

        const criticalPromises: Promise<any>[] = [];

        if (typeof partnerModule.partnerService?.loadFromSupabase === 'function') {
          criticalPromises.push(withTimeout(partnerModule.partnerService.loadFromSupabase(), 'partnerService', CRITICAL_TIMEOUT_MS));
        }
        if (typeof purchaseModule.purchaseService?.loadFromSupabase === 'function') {
          criticalPromises.push(withTimeout(purchaseModule.purchaseService.loadFromSupabase(), 'purchaseService', CRITICAL_TIMEOUT_MS));
        }
        if (typeof salesModule.salesService?.loadFromSupabase === 'function') {
          criticalPromises.push(withTimeout(salesModule.salesService.loadFromSupabase(), 'salesService', CRITICAL_TIMEOUT_MS));
        }
        if (typeof loadingModule.loadingService?.loadFromSupabase === 'function') {
          criticalPromises.push(withTimeout(loadingModule.loadingService.loadFromSupabase(), 'loadingService', CRITICAL_TIMEOUT_MS));
        }
        if (typeof payablesModule.payablesService?.loadFromSupabase === 'function') {
          criticalPromises.push(withTimeout(payablesModule.payablesService.loadFromSupabase(), 'payablesService', CRITICAL_TIMEOUT_MS));
        }
        if (typeof receivablesModule.receivablesService?.loadFromSupabase === 'function') {
          criticalPromises.push(withTimeout(receivablesModule.receivablesService.loadFromSupabase(), 'receivablesService', CRITICAL_TIMEOUT_MS));
        }
        if (typeof transfersModule.transfersService?.loadFromSupabase === 'function') {
          criticalPromises.push(withTimeout(transfersModule.transfersService.loadFromSupabase(), 'transfersService', CRITICAL_TIMEOUT_MS));
        }
        if (typeof standaloneModule.standaloneRecordsService?.initialize === 'function') {
          criticalPromises.push(withTimeout(standaloneModule.standaloneRecordsService.initialize(), 'standaloneRecordsService', CRITICAL_TIMEOUT_MS));
        }

        await Promise.allSettled(criticalPromises);
        if (_initDiagnostics) {
          _initDiagnostics.criticalMs = Math.round(performance.now() - criticalStartTime);
        }
        console.log('[SUPABASE_INIT] Services criticos carregados em', (performance.now() - criticalStartTime).toFixed(0), 'ms');

        _initCriticalCompleted = true;
        emitInitEvent('supabase:init:critical', { diagnostics: _initDiagnostics });
        emitInitEvent('supabase:init:complete', { diagnostics: _initDiagnostics });
        emitInitEvent('data:updated');
        if (shouldLogDiagnostics()) {
          console.log('[SUPABASE_INIT] Diagnostics (critico):', _initDiagnostics);
        }

        // Carregar services nao criticos em background
        const runBackgroundLoad = async () => {
          try {
            console.log('[SUPABASE_INIT] Iniciando carga paralela dos services (background)...');
            const backgroundStartTime = performance.now();
            const backgroundPromises: Promise<any>[] = [];

            if (typeof transporterModule.transporterService?.loadFromSupabase === 'function') {
              backgroundPromises.push(withTimeout(transporterModule.transporterService.loadFromSupabase(), 'transporterService', BACKGROUND_TIMEOUT_MS));
            }
            if (typeof vehicleModule.vehicleService?.loadFromSupabase === 'function') {
              backgroundPromises.push(withTimeout(vehicleModule.vehicleService.loadFromSupabase(), 'vehicleService', BACKGROUND_TIMEOUT_MS));
            }
            if (typeof driverModule.driverService?.loadFromSupabase === 'function') {
              backgroundPromises.push(withTimeout(driverModule.driverService.loadFromSupabase(), 'driverService', BACKGROUND_TIMEOUT_MS));
            }
            if (typeof shareholderModule.shareholderService?.loadFromSupabase === 'function') {
              backgroundPromises.push(withTimeout(shareholderModule.shareholderService.loadFromSupabase(), 'shareholderService', BACKGROUND_TIMEOUT_MS));
            }
            if (typeof partnerAddressModule.partnerAddressService?.loadFromSupabase === 'function') {
              backgroundPromises.push(withTimeout(partnerAddressModule.partnerAddressService.loadFromSupabase(), 'partnerAddressService', BACKGROUND_TIMEOUT_MS));
            }
            if (typeof assetModule.assetService?.loadFromSupabase === 'function') {
              backgroundPromises.push(withTimeout(assetModule.assetService.loadFromSupabase(), 'assetService', BACKGROUND_TIMEOUT_MS));
            }
            if (typeof advancesModule.advancesService?.loadFromSupabase === 'function') {
              backgroundPromises.push(withTimeout(advancesModule.advancesService.loadFromSupabase(), 'advancesService', BACKGROUND_TIMEOUT_MS));
            }
            if (typeof loansModule.loansService?.loadFromSupabase === 'function') {
              backgroundPromises.push(withTimeout(loansModule.loansService.loadFromSupabase(), 'loansService', BACKGROUND_TIMEOUT_MS));
            }
            if (typeof financialHistoryModule.financialHistoryService?.loadFromSupabase === 'function') {
              backgroundPromises.push(withTimeout(financialHistoryModule.financialHistoryService.loadFromSupabase(), 'financialHistoryService', BACKGROUND_TIMEOUT_MS));
            }
            if (typeof settingsModule.settingsService?.loadFromSupabase === 'function') {
              backgroundPromises.push(withTimeout(settingsModule.settingsService.loadFromSupabase(), 'settingsService', BACKGROUND_TIMEOUT_MS));
            }
            if (typeof bankAccountModule.bankAccountService?.loadFromSupabase === 'function') {
              backgroundPromises.push(withTimeout(bankAccountModule.bankAccountService.loadFromSupabase(), 'bankAccountService', BACKGROUND_TIMEOUT_MS));
            }
            if (typeof initialBalanceModule.initialBalanceService?.loadFromSupabase === 'function') {
              backgroundPromises.push(withTimeout(initialBalanceModule.initialBalanceService.loadFromSupabase(), 'initialBalanceService', BACKGROUND_TIMEOUT_MS));
            }
            if (typeof expenseCategoryModule.expenseCategoryService?.loadFromSupabase === 'function') {
              backgroundPromises.push(withTimeout(expenseCategoryModule.expenseCategoryService.loadFromSupabase(), 'expenseCategoryService', BACKGROUND_TIMEOUT_MS));
            }
            if (typeof classificationModule.classificationService?.loadFromSupabase === 'function') {
              backgroundPromises.push(withTimeout(classificationModule.classificationService.loadFromSupabase(), 'classificationService', BACKGROUND_TIMEOUT_MS));
            }
            if (typeof locationModule.locationService?.loadFromSupabase === 'function') {
              backgroundPromises.push(withTimeout(locationModule.locationService.loadFromSupabase(), 'locationService', BACKGROUND_TIMEOUT_MS));
            }

            await Promise.allSettled(backgroundPromises);
            if (_initDiagnostics) {
              _initDiagnostics.backgroundMs = Math.round(performance.now() - backgroundStartTime);
            }
            console.log('[SUPABASE_INIT] Services background carregados em', (performance.now() - backgroundStartTime).toFixed(0), 'ms');

            // 🔄 Iniciar subscriptions em tempo real
            console.log('[SUPABASE_INIT] Iniciando Realtime Subscriptions...');
            const startServiceRealtime = (moduleRef: any, serviceKey?: string) => {
              const target = serviceKey ? moduleRef?.[serviceKey] : moduleRef;
              if (typeof target?.startRealtime === 'function') {
                target.startRealtime();
              }
            };

            startServiceRealtime(transporterModule, 'transporterService');
            startServiceRealtime(vehicleModule, 'vehicleService');
            startServiceRealtime(driverModule, 'driverService');
            startServiceRealtime(shareholderModule, 'shareholderService');
            startServiceRealtime(partnerAddressModule, 'partnerAddressService');
            startServiceRealtime(partnerModule, 'partnerService');
            startServiceRealtime(salesModule, 'salesService');
            startServiceRealtime(assetModule, 'assetService');
            startServiceRealtime(loadingModule, 'loadingService');
            startServiceRealtime(advancesModule, 'advancesService');
            startServiceRealtime(receivablesModule, 'receivablesService');
            startServiceRealtime(payablesModule, 'payablesService');
            startServiceRealtime(transfersModule, 'transfersService');
            startServiceRealtime(loansModule, 'loansService');
            startServiceRealtime(financialHistoryModule, 'financialHistoryService');
            startServiceRealtime(purchaseModule, 'purchaseService');
            if (typeof auditModule.auditService?.startRealtime === 'function') auditModule.auditService.startRealtime();
            if (typeof logModule.logService?.startRealtime === 'function') logModule.logService.startRealtime();
            if (typeof settingsModule.settingsService?.startRealtime === 'function') settingsModule.settingsService.startRealtime();
            if (typeof bankAccountModule.bankAccountService?.startRealtime === 'function') bankAccountModule.bankAccountService.startRealtime();
            if (typeof initialBalanceModule.initialBalanceService?.startRealtime === 'function') initialBalanceModule.initialBalanceService.startRealtime();
            if (typeof locationModule.locationService?.startRealtime === 'function') locationModule.locationService.startRealtime();

            console.log('[SUPABASE_INIT] Realtime Subscriptions iniciadas');

            console.log('[SUPABASE_INIT] Disparando evento global: supabase:init:full');
            _initFullCompleted = true;
            emitInitEvent('supabase:init:full', { diagnostics: _initDiagnostics });
            emitInitEvent('data:updated');
            if (shouldLogDiagnostics()) {
              console.log('[SUPABASE_INIT] Diagnostics (full):', _initDiagnostics);
            }
          } catch (error) {
            console.warn('[SUPABASE_INIT] Erro na carga background:', error);
          }
        };

        void runBackgroundLoad();
      } catch (realtimeError) {
        console.warn('[SUPABASE_INIT] ⚠️ Erro ao iniciar realtime:', realtimeError);
      }
    }

    return stats;
  })();

  return _initPromise;
};

/**
 * Verifica se já foi inicializado
 */
export const isSupabaseInitialized = () => _isInitialized;

/**
 * Verifica se o evento de inicialização foi disparado (para evitar race condition)
 */
export const isSupabaseInitCompleted = () => _initCriticalCompleted;
export const isSupabaseFullInitCompleted = () => _initFullCompleted;

/**
 * Força reinicialização (útil para refresh)
 */
export const resetSupabaseInit = () => {
  _isInitialized = false;
  _initPromise = null;
  _initCriticalCompleted = false;
  _initFullCompleted = false;
  _initDiagnostics = null;
};

/**
 * Aguarda inicialização se necessário
 */
export const waitForInit = async (): Promise<InitStats> => {
  // ✅ VERIFICAR AUTENTICAÇÃO ANTES de tentar inicializar
  const session = await waitForSupabaseSession();
  if (!session) {
    console.log('[SUPABASE_INIT] ⚠️ waitForInit() - Sem autenticação, retornando vazio');
    return {
      totalTime: 0,
      tablesLoaded: 0,
      errors: ['Não autenticado'],
      data: {}
    };
  }
  
  if (_isInitialized && _initPromise) {
    return _initPromise;
  }
  return initializeSupabaseData();
};
