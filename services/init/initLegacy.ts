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
  // =========================================================================
  // IMPORTS CRÍTICOS — apenas o essencial para a UI funcionar no login.
  // Pedidos, financeiro completo e logs são carregados sob demanda nos módulos.
  // =========================================================================
  const [
    partnerModule,
    bankAccountModule,
    settingsModule,
    locationModule,
    expenseCategoryModule,
    loadingModule,
    transporterModule,
    driverModule,
    vehicleModule,
  ] = await Promise.all([
    import('../partnerService'),
    import('../bankAccountService'),
    import('../settingsService'),
    import('../locationService'),
    import('../expenseCategoryService'),
    import('../loadingService'),
    import('../transporterService'),
    import('../driverService'),
    import('../vehicleService'),
  ]);

  const criticalStartTime = performance.now();

  // =========================================================================
  // FASE CRÍTICA — máximo 5 serviços essenciais para os formulários funcionarem.
  // =========================================================================
  const criticalPromises: Promise<any>[] = [];
  const addCrit = (mod: any, name: string) => {
    if (typeof mod?.loadFromSupabase === 'function') {
      criticalPromises.push(withTimeout(mod.loadFromSupabase(), name, CRITICAL_TIMEOUT_MS));
    }
  };

  // Parceiros (id+nome): necessário para selects de pedido e romaneio
  addCrit(partnerModule.partnerService, 'partnerService');
  // Contas bancárias: necessário para formulários de pagamento
  addCrit(bankAccountModule.bankAccountService, 'bankAccountService');
  // Configurações: regras de negócio gerais
  addCrit(settingsModule.settingsService, 'settingsService');
  // UFs e cidades: necessário para selects de endereço
  addCrit(locationModule.locationService, 'locationService');
  // Categorias de despesas: necessário para formulários financeiros
  addCrit(expenseCategoryModule.expenseCategoryService, 'expenseCategoryService');

  await Promise.allSettled(criticalPromises);
  initDiagnostics.setCriticalTime(performance.now() - criticalStartTime);
  initDiagnostics.setCriticalCompleted(true);

  // =========================================================================
  // BACKGROUND — dados operacionais de referência (tabelas pequenas).
  // Financeiro completo, pedidos e logs são lazy-loaded pelos módulos.
  // =========================================================================
  const runBackground = async () => {
    const bgStart = performance.now();
    const bgPromises: Promise<any>[] = [];
    const addBg = (mod: any, name: string) => {
      if (typeof mod?.loadFromSupabase === 'function') {
        bgPromises.push(withTimeout(mod.loadFromSupabase(), name, BACKGROUND_TIMEOUT_MS));
      }
    };

    // Dados de referência operacional — tabelas pequenas, essenciais nos formulários
    addBg(transporterModule.transporterService, 'transporterService');
    addBg(driverModule.driverService, 'driverService');
    addBg(vehicleModule.vehicleService, 'vehicleService');
    // Romaneios: listagem inicial do módulo logístico
    addBg(loadingModule.loadingService, 'loadingService');

    // REMOVIDOS DO CARREGAMENTO AUTOMÁTICO (lazy — cada módulo carrega ao montar):
    // purchaseService     → módulo PedidoCompra
    // salesService        → módulo PedidoVenda
    // payablesService     → módulo Financeiro/Pagar
    // receivablesService  → módulo Financeiro/Receber
    // transfersService    → módulo Financeiro/Transferências
    // loansService        → módulo Financeiro/Empréstimos
    // financialHistoryService → módulo Financeiro
    // advancesService     → módulo Financeiro/Adiantamentos
    // ledgerService       → dispensável no background
    // standaloneRecordsService → dispensável no background
    // shareholderService  → dispensável no background
    // partnerAddressService → carregado sob demanda
    // assetService        → carregado sob demanda
    // creditModule        → carregado sob demanda
    // auditModule         → logs consultados sob demanda, sem realtime
    // logModule           → logs consultados sob demanda, sem realtime
    // reportAuditModule   → consultado sob demanda
    // loginScreenModule   → sem realtime necessário
    // reconciliationModule → dispensável no background

    await Promise.allSettled(bgPromises);
    initDiagnostics.setBackgroundTime(performance.now() - bgStart);

    // =========================================================================
    // REALTIME — apenas dados de referência operacional.
    // Pedidos e financeiro iniciam realtime dentro de cada módulo.
    // =========================================================================
    const startRealtime = (mod: any) => {
      if (typeof mod?.startRealtime === 'function') mod.startRealtime();
    };

    [
      transporterModule.transporterService,
      driverModule.driverService,
      vehicleModule.vehicleService,
      partnerModule.partnerService,
      settingsModule.settingsService,
      bankAccountModule.bankAccountService,
      loadingModule.loadingService,
      locationModule.locationService,
      expenseCategoryModule.expenseCategoryService,
    ].forEach(startRealtime);

    initDiagnostics.setFullCompleted(true);
    initDiagnostics.emitEvent('supabase:init:full', { diagnostics: initDiagnostics.get() });
    initDiagnostics.emitEvent('data:updated');
  };

  void runBackground();
};
