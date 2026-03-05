/**
 * ============================================================================
 * BARREL EXPORT — Handlers do Orquestrador de Pagamentos
 * ============================================================================
 * 
 * Re-exporta todos os handlers de domínio de um único ponto.
 * 
 * Cada handler é isolado em seu próprio arquivo:
 * - freightHandler.ts       → Pagamento de frete (logística)
 * - purchaseOrderHandler.ts → Pagamento de pedido de compra (fornecedor)
 * - salesOrderHandler.ts    → Recebimento de pedido de venda (cliente)
 * - commissionHandler.ts    → Pagamento de comissão (corretor)
 * - standaloneHandler.ts    → Despesa administrativa / standalone
 * - cleanupHandler.ts       → Limpeza em cascata ao deletar
 */

// Tipos
export type { PaymentData, PaymentResult, CleanupParams, RegisterFinancialParams } from './orchestratorTypes';

// Helpers
export { resolveAccountId, resolveAccountLabel, registerFinancialRecords, generateTxId, getLogInfo, getCompanyId } from './orchestratorHelpers';

// Handlers de domínio
export { handleFreightPayment } from './freightHandler';
export { handlePurchaseOrderPayment } from './purchaseOrderHandler';
export { handleSalesOrderReceipt } from './salesOrderHandler';
export { handleCommissionPayment } from './commissionHandler';
export { handleStandalonePayment } from './standaloneHandler';
export { cleanupFinancialRecords } from './cleanupHandler';
