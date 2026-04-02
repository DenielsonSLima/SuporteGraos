/**
 * ============================================================================
 * HELPERS COMPARTILHADOS DO ORQUESTRADOR DE PAGAMENTOS
 * ============================================================================
 * 
 * Funções utilitárias usadas por todos os handlers de domínio.
 * Inclui resolução de conta bancária, registro financeiro centralizado, etc.
 */

import { financialTransactionService, TransactionLinkParams } from '../financialTransactionService';
import { financialHistoryService } from '../financialHistoryService';
import { authService } from '../../authService';
import { formatMoney as formatCurrency } from '../../../utils/formatters';
import { isSqlCanonicalOpsEnabled } from '../../sqlCanonicalOps';
import type { RegisterFinancialParams } from './orchestratorTypes';
import { FinancialRecord } from '../../../modules/Financial/types';

// ============================================================================
// HELPERS BÁSICOS
// ============================================================================

export const generateTxId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 9);

export const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

export const getCompanyId = () => authService.getCurrentUser()?.companyId || '';

// ============================================================================
// RESOLUÇÃO DE CONTA BANCÁRIA
// ============================================================================

// Cache local de contas bancárias — atualizado via setAccountsCache()
let _accountsCache: Array<{ id: string; bankName: string; owner?: string }> = [];

/** Atualizar o cache de contas (chamado pelo hook/provider que carrega contas) */
export const setAccountsCache = (accounts: Array<{ id: string; bankName: string; owner?: string }>) => {
  _accountsCache = accounts;
};

export const resolveAccountId = (value: string) => {
  if (!value) return value;
  const accounts = _accountsCache;
  if (accounts.length === 0) return value;
  const byId = accounts.find((a) => a.id === value);
  if (byId) return byId.id;
  const byName = accounts.find((a) => a.bankName === value);
  if (byName) return byName.id;
  const byNameCI = accounts.find((a) => a.bankName?.toLowerCase() === value.toLowerCase());
  if (byNameCI) return byNameCI.id;
  return value;
};

export const resolveAccountLabel = (accountId: string) => {
  const accounts = _accountsCache;
  const acc = accounts.find((a) => a.id === accountId) || accounts.find((a) => a.bankName === accountId);
  return acc ? `${acc.bankName}${acc.owner ? ` - ${acc.owner}` : ''}` : accountId;
};

// ============================================================================
// REGISTRO FINANCEIRO CENTRALIZADO
// ============================================================================

/**
 * Registra a transação financeira real + histórico geral + admin_expenses
 * de forma CONSISTENTE com descrição padronizada.
 * 
 * Refatorado para usar o Foundation v2:
 * 1. Financial Transactions (com triggers para saldo)
 * 2. Financial Links (vínculo robusto)
 * 3. Legacy compatibility (history e standalone)
 */
export const registerFinancialRecords = async (params: RegisterFinancialParams) => {
  const {
    txId, date, amount, discount, accountId, accountName,
    type, recordId, referenceType, referenceId,
    description, historyType, entityName, partnerId, notes, companyId,
    driverName
  } = params;

  const isPureAdjustment = amount === 0 && discount > 0;
  const company = companyId || getCompanyId();

  // 1. FINANCIAL_TRANSACTIONS — Transação real com Links Robustos
  // No modo canônico, o RPC pay_financial_entry já cuida desta etapa.
  // Só executa via financialTransactionService no modo LEGADO.
  let txResult = null;
  const canonicalOps = isSqlCanonicalOpsEnabled();

  if (!canonicalOps && amount > 0 && accountId) {
    try {
      const linkParams: TransactionLinkParams = {
        linkType: type,
        purchaseOrderId: referenceType === 'purchase_order' ? referenceId : (recordId.startsWith('po-') ? recordId : undefined),
        salesOrderId: referenceType === 'sales_order' ? referenceId : (recordId.startsWith('so-') ? recordId : undefined),
        loadingId: referenceType === 'loading' ? referenceId : (recordId.startsWith('fr-') ? recordId : undefined),
        commissionId: referenceType === 'commission' ? referenceId : undefined,
        standaloneId: !['purchase_order', 'sales_order', 'loading', 'commission', 'shareholder'].includes(referenceType) ? recordId : undefined,
        shareholderTxId: params.shareholderTxId
      };

      txResult = await financialTransactionService.add({
        date,
        description: `${description} [REF:${txId}]`,
        amount,
        type,
        bankAccountId: accountId,
        financialRecordId: recordId,
        companyId: company
      }, linkParams);
    } catch (err) {
      throw err; // Agora é erro fatal pois o saldo depende disso
    }
  }

  // 2. FINANCIAL_HISTORY — Histórico consolidado (Mantido para compatibilidade de UI)
  if (amount > 0 && !isPureAdjustment) {
    try {
      financialHistoryService.add({
        id: crypto.randomUUID(),
        date,
        type: historyType,
        operation: type === 'receipt' ? 'inflow' : 'outflow',
        amount,
        balanceBefore: 0, // Ignorado pela UI agora que usamos o saldo atômico
        balanceAfter: 0,
        bankAccountId: resolveAccountId(accountId),
        description,
        partnerId,
        referenceType,
        referenceId,
        notes: `${notes || ''} [REF:${txId}]`.trim(),
        companyId: company
      });
    } catch (err) {
    }
  }

  // 3. ADMIN_EXPENSES (standalone) — Registro de liquidação (LEGACY - Usado pelo calculo antigo de saldo)
  // TODO: Remover após migrar dashboard/relatórios para usar financial_transactions
  try {
    const { standaloneRecordsService } = await import('../../standaloneRecordsService');
    await standaloneRecordsService.add({
      id: isPureAdjustment ? `adjust-${txId}` : `hist-${txId}`,
      description: `${isPureAdjustment ? 'Abatimento' : 'Baixa'}: ${description}`,
      entityName,
      driverName,
      category: isPureAdjustment ? 'Desconto/Ajuste' : `Liquidação - ${historyType}`,
      dueDate: date,
      issueDate: date,
      settlementDate: date,
      originalValue: amount + discount,
      paidValue: amount,
      discountValue: discount,
      status: 'paid',
      subType: referenceType as FinancialRecord['subType'],
      bankAccount: isPureAdjustment ? 'ABATIMENTO' : (accountName || accountId || 'N/D'),
      companyId: company,
      notes: `${notes || ''} [ORIGIN:${recordId}] [REF:${txId}]`.trim()
    });
  } catch (err) {
    // Não damos throw aqui pois a transação real (Step 1) já foi salva e o saldo está garantido via trigger
  }

  return txResult;
};
