/**
 * ============================================================================
 * FINANCIAL ACTION SERVICE — Fachada de Alto Nível
 * ============================================================================
 * 
 * REFATORADO: Agora delega toda a lógica de pagamento/recebimento para
 * o paymentOrchestrator, que garante consistência entre TODAS as tabelas.
 * 
 * MODULARIZADO:
 *   financial/handlers/*         → Handlers de pagamento por domínio
 *   financial/actions/transferActions.ts → Operações de transferência bancária
 * 
 * Este arquivo mantém apenas:
 * - processRecord(): ponto de entrada que roteia para o handler correto
 * - Operações CRUD de registros standalone (delegados)
 * - Re-exports de transferências
 */

import { FinancialRecord, TransferRecord, FinancialStatus } from '../modules/Financial/types';
import { assetService } from './assetService';
import { logService } from './logService';
import { authService } from './authService';
import { invalidateFinancialCache } from './financialCache';
import { invalidateDashboardCache } from './dashboardCache';
import { standaloneRecordsService } from './standaloneRecordsService';
import creditService from './financial/creditService';
import { shareholderService } from './shareholderService';
import { receiptService } from './financial/receiptService';
import { formatMoney as formatCurrency } from '../utils/formatters';
import {
  handleFreightPayment,
  handlePurchaseOrderPayment,
  handleSalesOrderReceipt,
  handleCommissionPayment,
  handleStandalonePayment,
  PaymentData
} from './financial/paymentOrchestrator';

// Módulo de transferências (extraído)
import {
  getTransfers,
  addTransfer,
  updateTransfer,
  deleteTransfer,
  importTransfers
} from './financial/actions/transferActions';
import type { Shareholder } from './shareholderService';

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

/**
 * Mapeia um Shareholder para FinancialRecord (obrigações com sócios).
 * Garante tipo homogêneo no array de getStandaloneRecords().
 */
function mapShareholderToFinancialRecord(s: Shareholder): FinancialRecord {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: s.id,
    description: `Pró-labore — ${s.name}`,
    entityName: s.name,
    category: 'Sócio',
    dueDate: s.financial?.lastProLaboreDate || today,
    issueDate: s.financial?.lastProLaboreDate || today,
    originalValue: s.financial?.proLaboreValue ?? 0,
    paidValue: 0,
    remainingValue: s.financial?.proLaboreValue ?? 0,
    discountValue: 0,
    status: 'pending',
    subType: 'shareholder',
    notes: `CPF: ${s.cpf}`,
  };
}

export const financialActionService = {
  getStandaloneRecords: (): FinancialRecord[] => [
    ...standaloneRecordsService.getAll(),
    ...creditService.getCredits(),
    ...shareholderService.getAll().map(mapShareholderToFinancialRecord),
    ...receiptService.getAll()
  ],
  getTransfers: () => getTransfers(),

  processRecord: async (recordId: string, data: any, subType?: string) => {
    const { userId, userName } = getLogInfo();
    const transactionValue = parseFloat(data.amount) || 0;
    const discountValue = parseFloat(data.discount) || 0;

    // Resolver nome da conta bancária
    let accountName = data.accountName;
    if (!accountName && data.accountId) {
      const { resolveAccountLabel } = await import('./financial/handlers/orchestratorHelpers');
      accountName = resolveAccountLabel(data.accountId);
    }

    // Registrar ativo se aplicável
    if (data.isAsset && data.assetName) {
      assetService.add({
        id: crypto.randomUUID(),
        name: data.assetName,
        type: 'other',
        status: 'active',
        acquisitionDate: data.date,
        acquisitionValue: transactionValue + discountValue,
        origin: 'trade_in',
        originDescription: `Recebido de ${data.entityName || 'Parceiro'} para quitar saldo.`
      });
    }

    // Montar dados padronizados para o orquestrador
    const paymentData: PaymentData = {
      date: data.date,
      amount: transactionValue,
      discount: discountValue,
      accountId: data.accountId,
      accountName,
      notes: data.notes,
      entityName: data.entityName,
      partnerId: data.partnerId,
      isAsset: data.isAsset,
      assetName: data.assetName
    };

    // =====================================================================
    // ROTEAR para o handler correto do orquestrador
    // Each handler cuida de: payable/receivable + financial_transactions + 
    // financial_history + admin_expenses de forma CONSISTENTE
    // =====================================================================

    let result: any = { success: true };

    if (subType === 'freight') {
      result = await handleFreightPayment(recordId, paymentData);
    } else if (subType === 'purchase_order') {
      result = await handlePurchaseOrderPayment(recordId, paymentData);
    } else if (subType === 'sales_order') {
      result = await handleSalesOrderReceipt(recordId, paymentData);
    } else if (subType === 'commission') {
      result = await handleCommissionPayment(recordId, paymentData);
    } else {
      // Standalone / admin / crédito / sócio / recibo
      let standalone: any = standaloneRecordsService.getById(recordId);
      let serviceToUpdate: any = standaloneRecordsService;

      if (!standalone) {
        standalone = creditService.getCredits().find((c: any) => c.id === recordId);
        if (standalone) serviceToUpdate = creditService;
      }
      if (!standalone) {
        standalone = shareholderService.getById(recordId);
        if (standalone) serviceToUpdate = shareholderService;
      }
      if (!standalone) {
        standalone = receiptService.getById(recordId);
        if (standalone) serviceToUpdate = receiptService;
      }

      result = await handleStandalonePayment(recordId, paymentData, standalone, serviceToUpdate);
    }

    // Log geral de ação
    logService.addLog({
      userId, userName, action: 'approve', module: 'Financeiro',
      description: `Baixa Realizada: ${formatCurrency(transactionValue)} ${discountValue > 0 ? `(+ Abatimento: ${formatCurrency(discountValue)})` : ''}`,
      entityId: recordId
    });

    invalidateFinancialCache();
    invalidateDashboardCache();

    return result;
  },

  addAdminExpense: async (record: FinancialRecord) => {
    await standaloneRecordsService.add(record);
  },
  deleteStandaloneRecord: async (id: string) => {
    if (standaloneRecordsService.getById(id)) {
      await standaloneRecordsService.delete(id);
    } else if (creditService.getCredits().find((c: any) => c.id === id)) {
      await creditService.remove(id);
    } else if (shareholderService.getById(id)) {
      await shareholderService.delete(id);
    } else if (receiptService.getById(id)) {
      await receiptService.delete(id);
    }
  },

  importData: async (expenses: FinancialRecord[], transfers: TransferRecord[]) => {
    if (expenses) await standaloneRecordsService.importData(expenses);
    if (transfers && transfers.length > 0) await importTransfers(transfers);
    invalidateFinancialCache();
    invalidateDashboardCache();
  },

  syncDeleteFromOrigin: async (originTxId: string) => {
    // 1. Delete from standalone (hist and adjust)
    await standaloneRecordsService.delete(`hist-${originTxId}`);
    await standaloneRecordsService.delete(`adjust-${originTxId}`);

    // 2. Reverter transações financeiras (ledger imutável, sem delete)
    const { financialTransactionService } = await import('./financial/financialTransactionService');
    await financialTransactionService.deleteByRef(originTxId);
  },

  addTransfer: (transfer: TransferRecord) => addTransfer(transfer),
  updateTransfer: (transfer: TransferRecord) => updateTransfer(transfer),
  deleteTransfer: (id: string) => deleteTransfer(id)
};
