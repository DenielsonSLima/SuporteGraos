/**
 * ============================================================================
 * LOADING HISTORY SYNC — Sincronização de Histórico Financeiro
 * ============================================================================
 * 
 * Detecta mudanças financeiras entre a versão antiga e nova de um carregamento
 * e registra no financial_history (pagamentos/estornos de frete e produto).
 */

import { Loading } from '../../modules/Loadings/types';
import { financialHistoryService } from '../financial/financialHistoryService';
import { ledgerService } from '../ledgerService';
import { getTodayBR } from '../../utils/dateUtils';

/**
 * Detecta e registra mudanças financeiras no financial_history
 * ao atualizar um carregamento (diff entre old e new).
 */
export const syncFinancialHistory = (oldLoading: Loading, updatedLoading: Loading) => {
  // 1. Mudanças em FRETE (via Transações)
  const oldTxs = oldLoading.transactions || [];
  const newTxs = updatedLoading.transactions || [];

  // Novos pagamentos de frete
  const newFreightPayments = newTxs.filter(t =>
    (t.type === 'payment' || t.type === 'advance') &&
    !oldTxs.some(old => old.id === t.id)
  );

  for (const tx of newFreightPayments) {
    if (tx.value > 0) {
      const accId = tx.accountId;
      const currentBalance = accId ? ledgerService.getAccountBalance(accId) : 0;
      void financialHistoryService.add({
        id: `fh-${tx.id}`,
        date: tx.date,
        type: 'Pagamento Frete',
        operation: 'outflow',
        amount: tx.value,
        balanceBefore: currentBalance,
        balanceAfter: currentBalance - tx.value,
        bankAccountId: accId,
        description: `Pagamento Frete: ${updatedLoading.vehiclePlate} (${updatedLoading.carrierName})`,
        partnerId: updatedLoading.carrierId,
        referenceType: 'freight',
        referenceId: updatedLoading.id,
        notes: tx.notes
      });
    }
  }

  // Estorno de pagamentos de frete
  const removedFreightPayments = oldTxs.filter(t =>
    (t.type === 'payment' || t.type === 'advance') &&
    !newTxs.some(newTx => newTx.id === t.id)
  );

  for (const tx of removedFreightPayments) {
    if (tx.value > 0) {
      const accId = tx.accountId;
      const currentBalance = accId ? ledgerService.getAccountBalance(accId) : 0;
      void financialHistoryService.add({
        id: `fh-rev-${tx.id}`,
        date: getTodayBR(),
        type: 'Estorno de Frete',
        operation: 'inflow',
        amount: tx.value,
        balanceBefore: currentBalance,
        balanceAfter: currentBalance + tx.value,
        bankAccountId: accId,
        description: `Estorno Frete: ${updatedLoading.vehiclePlate}`,
        partnerId: updatedLoading.carrierId,
        referenceType: 'freight',
        referenceId: updatedLoading.id,
        notes: `Estorno de transação original: ${tx.notes || ''}`
      });
    }
  }

  // 2. Mudanças em Pagamento de PRODUTO (campo productPaid)
  const oldPaid = Number(oldLoading.productPaid) || 0;
  const newPaid = Number(updatedLoading.productPaid) || 0;
  const diffPaid = newPaid - oldPaid;

  if (Math.abs(diffPaid) > 0.01) {
    const isPayment = diffPaid > 0;
    const currentBalance = 0;
    void financialHistoryService.add({
      id: `fh-prod-${Date.now()}`,
      date: getTodayBR(),
      type: isPayment ? 'Pagamento Fornecedor' : 'Estorno Fornecedor',
      operation: isPayment ? 'outflow' : 'inflow',
      amount: Math.abs(diffPaid),
      balanceBefore: currentBalance,
      balanceAfter: currentBalance - diffPaid,
      bankAccountId: undefined,
      description: `${isPayment ? 'Pagamento' : 'Ajuste'} Produto (Logística): ${updatedLoading.vehiclePlate}`,
      partnerId: undefined,
      referenceType: 'purchase_order',
      referenceId: updatedLoading.purchaseOrderId,
      notes: 'Ajuste manual em Carregamento'
    });
  }
};
