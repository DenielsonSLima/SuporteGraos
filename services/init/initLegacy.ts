import { InitStats, ServiceLoadStatus } from './initTypes';
import { initDiagnostics } from './initDiagnostics';

const CRITICAL_TIMEOUT_MS = 20000;
const BACKGROUND_TIMEOUT_MS = 15000;

const recordServiceMetric = initDiagnostics.recordMetric;

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

export const loadLegacyData = async (stats: InitStats) => {
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
    ledgerModule,
    financialTransactionModule,
  ] = await Promise.all([
    import('../transporterService'),
    import('../vehicleService'),
    import('../driverService'),
    import('../shareholderService'),
    import('../partnerAddress/index'),
    import('../partnerService'),
    import('../salesService'),
    import('../assetService'),
    import('../loadingService'),
    import('../financial/advancesService'),
    import('../financial/receivablesService'),
    import('../financial/payablesService'),
    import('../financial/transfersService'),
    import('../financial/loansService'),
    import('../financial/financialHistoryService'),
    import('../purchaseService'),
    import('../standaloneRecordsService'),
    import('../auditService'),
    import('../logService'),
    import('../settingsService'),
    import('../bankAccountService'),
    import('../expenseCategoryService'),
    import('../initialBalanceService'),
    import('../classificationService'),
    import('../locationService'),
    import('../receivablesReconciliationService'),
    import('../payablesReconciliationService'),
    import('../financial/creditService'),
    import('../loginScreenService'),
    import('../reportAuditService'),
    import('../ledgerService'),
    import('../financial/financialTransactionService'),
  ]);

  const criticalStartTime = performance.now();

  if (typeof financialTransactionModule.financialTransactionService?.normalizeLegacyTransferTypesAndRecalculate === 'function') {
    void withTimeout(
      financialTransactionModule.financialTransactionService.normalizeLegacyTransferTypesAndRecalculate(),
      'financialTransactionService.normalizeLegacyTransferTypesAndRecalculate',
      CRITICAL_TIMEOUT_MS
    );
  }

  const criticalPromises: Promise<any>[] = [];
  const addCrit = (mod: any, name: string) => {
    if (typeof mod?.loadFromSupabase === 'function') {
      criticalPromises.push(withTimeout(mod.loadFromSupabase(), name, CRITICAL_TIMEOUT_MS));
    }
  };

  addCrit(partnerModule.partnerService, 'partnerService');
  addCrit(purchaseModule.purchaseService, 'purchaseService');
  addCrit(salesModule.salesService, 'salesService');
  addCrit(loadingModule.loadingService, 'loadingService');
  addCrit(payablesModule.payablesService, 'payablesService');
  addCrit(receivablesModule.receivablesService, 'receivablesService');
  addCrit(transfersModule.transfersService, 'transfersService');
  
  if (typeof standaloneModule.standaloneRecordsService?.initialize === 'function') {
    criticalPromises.push(withTimeout(standaloneModule.standaloneRecordsService.initialize(), 'standaloneRecordsService', CRITICAL_TIMEOUT_MS));
  }
  if (typeof ledgerModule.ledgerService?.recalculateBalances === 'function') {
    criticalPromises.push(withTimeout(ledgerModule.ledgerService.recalculateBalances(), 'ledgerService', CRITICAL_TIMEOUT_MS));
  }

  await Promise.allSettled(criticalPromises);
  initDiagnostics.setCriticalTime(performance.now() - criticalStartTime);
  initDiagnostics.setCriticalCompleted(true);

  // Background Load
  const runBackground = async () => {
    const bgStart = performance.now();
    const bgPromises: Promise<any>[] = [];
    const addBg = (mod: any, name: string) => {
      if (typeof mod?.loadFromSupabase === 'function') {
        bgPromises.push(withTimeout(mod.loadFromSupabase(), name, BACKGROUND_TIMEOUT_MS));
      }
    };

    addBg(transporterModule.transporterService, 'transporterService');
    addBg(vehicleModule.vehicleService, 'vehicleService');
    addBg(driverModule.driverService, 'driverService');
    addBg(shareholderModule.shareholderService, 'shareholderService');
    addBg(partnerAddressModule.partnerAddressService, 'partnerAddressService');
    addBg(assetModule.assetService, 'assetService');
    addBg(advancesModule.advancesService, 'advancesService');
    addBg(loansModule.loansService, 'loansService');
    addBg(financialHistoryModule.financialHistoryService, 'financialHistoryService');
    addBg(settingsModule.settingsService, 'settingsService');
    addBg(bankAccountModule.bankAccountService, 'bankAccountService');
    addBg(initialBalanceModule.initialBalanceService, 'initialBalanceService');
    addBg(expenseCategoryModule.expenseCategoryService, 'expenseCategoryService');
    addBg(classificationModule.classificationService, 'classificationService');
    addBg(locationModule.locationService, 'locationService');

    await Promise.allSettled(bgPromises);
    initDiagnostics.setBackgroundTime(performance.now() - bgStart);

    // Realtime Start
    const startRealtime = (mod: any) => {
      if (typeof mod?.startRealtime === 'function') mod.startRealtime();
    };

    [
      transporterModule.transporterService, vehicleModule.vehicleService, driverModule.driverService,
      shareholderModule.shareholderService, partnerAddressModule.partnerAddressService, partnerModule.partnerService,
      salesModule.salesService, assetModule.assetService, loadingModule.loadingService,
      advancesModule.advancesService, receivablesModule.receivablesService, payablesModule.payablesService,
      transfersModule.transfersService, loansModule.loansService, financialHistoryModule.financialHistoryService,
      purchaseModule.purchaseService, auditModule.auditService, logModule.logService,
      settingsModule.settingsService, bankAccountModule.bankAccountService, ledgerModule.ledgerService,
      initialBalanceModule.initialBalanceService, locationModule.locationService,
      expenseCategoryModule.expenseCategoryService, classificationModule.classificationService,
      creditModule.default, loginScreenModule.loginScreenService, reportAuditModule.reportAuditService
    ].forEach(startRealtime);

    initDiagnostics.setFullCompleted(true);
    initDiagnostics.emitEvent('supabase:init:full', { diagnostics: initDiagnostics.get() });
    initDiagnostics.emitEvent('data:updated');
  };

  void runBackground();
};
