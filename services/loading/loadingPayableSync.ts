/**
 * ============================================================================
 * ⚠️ LEGACY: LOADING PAYABLE SYNC — Sincronização de Contas a Pagar
 * ============================================================================
 * 
 * Em modo canônico (SQL Canonical Ops), todas as funções retornam early
 * via isSqlCanonicalOpsEnabled(). Os handlers (purchaseOrderHandler,
 * freightHandler) usam RPCs diretamente.
 * 
 * TODO: Remover completamente após confirmar que modo canônico está
 * ativo em produção para todos os tenants.
 */

import { Loading } from '../../modules/Loadings/types';
import { payablesService } from '../financial/payablesService';
import { purchaseService } from '../purchaseService';
import { generateUUID } from './loadingMapper';
import { getTodayBR } from '../../utils/dateUtils';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../sqlCanonicalOps';

// ============================================================================
// SYNC: Payable do FORNECEDOR (Agregado por pedido de compra)
// ============================================================================

/**
 * Recalcula e sincroniza o payable de compra para um pedido, somando
 * os totais de TODAS as cargas vinculadas ao pedido.
 */
export const syncPurchaseOrderPayable = async (
  purchaseOrderId: string,
  companyId: string | undefined,
  getByPurchaseOrder: (id: string) => Loading[]
) => {
  if (isSqlCanonicalOpsEnabled()) {
    sqlCanonicalOpsLog('syncPurchaseOrderPayable ignorado: SQL canônico ativo');
    return;
  }

  const purchaseOrder = purchaseService.getById(purchaseOrderId);

  if (!purchaseOrder || !purchaseOrder.partnerId) {
    return;
  }

  // Buscar cargas ativas do pedido
  const allLoadings = getByPurchaseOrder(purchaseOrderId).filter(
    (l) => l.status !== 'canceled'
  );

  // Calcular totais
  const totalPurchaseAmount = allLoadings.reduce((sum, l) => sum + (Number(l.totalPurchaseValue) || 0), 0);
  const totalPurchasePaid = allLoadings.reduce((sum, l) => sum + (Number(l.productPaid) || 0), 0);
  const totalWeightKg = allLoadings.reduce((sum, l) => sum + (Number(l.weightKg) || 0), 0);


  // Buscar payable existente
  const existingPayable = payablesService.getAll().find(p =>
    p.purchaseOrderId === purchaseOrderId &&
    p.subType === 'purchase_order'
  );

  if (existingPayable) {
    if (totalPurchaseAmount === 0 && totalPurchasePaid === 0) {
      payablesService.delete(existingPayable.id);
    } else {
      payablesService.update({
        ...existingPayable,
        amount: totalPurchaseAmount,
        paidAmount: totalPurchasePaid,
        weightKg: totalWeightKg,
        loadCount: allLoadings.length,
        status: totalPurchasePaid >= totalPurchaseAmount ? 'paid' : totalPurchasePaid > 0 ? 'partially_paid' : 'pending'
      });
    }
  } else if (totalPurchaseAmount > 0) {
    try {
      payablesService.add({
        id: generateUUID(),
        purchaseOrderId: purchaseOrderId,
        partnerId: purchaseOrder.partnerId,
        partnerName: purchaseOrder.partnerName || 'Fornecedor',
        description: `Compra de Grãos - Pedido ${purchaseOrder.number}`,
        dueDate: allLoadings[0]?.date || getTodayBR(),
        amount: totalPurchaseAmount,
        paidAmount: totalPurchasePaid,
        weightKg: totalWeightKg,
        loadCount: allLoadings.length,
        status: totalPurchasePaid >= totalPurchaseAmount ? 'paid' : totalPurchasePaid > 0 ? 'partially_paid' : 'pending',
        subType: 'purchase_order',
        notes: `Gerado automaticamente via Logística. Total Cargas: ${allLoadings.length}`,
        companyId: companyId
      });
    } catch (err) {
    }
  }
};

// ============================================================================
// CRIAÇÃO: Payable de FRETE (Individual por carregamento)
// ============================================================================

/**
 * Cria um payable de frete para um carregamento novo.
 * Chamado no loadingService.add() quando há valor de frete + transportadora.
 */
export const createFreightPayable = async (loading: Loading) => {
  if (isSqlCanonicalOpsEnabled()) {
    sqlCanonicalOpsLog('createFreightPayable ignorado: SQL canônico ativo');
    return;
  }

  if (!loading.totalFreightValue || loading.totalFreightValue <= 0 || !loading.carrierId) return;

  const freightAmount = Number(loading.totalFreightValue) || 0;
  const totalDisc = loading.transactions?.reduce((acc: number, t: any) => acc + (t.discountValue || 0), 0) || 0;
  const freightPaidAmount = (Number(loading.freightPaid) || 0) + totalDisc;

  // Buscar número do pedido para a descrição se disponível
  let poNumber = '';
  if (loading.purchaseOrderId) {
    const po = purchaseService.getById(loading.purchaseOrderId);
    if (po) poNumber = ` - Pedido ${po.number}`;
  }


  payablesService.add({
    id: generateUUID(),
    loadingId: loading.id,
    purchaseOrderId: loading.purchaseOrderId,
    partnerId: loading.carrierId,
    partnerName: loading.carrierName,
    driverName: loading.driverName,
    weightKg: loading.weightKg,
    description: `Frete do carregamento - Placa ${loading.vehiclePlate || 'N/A'}${poNumber}`,
    dueDate: loading.date,
    amount: freightAmount,
    paidAmount: freightPaidAmount,
    status: freightPaidAmount >= freightAmount ? 'paid' : 'pending',
    subType: 'freight',
    notes: `Carregamento: ${loading.weightKg}kg`,
    companyId: loading.companyId
  });


};

// ============================================================================
// SYNC: Payable de FRETE existente (ao editar carregamento)
// ============================================================================

/**
 * Sincroniza o payable de frete ao atualizar um carregamento.
 * Cria o payable se não existir, ou atualiza se houve mudança de valores.
 */
export const syncFreightPayable = async (updatedLoading: Loading) => {
  if (isSqlCanonicalOpsEnabled()) {
    sqlCanonicalOpsLog('syncFreightPayable ignorado: SQL canônico ativo');
    return;
  }

  if (!updatedLoading.totalFreightValue || updatedLoading.totalFreightValue <= 0) return;

  const allPayables = payablesService.getAll();
  let freightPayable = allPayables.find(
    p => p.loadingId === updatedLoading.id && p.subType === 'freight'
  );

  const freightAmount = Number(updatedLoading.totalFreightValue) || 0;
  const totalDisc = updatedLoading.transactions?.reduce((acc: number, t: any) => acc + (t.discountValue || 0), 0) || 0;
  const freightPaid = (Number(updatedLoading.freightPaid) || 0) + totalDisc;

  if (!freightPayable && updatedLoading.carrierId) {
    // Payable não existe — criar agora (correção automática ao editar)

    let poNumber = '';
    if (updatedLoading.purchaseOrderId) {
      const po = purchaseService.getById(updatedLoading.purchaseOrderId);
      if (po) poNumber = ` - Pedido ${po.number}`;
    }

    payablesService.add({
      id: generateUUID(),
      loadingId: updatedLoading.id,
      purchaseOrderId: updatedLoading.purchaseOrderId || undefined,
      partnerId: updatedLoading.carrierId,
      partnerName: updatedLoading.carrierName,
      driverName: updatedLoading.driverName,
      weightKg: updatedLoading.weightKg,
      description: `Frete do carregamento - Placa ${updatedLoading.vehiclePlate || 'N/A'}${poNumber}`,
      dueDate: updatedLoading.date,
      amount: freightAmount,
      paidAmount: freightPaid,
      status: freightPaid >= freightAmount ? 'paid' : freightPaid > 0 ? 'partially_paid' : 'pending',
      subType: 'freight',
      notes: `Carregamento: ${updatedLoading.weightKg}kg`,
      companyId: updatedLoading.companyId
    });
  } else if (freightPayable) {
    // Payable existe — sincronizar se valores mudaram
    if (Math.abs(freightPayable.paidAmount - freightPaid) > 0.01 || Math.abs(freightPayable.amount - freightAmount) > 0.01) {

      payablesService.update({
        ...freightPayable,
        amount: freightAmount,
        paidAmount: freightPaid,
        weightKg: updatedLoading.weightKg,
        status: freightPaid >= freightAmount ? 'paid' : freightPaid > 0 ? 'partially_paid' : 'pending'
      });


    }
  }
};
