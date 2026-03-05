import JSZip from 'jszip';
import { authService } from '../../../services/authService';
import { partnerService } from '../../../services/partnerService';
import { fleetService } from '../../../services/fleetService';
import { purchaseService } from '../../../services/purchaseService';
import { salesService } from '../../../services/salesService';
import { loadingService } from '../../../services/loadingService';
import { financialActionService } from '../../../services/financialActionService';
import { financialService } from '../../../services/financialService';
import { shareholderService } from '../../../services/shareholderService';
import { settingsService } from '../../../services/settingsService';
import { logService } from '../../../services/logService';
import { assetService } from '../../../services/assetService';
import { loansService } from '../../../services/loansService';
import { classificationService } from '../../../services/classificationService';
import { advanceService } from '../../Financial/Advances/services/advanceService';

export interface BackupModuleDef {
  id: string;
  label: string;
  fileName: string;
  description: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const resolveBackupData = async (modId: string) => {
  if (modId === 'partners') return partnerService.getAll();
  if (modId === 'fleet') return { drivers: fleetService.getAllDrivers(), vehicles: fleetService.getAllVehicles() };
  if (modId === 'purchases') return purchaseService.getAll();
  if (modId === 'sales') return salesService.getAll();
  if (modId === 'logistics') return loadingService.getAll();
  if (modId === 'advances') return advanceService.getManualTransactions();
  if (modId === 'shareholders') return shareholderService.getAll();
  if (modId === 'loans') return loansService.getAll();
  if (modId === 'assets') return assetService.getAll();
  if (modId === 'logs') return logService.getAll();
  if (modId === 'financial_admin') {
    return {
      expenses: financialActionService.getStandaloneRecords(),
      transfers: financialActionService.getTransfers()
    };
  }

  if (modId === 'settings') {
    return {
      company: settingsService.getCompanyData(),
      watermark: settingsService.getWatermark(),
      bankAccounts: financialService.getBankAccounts(),
      initialBalances: financialService.getInitialBalances(),
      loginScreen: settingsService.getLoginSettings(),
      partnerTypes: await classificationService.getPartnerTypes(),
      productTypes: await classificationService.getProductTypes(),
      expenseCategories: financialService.getExpenseCategories()
    };
  }

  return null;
};

const importModuleData = async (modId: string, parsedData: any) => {
  if (modId === 'partners') partnerService.importData(parsedData);
  if (modId === 'fleet') fleetService.importData(parsedData.drivers, parsedData.vehicles);
  if (modId === 'purchases') purchaseService.importData(parsedData);
  if (modId === 'sales') salesService.importData(parsedData);
  if (modId === 'logistics') loadingService.importData(parsedData);
  if (modId === 'advances') advanceService.importData(parsedData);
  if (modId === 'shareholders') (shareholderService as any).importData(parsedData);
  if (modId === 'loans') {
    // Legacy importData removido — loansService canônico não suporta bulk import.
    // Se necessário, usar upsert direto no Supabase.
    console.warn('[Backup] Importação de empréstimos desativada no modo canônico');
  }
  if (modId === 'assets') assetService.importData(parsedData);
  if (modId === 'logs') logService.importData(parsedData);
  if (modId === 'financial_admin') {
    financialActionService.importData(parsedData.expenses || [], parsedData.transfers || []);
  }

  if (modId === 'settings') {
    if (parsedData.company) await settingsService.updateCompanyData(parsedData.company);
    if (parsedData.watermark) await settingsService.updateWatermark(parsedData.watermark);
    if (parsedData.loginScreen) await settingsService.updateLoginSettings(parsedData.loginScreen);

    if (parsedData.partnerTypes || parsedData.productTypes) {
      classificationService.importData(parsedData.partnerTypes, parsedData.productTypes);
    }

    financialService.importData(
      parsedData.bankAccounts,
      parsedData.initialBalances,
      parsedData.expenseCategories
    );
  }
};

export const useBackupOrchestrator = () => {
  const generateBackupZip = async (selectedModuleIds: string[], availableModules: BackupModuleDef[]) => {
    const zip = new JSZip();

    for (const modId of selectedModuleIds) {
      const moduleDef = availableModules.find((moduleItem) => moduleItem.id === modId);
      if (!moduleDef) continue;

      const data = await resolveBackupData(modId);
      if (data) {
        zip.file(moduleDef.fileName, JSON.stringify(data, null, 2));
      }

      await sleep(50);
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_erp_graos_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.zip`;
    a.click();
    URL.revokeObjectURL(url);

    const user = authService.getCurrentUser();
    const userId = user?.id || 'system';
    const userName = user?.name || 'Sistema';

    logService.addLog({
      userId,
      userName,
      action: 'export',
      module: 'Configurações',
      description: `Gerou backup (${selectedModuleIds.length} módulos).`
    });
  };

  const parseRestoreFile = async (file: File, availableModules: BackupModuleDef[]) => {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);
    const foundModules: string[] = [];

    availableModules.forEach((moduleItem) => {
      if (loadedZip.file(moduleItem.fileName)) {
        foundModules.push(moduleItem.id);
      }
    });

    return foundModules;
  };

  const executeRestore = async (file: File, selectedModuleIds: string[], availableModules: BackupModuleDef[]) => {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);

    for (const modId of selectedModuleIds) {
      const modDef = availableModules.find((moduleItem) => moduleItem.id === modId);
      const zipFile = loadedZip.file(modDef?.fileName || '');
      if (!zipFile) continue;

      const content = await zipFile.async('string');
      const parsedData = JSON.parse(content);
      await importModuleData(modId, parsedData);
    }
  };

  return {
    generateBackupZip,
    parseRestoreFile,
    executeRestore
  };
};
