/**
 * ============================================================================
 * PAYMENT ORCHESTRATOR — Fachada de Re-export
 * ============================================================================
 * 
 * MODULARIZADO: Cada handler agora vive em seu próprio arquivo isolado
 * dentro de services/financial/handlers/
 * 
 * Estrutura:
 *   handlers/
 *     orchestratorTypes.ts     → PaymentData, PaymentResult, etc.
 *     orchestratorHelpers.ts   → resolveAccountId, registerFinancialRecords, etc.
 *     freightHandler.ts        → handleFreightPayment (Frete)
 *     purchaseOrderHandler.ts  → handlePurchaseOrderPayment (Compra)
 *     salesOrderHandler.ts     → handleSalesOrderReceipt (Venda)
 *     commissionHandler.ts     → handleCommissionPayment (Comissão)
 *     standaloneHandler.ts     → handleStandalonePayment (Despesa Avulsa)
 *     cleanupHandler.ts        → cleanupFinancialRecords (Limpeza Cascata)
 *     index.ts                 → Barrel export
 * 
 * Este arquivo mantém a API pública idêntica para compatibilidade com todos
 * os consumers existentes (36+ imports no projeto).
 */

// Re-export de TODOS os tipos e handlers dos módulos isolados
export type { PaymentData, PaymentResult, CleanupParams, RegisterFinancialParams } from './handlers/orchestratorTypes';
export { resolveAccountId, resolveAccountLabel, registerFinancialRecords } from './handlers/orchestratorHelpers';
export { handleFreightPayment } from './handlers/freightHandler';
export { handlePurchaseOrderPayment } from './handlers/purchaseOrderHandler';
export { handleSalesOrderReceipt } from './handlers/salesOrderHandler';
export { handleCommissionPayment } from './handlers/commissionHandler';
export { handleStandalonePayment } from './handlers/standaloneHandler';
export { handleShareholderPayment } from './handlers/shareholderHandler';
export { cleanupFinancialRecords } from './handlers/cleanupHandler';
export { handleTransactionVoid } from './handlers/transactionCleanupHandler';
// Alias de compatibilidade — removeFinancialTransaction foi renomeado para handleTransactionVoid
export { handleTransactionVoid as removeFinancialTransaction } from './handlers/transactionCleanupHandler';

// Import para montar o export consolidado
import { resolveAccountId, resolveAccountLabel } from './handlers/orchestratorHelpers';
import { handleFreightPayment } from './handlers/freightHandler';
import { handlePurchaseOrderPayment } from './handlers/purchaseOrderHandler';
import { handleSalesOrderReceipt } from './handlers/salesOrderHandler';
import { handleCommissionPayment } from './handlers/commissionHandler';
import { handleStandalonePayment } from './handlers/standaloneHandler';
import { handleShareholderPayment } from './handlers/shareholderHandler';
import { cleanupFinancialRecords } from './handlers/cleanupHandler';
import { handleTransactionVoid } from './handlers/transactionCleanupHandler';
const removeFinancialTransaction = handleTransactionVoid;

// ============================================================================
// EXPORT CONSOLIDADO (para quem importa paymentOrchestrator como objeto)
// ============================================================================

export const paymentOrchestrator = {
  handleFreightPayment,
  handlePurchaseOrderPayment,
  handleSalesOrderReceipt,
  handleCommissionPayment,
  handleStandalonePayment,
  handleShareholderPayment,
  cleanupFinancialRecords,
  removeFinancialTransaction,
  resolveAccountId,
  resolveAccountLabel
};
