/**
 * SERVIÇO DE INICIALIZAÇÃO SUPABASE - FASE 1 + FASE 2
 * Carrega todos os dados da Fase 1 e Fase 2 em paralelo para máxima performance
 */

import { supabase, getSupabaseSession } from './supabase';
import { transporterService } from './transporterService';
import { vehicleService } from './vehicleService';
import { driverService } from './driverService';
import { isSqlCanonicalOpsEnabled } from './sqlCanonicalOps';

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

  let session = await getSupabaseSession();
  if (session) {
    return session;
  }

  let attempts = 0;
  while (performance.now() - start < maxWaitMs) {
    attempts++;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
    session = await getSupabaseSession();
    if (session) {
      return session;
    }
  }

  return null;
};

/**
 * Carrega TODOS os dados da Fase 1 + Fase 2 em uma única chamada paralela
 * Muito mais rápido que carregar sequencialmente em cada serviço
 */
export const initializeSupabaseData = async (): Promise<InitStats> => {
  const canonicalOpsEnabled = isSqlCanonicalOpsEnabled();

  // ✅ Não iniciar se não estiver autenticado
  const session = await waitForSupabaseSession();
  if (!session) {
    _initPromise = null;
    _isInitialized = false;
    return {
      totalTime: 0,
      tablesLoaded: 0,
      errors: ['Não autenticado: inicialização adiada'],
      data: {}
    };
  }

  // Se já está inicializando, retorna a mesma promise
  if (_initPromise) {
    return _initPromise;
  }

  _initPromise = (async () => {
    const startTime = performance.now();
    startDiagnostics();

    const stats: InitStats = {
      totalTime: 0,
      tablesLoaded: 0,
      errors: [],
      data: {}
    };

    try {
      const user = await import('./authService').then(m => m.authService.getCurrentUser());
      const companyId = user?.companyId;

      if (canonicalOpsEnabled) {
        const [
          statesResult,
          citiesResult,
          partnerTypesResult,
          productTypesResult,
          accountsResult,
          initialBalancesResult,
          expenseCategoriesResult,
          shareholdersResult,
          shareholderTransactionsResult,
          parceirosResult
        ] = await Promise.allSettled([
          supabase.from('states').select('id, uf, name').order('uf'),
          supabase.from('cities').select('id, name, state_id').order('name'),
          supabase.from('partner_types').select('id, name, description, is_system').order('name'),
          supabase.from('product_types').select('id, name, description, is_system').order('name'),
          supabase.from('accounts').select('id, account_name, balance, is_active').eq('is_active', true).order('account_name'),
          supabase.from('initial_balances').select('*').order('date'),
          supabase.from('expense_categories').select('*').order('name'),
          supabase.from('shareholders').select('*').order('name'),
          supabase.from('shareholder_transactions').select('*').order('date', { ascending: false }),
          supabase.from('parceiros_parceiros').select('id, name, active, partner_type_id').order('name')
        ]);

        if (statesResult.status === 'fulfilled' && !statesResult.value.error) {
          stats.data.ufs = statesResult.value.data || [];
          stats.tablesLoaded++;
        } else {
          stats.errors.push('States: ' + (statesResult.status === 'rejected' ? statesResult.reason : (statesResult.value as any).error?.message));
        }

        if (citiesResult.status === 'fulfilled' && !citiesResult.value.error) {
          stats.data.cities = citiesResult.value.data || [];
          stats.tablesLoaded++;
        } else {
          stats.errors.push('Cities: ' + (citiesResult.status === 'rejected' ? citiesResult.reason : (citiesResult.value as any).error?.message));
        }

        if (partnerTypesResult.status === 'fulfilled' && !partnerTypesResult.value.error) {
          stats.data.partnerTypes = partnerTypesResult.value.data || [];
          stats.tablesLoaded++;
        } else {
          stats.errors.push('PartnerTypes: ' + (partnerTypesResult.status === 'rejected' ? partnerTypesResult.reason : (partnerTypesResult.value as any).error?.message));
        }

        if (productTypesResult.status === 'fulfilled' && !productTypesResult.value.error) {
          stats.data.productTypes = productTypesResult.value.data || [];
          stats.tablesLoaded++;
        } else {
          stats.errors.push('ProductTypes: ' + (productTypesResult.status === 'rejected' ? productTypesResult.reason : (productTypesResult.value as any).error?.message));
        }

        if (accountsResult.status === 'fulfilled' && !accountsResult.value.error) {
          stats.data.bankAccounts = accountsResult.value.data || [];
          stats.tablesLoaded++;
        } else {
          stats.errors.push('Accounts: ' + (accountsResult.status === 'rejected' ? accountsResult.reason : (accountsResult.value as any).error?.message));
        }

        if (initialBalancesResult.status === 'fulfilled' && !initialBalancesResult.value.error) {
          stats.data.initialBalances = initialBalancesResult.value.data || [];
          stats.tablesLoaded++;
        } else {
          stats.errors.push('InitialBalances: ' + (initialBalancesResult.status === 'rejected' ? initialBalancesResult.reason : (initialBalancesResult.value as any).error?.message));
        }

        if (expenseCategoriesResult.status === 'fulfilled' && !expenseCategoriesResult.value.error) {
          stats.data.expenseCategories = expenseCategoriesResult.value.data || [];
          stats.tablesLoaded++;
        } else {
          stats.errors.push('ExpenseCategories: ' + (expenseCategoriesResult.status === 'rejected' ? expenseCategoriesResult.reason : (expenseCategoriesResult.value as any).error?.message));
        }

        if (shareholdersResult.status === 'fulfilled' && !shareholdersResult.value.error) {
          stats.data.shareholders = shareholdersResult.value.data || [];
          stats.tablesLoaded++;
        } else {
          stats.errors.push('Shareholders: ' + (shareholdersResult.status === 'rejected' ? shareholdersResult.reason : (shareholdersResult.value as any).error?.message));
        }

        if (shareholderTransactionsResult.status === 'fulfilled' && !shareholderTransactionsResult.value.error) {
          stats.data.shareholderTransactions = shareholderTransactionsResult.value.data || [];
          stats.tablesLoaded++;
        } else {
          stats.errors.push('ShareholderTransactions: ' + (shareholderTransactionsResult.status === 'rejected' ? shareholderTransactionsResult.reason : (shareholderTransactionsResult.value as any).error?.message));
        }

        if (parceirosResult.status === 'fulfilled' && !parceirosResult.value.error) {
          stats.data.partners = parceirosResult.value.data || [];
          stats.tablesLoaded++;
        } else {
          stats.errors.push('Parceiros: ' + (parceirosResult.status === 'rejected' ? parceirosResult.reason : (parceirosResult.value as any).error?.message));
        }
      } else {
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
          supabase.from('contas_bancarias').select('id, bank_name, owner, agency, account_number, account_type, active, current_balance, initial_balance, allows_negative_balance').eq('active', true).order('bank_name'),
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
      }

      const endTime = performance.now();
      stats.totalTime = endTime - startTime;
      if (_initDiagnostics) {
        _initDiagnostics.phase1Ms = Math.round(stats.totalTime);
      }

      _isInitialized = true;




    } catch (error) {
      stats.errors.push('Erro crítico: ' + (error as Error).message);
    }

    // ✅ INICIAR REALTIME SUBSCRIPTIONS (dados já foram carregados acima)
    if (stats.tablesLoaded > 0) {
      if (canonicalOpsEnabled) {
        _initCriticalCompleted = true;
        _initFullCompleted = true;
        emitInitEvent('supabase:init:critical', { diagnostics: _initDiagnostics });
        emitInitEvent('supabase:init:complete', { diagnostics: _initDiagnostics });
        emitInitEvent('supabase:init:full', { diagnostics: _initDiagnostics });
        emitInitEvent('data:updated');
      } else {
      try {
        // Importar services dinamicamente em PARALELO para máxima performance
        const [
          transporterModule,
          vehicleModule,
          driverModule,
          shareholderModule,
          partnerAddressModule,
          partnerModule,
          salesModule,
          assetModule,
          loadingModule,
          advancesModule,
          receivablesModule,
          payablesModule,
          transfersModule,
          loansModule,
          financialHistoryModule,
          purchaseModule,
          standaloneModule,
          auditModule,
          logModule,
          settingsModule,
          bankAccountModule,
          expenseCategoryModule,
          initialBalanceModule,
          classificationModule,
          locationModule,
          reconciliationModule,
          payablesReconciliationModule,
          creditModule,
          loginScreenModule,
          reportAuditModule,
          // loanServiceModule removido — consolidado no loansService canônico
          ledgerModule,
          financialTransactionModule,
        ] = await Promise.all([
          import('./transporterService'),
          import('./vehicleService'),
          import('./driverService'),
          import('./shareholderService'),
          import('./partnerAddress/index'),
          import('./partnerService'),
          import('./salesService'),
          import('./assetService'),
          import('./loadingService'),
          import('./financial/advancesService'),
          import('./financial/receivablesService'),
          import('./financial/payablesService'),
          import('./financial/transfersService'),
          import('./financial/loansService'),
          import('./financial/financialHistoryService'),
          import('./purchaseService'),
          import('./standaloneRecordsService'),
          import('./auditService'),
          import('./logService'),
          import('./settingsService'),
          import('./bankAccountService'),
          import('./expenseCategoryService'),
          import('./initialBalanceService'),
          import('./classificationService'),
          import('./locationService'),
          import('./receivablesReconciliationService'),
          import('./payablesReconciliationService'),
          import('./financial/creditService'),
          import('./loginScreenService'),
          import('./reportAuditService'),
          // import('./loanService'), — removido: consolidado no loansService canônico
          import('./ledgerService'),
          import('./financial/financialTransactionService'),
        ]);

        // 📥 CARREGAR DADOS DE CADA SERVICE (em paralelo) - critico primeiro
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

            return result as T;
          } catch (error: any) {
            status = 'error';
            errorMessage = error?.message || String(error);
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

        // normalizeLegacy roda em background — NÃO bloqueia critical path
        if (typeof financialTransactionModule.financialTransactionService?.normalizeLegacyTransferTypesAndRecalculate === 'function') {
          void withTimeout(
            financialTransactionModule.financialTransactionService.normalizeLegacyTransferTypesAndRecalculate(),
            'financialTransactionService.normalizeLegacyTransferTypesAndRecalculate',
            CRITICAL_TIMEOUT_MS
          );
        }

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
        if (typeof ledgerModule.ledgerService?.recalculateBalances === 'function') {
          criticalPromises.push(withTimeout(ledgerModule.ledgerService.recalculateBalances(), 'ledgerService', CRITICAL_TIMEOUT_MS));
        }

        await Promise.allSettled(criticalPromises);
        if (_initDiagnostics) {
          _initDiagnostics.criticalMs = Math.round(performance.now() - criticalStartTime);
        }

        _initCriticalCompleted = true;

        if (!isSqlCanonicalOpsEnabled()) {
          // Reconcilia recebimentos e pagamentos antigos automaticamente (sem bloquear a UI)
          // Delay de 1.5s para garantir que todos os serviços estejam carregados
          setTimeout(() => {
            void reconciliationModule.reconcileReceivablesFromHistory();
            void payablesReconciliationModule.reconcilePayablesFromHistory();
            // Reconciliar diretamente dos pedidos após 500ms extra
            setTimeout(() => {
              void payablesReconciliationModule.reconcilePayablesFromOrders();
              void payablesReconciliationModule.reconcilePayablesFromFreights();
              void reconciliationModule.reconcileReceivablesFromOrders();
            }, 500);
          }, 1500);
        }
        emitInitEvent('supabase:init:critical', { diagnostics: _initDiagnostics });
        emitInitEvent('supabase:init:complete', { diagnostics: _initDiagnostics });
        emitInitEvent('data:updated');
        if (shouldLogDiagnostics()) {
        }

        // Carregar services nao criticos em background
        const runBackgroundLoad = async () => {
          try {
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

            // 🔄 Iniciar subscriptions em tempo real
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
            if (typeof ledgerModule.ledgerService?.startRealtime === 'function') ledgerModule.ledgerService.startRealtime();
            if (typeof initialBalanceModule.initialBalanceService?.startRealtime === 'function') initialBalanceModule.initialBalanceService.startRealtime();
            if (typeof locationModule.locationService?.startRealtime === 'function') locationModule.locationService.startRealtime();

            // Novos serviços com realtime
            startServiceRealtime(expenseCategoryModule, 'expenseCategoryService');
            startServiceRealtime(classificationModule, 'classificationService');
            if (typeof creditModule.default?.startRealtime === 'function') creditModule.default.startRealtime();
            if (typeof loginScreenModule.loginScreenService?.startRealtime === 'function') loginScreenModule.loginScreenService.startRealtime();
            if (typeof reportAuditModule.reportAuditService?.startRealtime === 'function') reportAuditModule.reportAuditService.startRealtime();
            // loanServiceModule.loanService.startRealtime() removido — consolidado no loansService canônico


            _initFullCompleted = true;
            emitInitEvent('supabase:init:full', { diagnostics: _initDiagnostics });
            emitInitEvent('data:updated');
            if (shouldLogDiagnostics()) {
            }
          } catch (error) {
            console.error('[supabaseInitService] runBackgroundLoad:', error);
          }
        };

        void runBackgroundLoad();
      } catch (realtimeError) {
        console.warn('[supabaseInitService] realtime setup:', realtimeError);
      }
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

// stopAllRealtime extraído para supabaseRealtimeCleanup.ts
export { stopAllRealtime } from './supabaseRealtimeCleanup';

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
