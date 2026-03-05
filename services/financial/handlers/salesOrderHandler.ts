
import { receivablesService, Receivable } from '../receivablesService';
import { generateTxId, registerFinancialRecords } from './orchestratorHelpers';
import type { PaymentData, PaymentResult } from './orchestratorTypes';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../../sqlCanonicalOps';

/**
 * Handler para recebimento de Pedido de Venda (Cliente).
 * Refatorado para SQL Canonical Ops — usa financial_entries + RPCs.
 */
export const handleSalesOrderReceipt = async (
  recordId: string,
  data: PaymentData
): Promise<PaymentResult> => {
  const canonicalOpsEnabled = isSqlCanonicalOpsEnabled();
  const txId = generateTxId();
  const transactionValue = data.amount;
  const discountValue = data.discount;

  const { supabase } = await import('../../supabase');

  let entryId = '';
  let orderId = '';
  let customerName = data.entityName || 'Cliente';

  // Extrair orderId de prefixo legado (chamado de dentro do Ped. Venda)
  const resolvedRecordId = recordId.startsWith('so-') ? recordId.replace('so-', '') : recordId;

  if (canonicalOpsEnabled) {
    // SQL-FIRST: Tentativa 1 — resolvedRecordId é o financial_entries.id
    const { data: directEntry } = await supabase
      .from('financial_entries')
      .select('id, origin_id, origin_type, partner_id')
      .eq('id', resolvedRecordId)
      .maybeSingle();

    if (directEntry) {
      entryId = directEntry.id;
      orderId = directEntry.origin_id || '';
    } else {
      // Tentativa 2: resolvedRecordId é o origin_id (order UUID)
      const { data: byOrigin } = await supabase
        .from('financial_entries')
        .select('id, origin_id, origin_type, partner_id')
        .eq('origin_id', resolvedRecordId)
        .eq('origin_type', 'sales_order')
        .maybeSingle();

      if (byOrigin) {
        entryId = byOrigin.id;
        orderId = byOrigin.origin_id || resolvedRecordId;
      }
    }

    // Tentativa 3: Se não encontrou, chamar rebuild RPC para criar a entry on-the-fly
    if (!entryId && resolvedRecordId) {
      const { data: rebuildResult, error: rebuildErr } = await supabase.rpc(
        'rpc_ops_sales_rebuild_financial_v1',
        { p_origin_id: resolvedRecordId }
      );
      if (rebuildResult && !rebuildErr) {
        entryId = rebuildResult;
        orderId = resolvedRecordId;
      }
    }

    // Buscar nome do cliente via VIEW
    if (entryId) {
      const { data: viewInfo } = await supabase
        .from('vw_receivables_enriched')
        .select('partner_name, sales_order_number')
        .eq('id', entryId)
        .maybeSingle();
      if (viewInfo) {
        customerName = viewInfo.partner_name || customerName;
      }
    }
  } else {
    // MODO LEGADO
    await receivablesService.loadFromSupabase();

    const orderIdFromPrefix = recordId.startsWith('so-') ? resolvedRecordId : '';
    const directReceivable = receivablesService.getById(recordId);
    orderId = orderIdFromPrefix || directReceivable?.salesOrderId || '';
    const receivable = directReceivable || (orderId ? receivablesService.getAll().find(r => r.salesOrderId === orderId) : undefined);

    if (receivable) {
      const newReceived = Number(((receivable.receivedAmount || 0) + transactionValue + discountValue).toFixed(2));
      const status: Receivable['status'] = newReceived >= (receivable.amount - 0.01)
        ? 'received' : newReceived > 0 ? 'partially_received' : 'pending';

      receivablesService.update({
        ...receivable, receivedAmount: newReceived, receiptDate: data.date,
        paymentMethod: data.accountName || receivable.paymentMethod,
        bankAccountId: data.accountId || receivable.bankAccountId, status
      });
    }

    customerName = receivable?.partnerName || data.entityName || 'Cliente';
    entryId = receivable?.id || recordId;
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

  const description = `Recebimento Venda: ${customerName}${installmentSuffix}`;

  // ✅ SINGLE LEDGER FIRST: RPC executa ANTES do registerFinancialRecords
  if (entryId && data.accountId) {
    if (transactionValue > 0) {
      const { error: payErr } = await supabase.rpc('pay_financial_entry', {
        p_entry_id: entryId,
        p_account_id: data.accountId,
        p_amount: transactionValue,
        p_description: description
      });
      if (payErr) throw new Error(`Erro ao processar recebimento: ${payErr.message}`);
    }
    if (discountValue > 0) {
      const { error: discErr } = await supabase.rpc('apply_discount_financial_entry', {
        p_entry_id: entryId,
        p_amount: discountValue
      });
      if (discErr) throw new Error(`Erro ao aplicar desconto: ${discErr.message}`);
    }
  } else if (!entryId) {
    const targetOriginId = orderId || recordId;
    const { data: entries } = await supabase
      .from('financial_entries')
      .select('id')
      .eq('origin_id', targetOriginId)
      .eq('origin_type', 'sales_order');
    const entry = entries?.[0];
    if (entry && data.accountId) {
      entryId = entry.id;
      if (transactionValue > 0) {
        const { error: payErr } = await supabase.rpc('pay_financial_entry', { p_entry_id: entry.id, p_account_id: data.accountId, p_amount: transactionValue, p_description: description });
        if (payErr) throw new Error(`Erro ao processar recebimento: ${payErr.message}`);
      }
      if (discountValue > 0) {
        const { error: discErr } = await supabase.rpc('apply_discount_financial_entry', { p_entry_id: entry.id, p_amount: discountValue });
        if (discErr) throw new Error(`Erro ao aplicar desconto: ${discErr.message}`);
      }
    }
  }

  // Validar que o entryId foi resolvido
  if (!entryId) {
    throw new Error(`Entrada financeira não encontrada para o registro: ${recordId}`);
  }

  // --- Registrar histórico + standalone (transação já feita pelo RPC) ---
  await registerFinancialRecords({
    txId,
    date: data.date,
    amount: transactionValue,
    discount: discountValue,
    accountId: data.accountId,
    accountName: data.accountName,
    type: 'receipt',
    recordId: entryId || recordId,
    referenceType: 'sales_order',
    referenceId: orderId || recordId,
    description,
    historyType: 'Receita Operacional',
    entityName: customerName,
    partnerId: data.partnerId,
    notes: data.notes
  });

  return { success: true, txId };
};
