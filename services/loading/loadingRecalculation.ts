/**
 * ============================================================================
 * LOADING RECALCULATION — Funções de Recálculo Manual
 * ============================================================================
 * 
 * Funções de correção manual que recalculam payables de compra/frete
 * para todos os carregamentos. Usadas via botão admin ou chamada explícita.
 */

import { Loading } from '../../modules/Loadings/types';
import { payablesService } from '../financial/payablesService';
import { generateUUID } from './loadingMapper';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../sqlCanonicalOps';

/**
 * Recalcula TODOS os payables de pedidos de compra (fornecedores).
 * Para cada payable de purchase_order, soma os totais de todas as cargas vinculadas.
 */
export const recalculateAllPurchasePayables = (
  getByPurchaseOrder: (id: string) => Loading[],
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void
) => {
  if (isSqlCanonicalOpsEnabled()) {
    sqlCanonicalOpsLog('recalculateAllPurchasePayables ignorado: SQL canônico ativo');
    return;
  }

  const allPayables = payablesService.getAll();
  const purchasePayables = allPayables.filter(p => p.subType === 'purchase_order');


  purchasePayables.forEach(payable => {
    if (!payable.purchaseOrderId) {
      return;
    }

    const allLoadings = getByPurchaseOrder(payable.purchaseOrderId);

    if (allLoadings.length === 0) {
      return;
    }

    const totalPurchaseAmount = allLoadings.reduce((sum, l) => sum + (Number(l.totalPurchaseValue) || 0), 0);
    const totalPurchasePaid = allLoadings.reduce((sum, l) => sum + (Number(l.productPaid) || 0), 0);
    const totalWeightKg = allLoadings.reduce((sum, l) => sum + (Number(l.weightKg) || 0), 0);


    payablesService.update({
      ...payable,
      amount: totalPurchaseAmount,
      paidAmount: totalPurchasePaid,
      weightKg: totalWeightKg,
      loadCount: allLoadings.length,
      status: totalPurchasePaid >= totalPurchaseAmount ? 'paid' : totalPurchasePaid > 0 ? 'partially_paid' : 'pending'
    });
  });

};

/**
 * Recalcula TODOS os payables de FRETE.
 * Para cada carregamento com valor de frete, garante que existe um payable correspondente.
 */
export const recalculateAllFreightPayables = (
  getAllLoadings: () => Loading[],
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void
) => {
  if (isSqlCanonicalOpsEnabled()) {
    sqlCanonicalOpsLog('recalculateAllFreightPayables ignorado: SQL canônico ativo');
    return;
  }

  const allLoadings = getAllLoadings();
  const allPayables = payablesService.getAll();
  let createdCount = 0;

  allLoadings.forEach(loading => {
    if (loading.totalFreightValue && loading.totalFreightValue > 0 && loading.carrierId) {
      const freightPayable = allPayables.find(
        p => p.loadingId === loading.id && p.subType === 'freight'
      );

      if (!freightPayable) {

        const freightAmount = Number(loading.totalFreightValue) || 0;
        const totalDisc = loading.transactions?.reduce((acc: number, t: any) => acc + (t.discountValue || 0), 0) || 0;
        const freightPaidAmount = (Number(loading.freightPaid) || 0) + totalDisc;

        payablesService.add({
          id: generateUUID(),
          loadingId: loading.id,
          purchaseOrderId: loading.purchaseOrderId || undefined,
          partnerId: loading.carrierId,
          partnerName: loading.carrierName,
          driverName: loading.driverName,
          weightKg: loading.weightKg,
          description: `Frete do carregamento - Placa ${loading.vehiclePlate || 'N/A'}`,
          dueDate: loading.date,
          amount: freightAmount,
          paidAmount: freightPaidAmount,
          status: freightPaidAmount >= freightAmount ? 'paid' : freightPaidAmount > 0 ? 'partially_paid' : 'pending',
          subType: 'freight',
          notes: `Auto-gerado na correção. Carregamento: ${loading.weightKg}kg`
        });
        createdCount++;
      }
    }
  });

  if (createdCount > 0) {
    showToast('success', `${createdCount} fretes foram sincronizados com o financeiro.`);
  } else {
  }
};
