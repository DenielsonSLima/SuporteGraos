
import { payablesService } from '../payablesService';
import { generateTxId, registerFinancialRecords } from './orchestratorHelpers';
import type { PaymentData, PaymentResult } from './orchestratorTypes';
import { isSqlCanonicalOpsEnabled } from '../../sqlCanonicalOps';

/**
 * Handler para pagamento de Comissão (Corretores).
 * Refatorado para usar rpc_ops_financial_process_action (SQL-First).
 */
export const handleCommissionPayment = async (
  recordId: string,
  data: PaymentData
): Promise<PaymentResult> => {
  const txId = generateTxId();
  const { supabase } = await import('../../supabase');
  const canonicalOpsEnabled = isSqlCanonicalOpsEnabled();

  let entryId = '';
  let commissionId = '';
  let brokerName = data.entityName || 'Corretor';
  let purchaseOrderId = '';

  // 1. Resolução do ID do Lançamento Financeiro (entry_id)
  if (canonicalOpsEnabled) {
    // Busca direta via view enriquecida (que vincula brokerage a entries)
    const { data: entry } = await supabase
      .from('vw_payables_enriched')
      .select('id, origin_id, partner_name, purchase_order_id')
      .or(`id.eq.${recordId},origin_id.eq.${recordId}`)
      .eq('origin_type', 'commission')
      .maybeSingle();

    if (entry) {
      entryId = entry.id;
      commissionId = entry.origin_id || '';
      brokerName = entry.partner_name || brokerName;
      purchaseOrderId = entry.purchase_order_id || '';
    }
  } else {
    // MODO LEGADO (Fallback)
    await payablesService.loadFromSupabase();
    const payable = payablesService.getById(recordId) || payablesService.getAll().find(p => p.subType === 'commission' && p.purchaseOrderId === recordId);
    if (payable) {
      entryId = payable.id;
      commissionId = payable.id; // Em legado, o entry_id costuma ser o ID do payable
      brokerName = payable.partnerName || brokerName;
      purchaseOrderId = payable.purchaseOrderId || '';
    }
  }

  if (!entryId) {
    throw new Error(`Não foi possível localizar o lançamento financeiro de comissão para: ${recordId}`);
  }

  // 2. Descrição formatada
  const description = `Pagamento Comissão: ${brokerName}`;

  // 3. EXECUÇÃO ATÔMICA (RPC SQL-First)
  const { data: result, error: rpcError } = await supabase.rpc('rpc_ops_financial_process_action', {
    p_entry_id: entryId,
    p_account_id: data.accountId,
    p_amount: data.amount,
    p_discount: data.discount || 0,
    p_description: description,
    p_transaction_date: data.date,
    p_metadata: { source: 'commissionHandler', tx_id: txId }
  });

  if (rpcError || (result && !result.success)) {
    throw new Error(`Erro no processamento SQL de pagamento de comissão: ${rpcError?.message || result?.error}`);
  }

  // 4. Registro de Histórico (Compatibilidade de UI)
  await registerFinancialRecords({
    txId,
    date: data.date,
    amount: data.amount,
    discount: data.discount || 0,
    accountId: data.accountId,
    accountName: data.accountName,
    type: 'payment',
    recordId: entryId,
    referenceType: 'commission',
    referenceId: commissionId || recordId,
    description,
    historyType: 'Pagamento Comissão',
    entityName: brokerName,
    partnerId: data.partnerId,
    notes: data.notes,
    purchaseOrderId
  });

  return { success: true, txId };
};
