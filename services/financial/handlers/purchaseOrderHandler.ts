
import { payablesService, Payable } from '../payablesService';
import { generateTxId, registerFinancialRecords } from './orchestratorHelpers';
import type { PaymentData, PaymentResult } from './orchestratorTypes';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../../sqlCanonicalOps';
import { PurchaseOrder, OrderTransaction } from '../../../modules/PurchaseOrder/types';

/**
 * Handler para pagamento de Pedido de Compra (Produtor).
 * Refatorado para SQL Canonical Ops — usa financial_entries + RPCs.
 */
export const handlePurchaseOrderPayment = async (
  recordId: string,
  data: PaymentData
): Promise<PaymentResult> => {
  const canonicalOpsEnabled = isSqlCanonicalOpsEnabled();
  const txId = generateTxId();
  const transactionValue = data.amount;
  const discountValue = data.discount;



  const { supabase } = await import('../../supabase');

  // =====================================================================
  // SQL-FIRST: Resolver a financial_entry diretamente pelo recordId
  // No modo canônico, recordId já é o UUID de financial_entries
  // =====================================================================
  let entryId = '';
  let orderId = '';
  let supplierName = data.entityName || 'Fornecedor';
  let orderNumber = '';

  // Extrair orderId de prefixo legado (chamado de dentro do Ped. Compra)
  const resolvedRecordId = recordId.startsWith('po-grain-') ? recordId.replace('po-grain-', '') : recordId;

  if (canonicalOpsEnabled) {
    // Tentativa 1: resolvedRecordId é diretamente o financial_entries.id
    const { data: directEntry, error: err1 } = await supabase
      .from('financial_entries')
      .select('id, origin_id, origin_type, partner_id')
      .eq('id', resolvedRecordId)
      .maybeSingle();



    if (directEntry) {
      entryId = directEntry.id;
      orderId = directEntry.origin_id || '';
    } else {
      // Tentativa 2: resolvedRecordId é o origin_id (order UUID)
      const { data: byOrigin, error: err2 } = await supabase
        .from('financial_entries')
        .select('id, origin_id, origin_type, partner_id')
        .eq('origin_id', resolvedRecordId)
        .eq('origin_type', 'purchase_order')
        .maybeSingle();



      if (byOrigin) {
        entryId = byOrigin.id;
        orderId = byOrigin.origin_id || resolvedRecordId;
      }
    }

    // Tentativa 3: Se não encontrou, chamar rebuild RPC para criar a entry on-the-fly
    if (!entryId && resolvedRecordId) {

      const { data: rebuildResult, error: rebuildErr } = await supabase.rpc(
        'rpc_ops_purchase_rebuild_financial_v1',
        { p_origin_id: resolvedRecordId }
      );


      if (rebuildResult && !rebuildErr) {
        entryId = rebuildResult;
        orderId = resolvedRecordId;
      }
    }



    // Buscar nome do fornecedor e número do pedido via SQL
    if (entryId) {
      const { data: orderInfo } = await supabase
        .from('vw_payables_enriched')
        .select('partner_name, order_number')
        .eq('id', entryId)
        .maybeSingle();
      if (orderInfo) {
        supplierName = orderInfo.partner_name || supplierName;
        orderNumber = orderInfo.order_number || '';
      }
    }
  } else {
    // MODO LEGADO: usa payablesService
    await payablesService.loadFromSupabase();

    const isPayableUUID = !recordId.startsWith('po-grain-');
    let payable: Payable | undefined;
    let order: PurchaseOrder | undefined;

    if (isPayableUUID) {
      payable = payablesService.getById(recordId);
      if (payable) {
        orderId = payable.purchaseOrderId || '';
      } else {
        orderId = recordId;
      }
    } else {
      orderId = recordId.replace('po-grain-', '');
    }

    if (orderId) {
      const { purchaseService } = await import('../../purchaseService');
      order = purchaseService.getById(orderId);
    }

    if (!payable && order) {
      payable = payablesService.getAll().find(p => p.purchaseOrderId === order.id && p.subType === 'purchase_order');
    }

    if (payable) {
      const newPaidAmount = (payable.paidAmount || 0) + transactionValue + discountValue;
      const status: Payable['status'] = newPaidAmount >= (payable.amount - 0.01)
        ? 'paid' : newPaidAmount > 0 ? 'partially_paid' : 'pending';

      payablesService.update({
        ...payable,
        paidAmount: Number(newPaidAmount.toFixed(2)),
        status,
        paymentMethod: data.accountName,
        bankAccountId: data.accountId,
        paymentDate: data.date
      });
    }

    supplierName = payable?.partnerName || order?.partnerName || data.entityName || 'Fornecedor';
    orderNumber = order?.number || '';
    entryId = payable?.id || recordId;
  }

  // Contar parcelas anteriores via financial_transactions
  let installmentSuffix = '';
  if (entryId) {
    const { data: prevTxs } = await supabase
      .from('financial_transactions')
      .select('id')
      .eq('entry_id', entryId);
    const count = prevTxs?.length || 0;
    if (count > 0) installmentSuffix = ` - ${count + 1}ª Parcela`;
  }

  const description = `Pagamento Fornecedor: ${supplierName}${orderNumber ? ` - Pedido ${orderNumber}` : ''}${installmentSuffix}`;

  // ✅ SINGLE LEDGER FIRST: Processar pagamento via RPC (atualiza paid_amount + saldo bancário)
  // RPCs devem rodar ANTES do registerFinancialRecords para garantir atomicidade

  if (entryId && data.accountId) {
    if (transactionValue > 0) {

      const { error: payErr } = await supabase.rpc('pay_financial_entry', {
        p_entry_id: entryId,
        p_account_id: data.accountId,
        p_amount: transactionValue,
        p_description: description
      });

      if (payErr) throw new Error(`Erro ao processar pagamento: ${payErr.message}`);
    }

    if (discountValue > 0) {
      const { error: discErr } = await supabase.rpc('apply_discount_financial_entry', {
        p_entry_id: entryId,
        p_amount: discountValue
      });
      if (discErr) throw new Error(`Erro ao aplicar desconto: ${discErr.message}`);
    }
  } else if (!entryId) {
    // Fallback: busca por origin_id
    const targetOriginId = orderId || recordId;
    const { data: entries } = await supabase
      .from('financial_entries')
      .select('id')
      .eq('origin_id', targetOriginId)
      .eq('origin_type', 'purchase_order');

    const entry = entries?.[0];
    if (entry && data.accountId) {
      entryId = entry.id; // Armazena para uso no registerFinancialRecords
      if (transactionValue > 0) {
        const { error: payErr } = await supabase.rpc('pay_financial_entry', {
          p_entry_id: entry.id,
          p_account_id: data.accountId,
          p_amount: transactionValue,
          p_description: description
        });
        if (payErr) throw new Error(`Erro ao processar pagamento: ${payErr.message}`);
      }
      if (discountValue > 0) {
        const { error: discErr } = await supabase.rpc('apply_discount_financial_entry', {
          p_entry_id: entry.id,
          p_amount: discountValue
        });
        if (discErr) throw new Error(`Erro ao aplicar desconto: ${discErr.message}`);
      }
    }
  }

  // Validar que o entryId foi resolvido (pagamento só pode ocorrer com entry válida)
  if (!entryId) {
    throw new Error(`Entrada financeira não encontrada para o registro: ${recordId}`);
  }

  // --- Registrar via Orquestrador (histórico + standalone — transação já feita pelo RPC) ---
  await registerFinancialRecords({
    txId,
    date: data.date,
    amount: transactionValue,
    discount: discountValue,
    accountId: data.accountId,
    accountName: data.accountName,
    type: 'payment',
    recordId: entryId || recordId,
    referenceType: 'purchase_order',
    referenceId: orderId || recordId,
    description,
    historyType: 'Pagamento Fornecedor',
    entityName: supplierName,
    partnerId: data.partnerId,
    notes: data.notes
  });

  return { success: true, txId };
};
