
import { payablesService } from '../payablesService';
import { generateTxId, registerFinancialRecords } from './orchestratorHelpers';
import type { PaymentData, PaymentResult } from './orchestratorTypes';
import { isSqlCanonicalOpsEnabled } from '../../sqlCanonicalOps';

/**
 * Handler para pagamento de Frete.
 * Refatorado para usar rpc_ops_financial_process_action (SQL-First).
 */
export const handleFreightPayment = async (
  recordId: string,
  data: PaymentData
): Promise<PaymentResult> => {
  const txId = generateTxId();
  const { supabase } = await import('../../supabase');
  const canonicalOpsEnabled = isSqlCanonicalOpsEnabled();

  let entryId = '';
  let freightId = '';
  let carrierName = data.entityName || 'Transportadora/Motorista';

  // 1. Resolução do ID do Lançamento Financeiro (entry_id)
  if (canonicalOpsEnabled) {
    // Busca direta via view enriquecida (que vincula loadings a entries)
    const { data: entry } = await supabase
      .from('vw_payables_enriched')
      .select('id, origin_id, partner_name')
      .or(`id.eq.${recordId},origin_id.eq.${recordId}`)
      .eq('origin_type', 'freight')
      .maybeSingle();

    if (entry) {
      entryId = entry.id;
      freightId = entry.origin_id || '';
      carrierName = entry.partner_name || carrierName;
    }
  } else {
    // MODO LEGADO (Fallback)
    await payablesService.loadFromSupabase();
    const payable = payablesService.getById(recordId) || payablesService.getAll().find(p => p.loadingId === recordId);
    if (payable) {
      entryId = payable.id;
      freightId = payable.loadingId || '';
      carrierName = payable.partner_name || carrierName;
    }
  }

  if (!entryId) {
    throw new Error(`Não foi possível localizar o lançamento financeiro de frete para: ${recordId}`);
  }

  // 2. Descrição formatada
  const description = `Pagamento Frete: ${carrierName}`;

  // 3. EXECUÇÃO ATÔMICA (RPC SQL-First)
  const { data: result, error: rpcError } = await supabase.rpc('rpc_ops_financial_process_action', {
    p_entry_id: entryId,
    p_account_id: data.accountId,
    p_amount: data.amount,
    p_discount: data.discount || 0,
    p_description: description,
    p_transaction_date: data.date,
    p_metadata: { source: 'freightHandler', tx_id: txId }
  });

  if (rpcError || (result && !result.success)) {
    throw new Error(`Erro no processamento SQL de pagamento de frete: ${rpcError?.message || result?.error}`);
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
