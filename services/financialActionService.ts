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
} from './financial/paymentOrchestrator';

import {
  getTransfers,
  addTransfer,
  updateTransfer,
  deleteTransfer,
  importTransfers,
  mapTransferToRecord
} from './financial/actions/transferActions';
import { transfersService } from './financial/transfersService';
import { PaymentResult, PaymentData } from './financial/handlers/orchestratorTypes';
import type { Shareholder as ShareholderDB } from './shareholderService';

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

/**
 * Mapeia um Shareholder para FinancialRecord (obrigações com sócios).
 * Garante tipo homogêneo no array de getStandaloneRecords().
 */
function mapShareholderToFinancialRecord(s: ShareholderDB): FinancialRecord {
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
  getStandaloneRecords: async (): Promise<FinancialRecord[]> => {
    const [admin, credits, shareholders, receipts] = await Promise.all([
      standaloneRecordsService.loadFromSupabase(),
      creditService.loadFromSupabase(),
      shareholderService.loadFromSupabase(),
      receiptService.loadFromSupabase()
    ]);

    return [
      ...admin,
      ...credits.filter(c => ['credit_income', 'investment'].includes(c.subType || '') && c.status !== 'cancelled'),
      ...shareholders.map(mapShareholderToFinancialRecord),
      ...receipts
    ];
  },
  getTransfers: async (): Promise<TransferRecord[]> => {
    const items = await transfersService.loadFromSupabase();
    return items.map(mapTransferToRecord);
  },

  processRecord: async (recordId: string, data: PaymentData, subType?: string): Promise<PaymentResult> => {
    const { userId, userName } = getLogInfo();
    const transactionValue = typeof data.amount === 'string' ? parseFloat(data.amount) || 0 : data.amount;
    const discountValue = typeof data.discount === 'string' ? parseFloat(data.discount) || 0 : data.discount;

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

    let result: PaymentResult = { success: true, txId: '' };

    if (subType === 'freight') {
      result = await handleFreightPayment(recordId, paymentData);
    } else if (subType === 'purchase_order') {
      result = await handlePurchaseOrderPayment(recordId, paymentData);
    } else if (subType === 'purchase_order_extra') {
      // Despesas Extras do Pedido de Compra (não possuem entry_id, mas precisam baixar saldo)
      // Passamos null para standalone e serviceToUpdate pois é uma movimentação avulsa vinculada ao Pedido
      result = await handleStandalonePayment(recordId, paymentData, null, null);
    } else if (subType === 'sales_order') {
      result = await handleSalesOrderReceipt(recordId, paymentData);
    } else if (subType === 'commission') {
      result = await handleCommissionPayment(recordId, paymentData);
    } else {
      // Standalone / admin / crédito / sócio / recibo
      let standalone: FinancialRecord | ShareholderDB | null | undefined = await standaloneRecordsService.getById(recordId);
      let serviceToUpdate: { getById?: (id: string) => any;[key: string]: any } = standaloneRecordsService;

      if (!standalone) {
        const credits = await creditService.getCredits();
        standalone = credits.find((c: any) => c.id === recordId);
        if (standalone) serviceToUpdate = creditService;
      }
      if (!standalone) {
        standalone = await shareholderService.getById(recordId);
        if (standalone) serviceToUpdate = shareholderService;
      }
      if (!standalone) {
        standalone = await receiptService.getById(recordId);
        if (standalone) serviceToUpdate = receiptService;
      }

      if (standalone && serviceToUpdate === shareholderService) {
        // Pró-labore ou Retirada via lista standalone
        const { handleShareholderPayment } = await import('./financial/paymentOrchestrator');
        result = await handleShareholderPayment(recordId, paymentData, 'debit');
      } else {
        result = await handleStandalonePayment(recordId, paymentData, standalone as FinancialRecord, serviceToUpdate);
      }
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
    const isValidUUID = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    if (await standaloneRecordsService.getById(id)) {
      await standaloneRecordsService.delete(id);
    } else if ((await creditService.getCredits()).find((c: any) => c.id === id)) {
      await creditService.remove(id);
    } else if (isValidUUID(id) && await shareholderService.getById(id)) {
      await shareholderService.delete(id);
    } else if (isValidUUID(id) && await receiptService.getById(id)) {
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
    // 1. Delete from standalone by reference (replaces hist- and adjust- legacy logic)
    await standaloneRecordsService.deleteByRef(originTxId);

    // 2. Reverter transações financeiras (ledger imutável, sem delete)
    const { financialTransactionService } = await import('./financial/financialTransactionService');
    await financialTransactionService.deleteByOrigin(originTxId);
  },

  addTransfer: (transfer: TransferRecord) => addTransfer(transfer),
  updateTransfer: (transfer: TransferRecord) => updateTransfer(transfer),
  deleteTransfer: (id: string) => deleteTransfer(id)
};
