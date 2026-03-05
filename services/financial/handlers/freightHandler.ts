
import { payablesService, Payable } from '../payablesService';
import { generateTxId, registerFinancialRecords } from './orchestratorHelpers';
import type { PaymentData, PaymentResult } from './orchestratorTypes';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../../sqlCanonicalOps';

/**
 * Handler para pagamento de Frete (Logística).
 * Refatorado para SQL Canonical Ops — usa financial_entries + RPCs.
 */
export const handleFreightPayment = async (
  recordId: string,
  data: PaymentData
): Promise<PaymentResult> => {
  const canonicalOpsEnabled = isSqlCanonicalOpsEnabled();
  const txId = generateTxId();
  const transactionValue = data.amount;
  const discountValue = data.discount;

  const { supabase } = await import('../../supabase');

  let entryId = '';
  let loadingId = '';
  let carrierName = data.entityName || 'Transportadora';

  // Extrair loadingId de prefixo legado (chamado de dentro da Logística)
  const resolvedRecordId = recordId.startsWith('fr-') ? recordId.replace('fr-', '') : recordId;

  if (canonicalOpsEnabled) {
    // SQL-FIRST: Tentativa 1 — resolvedRecordId é o financial_entries.id
    const { data: directEntry } = await supabase
      .from('financial_entries')
      .select('id, origin_id, origin_type, partner_id')
      .eq('id', resolvedRecordId)
      .maybeSingle();

    if (directEntry) {
      entryId = directEntry.id;
      loadingId = directEntry.origin_id || '';
    } else {
      // Tentativa 2: resolvedRecordId é o origin_id (loading UUID)
      const { data: byOrigin } = await supabase
        .from('financial_entries')
        .select('id, origin_id, origin_type, partner_id')
        .eq('origin_id', resolvedRecordId)
        .eq('origin_type', 'freight')
        .maybeSingle();

      if (byOrigin) {
        entryId = byOrigin.id;
        loadingId = byOrigin.origin_id || resolvedRecordId;
      }
    }

    // Tentativa 3: Se não encontrou, chamar rebuild RPC para criar a entry on-the-fly
    if (!entryId && resolvedRecordId) {
      const { data: rebuildResult, error: rebuildErr } = await supabase.rpc(
        'rpc_ops_loading_rebuild_freight_financial_v1',
        { p_origin_id: resolvedRecordId }
      );
      if (rebuildResult && !rebuildErr) {
        entryId = rebuildResult;
        loadingId = resolvedRecordId;
      }
    }

    // Buscar nome do transportador via VIEW
    if (entryId) {
      const { data: viewInfo } = await supabase
        .from('vw_payables_enriched')
        .select('partner_name, freight_driver_name, freight_vehicle_plate')
        .eq('id', entryId)
        .maybeSingle();
      if (viewInfo) {
        carrierName = viewInfo.partner_name || carrierName;
      }
    }
  } else {
    // MODO LEGADO
    await payablesService.loadFromSupabase();

    const isPayableUUID = !recordId.startsWith('fr-');
    let payable: Payable | undefined;

    if (isPayableUUID) {
      payable = payablesService.getById(recordId);
      if (payable) loadingId = payable.loadingId || '';
    } else {
      loadingId = resolvedRecordId;
      payable = payablesService.getAll().filter(p => p.subType === 'freight').find(p => p.loadingId === loadingId);
    }

    if (loadingId) {
      const { loadingService } = await import('../../loadingService');
      const loading = loadingService.getAll().find(l => l.id === loadingId);
      if (loading) {
        const commonTx = {
          id: txId, date: data.date, value: transactionValue, discountValue,
          accountId: data.accountId, accountName: data.accountName, notes: data.notes, type: 'payment'
        };
        loadingService.update({
          ...loading,
          freightPaid: Number(((loading.freightPaid || 0) + transactionValue).toFixed(2)),
          transactions: [commonTx as any, ...(loading.transactions || [])]
        });
      }
    }

    if (payable) {
      const newPaidAmount = (payable.paidAmount || 0) + transactionValue + discountValue;
      const status: Payable['status'] = newPaidAmount >= (payable.amount - 0.01) ? 'paid' : newPaidAmount > 0 ? 'partially_paid' : 'pending';
      payablesService.update({
        ...payable, paidAmount: Number(newPaidAmount.toFixed(2)), status,
        paymentMethod: data.accountName, bankAccountId: data.accountId, paymentDate: data.date
      });
    }

    carrierName = payable?.partnerName || data.entityName || 'Transportadora';
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

  const description = `Pagamento Frete: ${carrierName}${installmentSuffix}`;

  // ✅ SINGLE LEDGER FIRST: RPC executa ANTES do registerFinancialRecords
  if (entryId && data.accountId) {
    if (transactionValue > 0) {
      const { error: payErr } = await supabase.rpc('pay_financial_entry', {
        p_entry_id: entryId,
        p_account_id: data.accountId,
        p_amount: transactionValue,
        p_description: description
      });
      if (payErr) throw new Error(`Erro ao processar pagamento frete: ${payErr.message}`);
    }
    if (discountValue > 0) {
      const { error: discErr } = await supabase.rpc('apply_discount_financial_entry', {
        p_entry_id: entryId,
        p_amount: discountValue
      });
      if (discErr) throw new Error(`Erro ao aplicar desconto frete: ${discErr.message}`);
    }
  } else if (!entryId) {
    const targetOriginId = loadingId || recordId;
    const { data: entries } = await supabase
      .from('financial_entries')
      .select('id')
      .eq('origin_id', targetOriginId)
      .eq('origin_type', 'freight');
    const entry = entries?.[0];
    if (entry && data.accountId) {
      entryId = entry.id;
      if (transactionValue > 0) {
        const { error: payErr } = await supabase.rpc('pay_financial_entry', { p_entry_id: entry.id, p_account_id: data.accountId, p_amount: transactionValue, p_description: description });
        if (payErr) throw new Error(`Erro ao processar pagamento frete: ${payErr.message}`);
      }
      if (discountValue > 0) {
        const { error: discErr } = await supabase.rpc('apply_discount_financial_entry', { p_entry_id: entry.id, p_amount: discountValue });
        if (discErr) throw new Error(`Erro ao aplicar desconto frete: ${discErr.message}`);
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
    type: 'payment',
    recordId: entryId || recordId,
    referenceType: 'loading',
    referenceId: loadingId || recordId,
    description,
    historyType: 'Pagamento Frete',
    entityName: carrierName,
    partnerId: data.partnerId,
    notes: data.notes
  });

  return { success: true, txId };
};
