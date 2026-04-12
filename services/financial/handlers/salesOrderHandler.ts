
import { receivablesService } from '../receivablesService';
import { generateTxId, registerFinancialRecords, sanitizeRecordId, isValidUUID } from './orchestratorHelpers';
import type { PaymentData, PaymentResult } from './orchestratorTypes';
import { isSqlCanonicalOpsEnabled } from '../../sqlCanonicalOps';

/**
 * Handler para recebimento de Pedido de Venda.
 * Refatorado para usar rpc_ops_financial_process_action (SQL-First).
 */
export const handleSalesOrderReceipt = async (
  recordId: string,
  data: PaymentData
): Promise<PaymentResult> => {
  const txId = generateTxId();
  const { supabase } = await import('../../supabase');
  const canonicalOpsEnabled = isSqlCanonicalOpsEnabled();

  let entryId = '';
  let salesOrderId = '';
  let customerName = data.entityName || 'Cliente';

  // 1. Resolução do ID do Lançamento Financeiro (entry_id)
  const sanitizedId = sanitizeRecordId(recordId);

  if (canonicalOpsEnabled) {
    // Busca direta via view enriquecida
    const query = supabase.from('vw_receivables_enriched').select('id, sales_order_id, partner_name');
    
    if (isValidUUID(sanitizedId)) {
      const { data: entry } = await query
        .or(`id.eq.${sanitizedId},sales_order_id.eq.${sanitizedId}`)
        .maybeSingle();

      if (entry) {
        entryId = entry.id;
        salesOrderId = entry.sales_order_id || '';
        customerName = entry.partner_name || customerName;
      }
    }
  } else {
    // MODO LEGADO (Fallback)
    await receivablesService.loadFromSupabase();
    const receivable = receivablesService.getById(sanitizedId) || receivablesService.getAll().find(r => r.salesOrderId === sanitizedId);
    if (receivable) {
      entryId = receivable.id;
      salesOrderId = receivable.salesOrderId || '';
      customerName = receivable.partnerName || customerName;
    }
  }

  if (!entryId) {
    throw new Error(`Não foi possível localizar o lançamento financeiro para o pedido de venda: ${recordId}`);
  }

  // 2. Descrição formatada
  const description = `Recebimento Pedido Venda: ${customerName}`;

  // 3. EXECUÇÃO ATÔMICA (RPC SQL-First)
  const { data: result, error: rpcError } = await supabase.rpc('rpc_ops_financial_process_action', {
    p_entry_id: entryId,
    p_account_id: data.accountId,
    p_amount: data.amount,
    p_discount: data.discount || 0,
    p_description: description,
    p_transaction_date: data.date,
    p_metadata: { source: 'salesOrderHandler', tx_id: txId }
  });

  if (rpcError || (result && !result.success)) {
    throw new Error(`Erro no processamento SQL de recebimento: ${rpcError?.message || result?.error}`);
  }

  // 4. Registro de Histórico (Compatibilidade de UI)
  await registerFinancialRecords({
    txId,
    date: data.date,
    amount: data.amount,
    discount: data.discount || 0,
    accountId: data.accountId,
    accountName: data.accountName,
    type: 'receipt',
    recordId: entryId,
    referenceType: 'sales_order',
    referenceId: salesOrderId || recordId,
    description,
    historyType: 'Receita Operacional',
    entityName: customerName,
    partnerId: data.partnerId,
    notes: data.notes
  });

  return { success: true, txId };
};
