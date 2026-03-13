
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

  // 1. Resolver UUID real se recordId for o 'number' ou tiver prefixo
  const isValidUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
  let resolvedRecordId = recordId.startsWith('so-') ? recordId.replace('so-', '') : recordId;

  if (!isValidUuid(resolvedRecordId)) {
    const { data: order } = await supabase
      .from('ops_sales_orders')
      .select('id')
      .eq('number', resolvedRecordId)
      .maybeSingle();

    if (order?.id) {
      resolvedRecordId = order.id;
    }
  }

  if (canonicalOpsEnabled) {
    // RESOLUÇÃO OTIMIZADA: Busca entry e info do parceiro em paralelo ou no mesmo query via VIEW
    // Tentamos encontrar a entry pelo ID direto (UUID) ou pelo origin_id
    const { data: entries } = await supabase
      .from('financial_entries')
      .select(`
        id, 
        origin_id, 
        partner_id,
        vw_receivables_enriched!inner(partner_name, sales_order_number)
      `)
      .or(`id.eq.${resolvedRecordId},origin_id.eq.${resolvedRecordId}`)
      .eq('origin_type', 'sales_order')
      .limit(1);

    const entry = entries?.[0];

    if (entry) {
      entryId = entry.id;
      orderId = entry.origin_id || resolvedRecordId;
      customerName = (entry.vw_receivables_enriched as any)?.partner_name || customerName;
    } else {
      // Tentativa 3: Se não encontrou, chamar rebuild RPC para criar a entry on-the-fly
      if (resolvedRecordId) {
        const { data: rebuildResult, error: rebuildErr } = await supabase.rpc(
          'rpc_ops_sales_rebuild_financial_v1',
          { p_origin_id: resolvedRecordId }
        );
        if (rebuildResult && !rebuildErr) {
          entryId = rebuildResult;
          orderId = resolvedRecordId;

          // Buscar nome do cliente após rebuild (raro)
          const { data: viewInfo } = await supabase
            .from('vw_receivables_enriched')
            .select('partner_name')
            .eq('id', entryId)
            .maybeSingle();
          if (viewInfo) customerName = viewInfo.partner_name || customerName;
        }
      }
    }
  } else {
    // MODO LEGADO (mantido para compatibilidade se canônico estiver off)
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

  // Omitimos o sufixo de parcela para evitar query extra — a descrição base já é clara
  const description = `Recebimento Venda: ${customerName}`;

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
