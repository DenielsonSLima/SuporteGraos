/**
 * SUPABASE REALTIME CLEANUP
 * Para todos os canais Realtime de todos os services (usado no logout).
 * Extraído de supabaseInitService.ts para manter < 800 linhas.
 */

import { supabase } from './supabase';

const stopService = (mod: any, key?: string) => {
  const target = key ? mod?.[key] : mod;
  if (typeof target?.stopRealtime === 'function') {
    target.stopRealtime();
  }
};

export const stopAllRealtime = async () => {
  try {
    const [
      transporterModule, vehicleModule, driverModule, shareholderModule,
      partnerAddressModule, partnerModule, salesModule, assetModule,
      loadingModule, advancesModule, receivablesModule, payablesModule,
      transfersModule, loansModule, financialHistoryModule, purchaseModule,
      auditModule, logModule, settingsModule, bankAccountModule,
      ledgerModule, initialBalanceModule, locationModule,
      expenseCategoryModule, classificationModule, creditModule,
      loginScreenModule, reportAuditModule, receiptModule,
    ] = await Promise.all([
      import('./transporterService'), import('./vehicleService'), import('./driverService'), import('./shareholderService'),
      import('./partnerAddress'), import('./partnerService'), import('./salesService'), import('./assetService'),
      import('./loadingService'), import('./financial/advancesService'), import('./financial/receivablesService'), import('./financial/payablesService'),
      import('./financial/transfersService'), import('./financial/loansService'), import('./financial/financialHistoryService'), import('./purchaseService'),
      import('./auditService'), import('./logService'), import('./settingsService'), import('./bankAccountService'),
      import('./ledgerService'), import('./initialBalanceService'), import('./locationService'),
      import('./expenseCategoryService'), import('./classificationService'), import('./financial/creditService'),
      import('./loginScreenService'), import('./reportAuditService'), import('./financial/receiptService'),
    ]);

    stopService(transporterModule, 'transporterService');
    stopService(vehicleModule, 'vehicleService');
    stopService(driverModule, 'driverService');
    stopService(shareholderModule, 'shareholderService');
    stopService(partnerAddressModule, 'partnerAddressService');
    stopService(partnerModule, 'partnerService');
    stopService(salesModule, 'salesService');
    stopService(assetModule, 'assetService');
    stopService(loadingModule, 'loadingService');
    stopService(advancesModule, 'advancesService');
    stopService(receivablesModule, 'receivablesService');
    stopService(payablesModule, 'payablesService');
    stopService(transfersModule, 'transfersService');
    stopService(loansModule, 'loansService');
    stopService(financialHistoryModule, 'financialHistoryService');
    stopService(purchaseModule, 'purchaseService');
    stopService(auditModule, 'auditService');
    stopService(logModule, 'logService');
    stopService(settingsModule, 'settingsService');
    stopService(bankAccountModule, 'bankAccountService');
    stopService(ledgerModule, 'ledgerService');
    stopService(initialBalanceModule, 'initialBalanceService');
    stopService(locationModule, 'locationService');
    stopService(expenseCategoryModule, 'expenseCategoryService');
    stopService(classificationModule, 'classificationService');
    stopService(creditModule.default);
    stopService(loginScreenModule, 'loginScreenService');
    stopService(reportAuditModule, 'reportAuditService');
    // loanService removido — consolidado no loansService canônico
    stopService(receiptModule, 'receiptService');

    await supabase.removeAllChannels();
  } catch (error) {
    console.error('[stopAllRealtime] Erro ao parar canais:', error);
  }
};
