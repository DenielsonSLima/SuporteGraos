/**
 * ============================================================================
 * ⚠️ LEGACY: LOADING RECEIVABLE SYNC — Sincronização de Contas a Receber
 * ============================================================================
 * 
 * Em modo canônico (SQL Canonical Ops), todas as funções retornam early
 * via isSqlCanonicalOpsEnabled(). O salesOrderHandler usa RPCs diretamente.
 * 
 * TODO: Remover completamente após confirmar que modo canônico está
 * ativo em produção para todos os tenants.
 */

import { Loading } from '../../modules/Loadings/types';
import { receivablesService, Receivable } from '../financial/receivablesService';
import { salesService } from '../salesService';
import { supabase } from '../supabase';
import { generateUUID } from './loadingMapper';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../sqlCanonicalOps';

/**
 * Cria ou atualiza o receivable consolidado para um pedido de venda
 * com base em todas as cargas que têm peso de descarrego.
 * 
 * @param updatedLoading - O carregamento sendo atualizado
 * @param allLoadings - Todas as cargas do mesmo pedido de venda
 * @param showToast - Callback para notificação
 */
export const syncReceivableFromLoading = async (
  updatedLoading: Loading,
  allLoadings: Loading[],
  showToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void
) => {
  if (isSqlCanonicalOpsEnabled()) {
    sqlCanonicalOpsLog('syncReceivableFromLoading ignorado: SQL canônico ativo');
    return;
  }

  if (!updatedLoading.salesOrderId) {
    return;
  }

  let sale = salesService.getById(updatedLoading.salesOrderId);
  let partnerId = sale?.customerId;
  let partnerName = sale?.customerName;

  // ⚠️ FALLBACK: Se não encontrou no service (cache vazio?), buscar direto no banco
  if (!partnerId) {
    const { data: salesOrderFunc, error } = await supabase
      .from('sales_orders')
      .select('partner_id, partner_name, company_id')
      .eq('id', updatedLoading.salesOrderId)
      .single();

    if (salesOrderFunc && !error) {
      partnerId = salesOrderFunc.partner_id;
      partnerName = salesOrderFunc.partner_name;
      if (!sale) {
        sale = { companyId: salesOrderFunc.company_id } as any;
      }
    } else {
    }
  }

  const relatedLoadings = allLoadings.filter(
    l =>
      l.salesOrderId === updatedLoading.salesOrderId &&
      l.status !== 'canceled' &&
      l.unloadWeightKg &&
      l.unloadWeightKg > 0
  );

  const totals = relatedLoadings.reduce(
    (acc, l) => {
      let unitPrice = l.salesPrice || sale?.unitPrice || 0;
      if (unitPrice === 0 && l.totalSalesValue && l.weightSc) {
        unitPrice = l.totalSalesValue / l.weightSc;
      }
      const sc = l.unloadWeightKg ? l.unloadWeightKg / 60 : 0;
      const value = Number((unitPrice * sc).toFixed(2));
      return { totalSc: acc.totalSc + sc, amount: acc.amount + value };
    },
    { totalSc: 0, amount: 0 }
  );

  const amount = Number(totals.amount.toFixed(2));

  const existingReceivable = receivablesService.getAll().find(r => r.salesOrderId === updatedLoading.salesOrderId);

  if (amount <= 0) {
    if (existingReceivable && (existingReceivable.receivedAmount || 0) <= 0) {
      receivablesService.delete(existingReceivable.id);
    }
    return;
  }

  if (partnerId && amount > 0) {
    const receivedAmount = existingReceivable?.receivedAmount ?? sale?.paidValue ?? 0;
    const status: Receivable['status'] = receivedAmount >= amount
      ? 'received'
      : receivedAmount > 0
        ? 'partially_received'
        : 'pending';

    const receivablePayload: Receivable = {
      id: existingReceivable?.id || generateUUID(),
      salesOrderId: updatedLoading.salesOrderId!,
      partnerId,
      partnerName: partnerName || updatedLoading.customerName,
      description: `Venda #${sale?.number || updatedLoading.salesOrderNumber || 'sem número'}`,
      dueDate: sale?.date || updatedLoading.date,
      amount,
      receivedAmount,
      status,
      notes: `Consolidado ${relatedLoadings.length} cargas | Total destino ${totals.totalSc.toFixed(2)} SC`,
      companyId: (sale as any)?.companyId || updatedLoading.companyId
    };


    if (existingReceivable) {
      receivablesService.update(receivablePayload);
      showToast('success', `✅ Conta a Receber atualizada para ${partnerName || 'Cliente'}`);
    } else {
      receivablesService.add(receivablePayload);
      showToast('success', `✅ Conta a Receber criada para ${partnerName || 'Cliente'}`);
    }


  } else {
  }
};
