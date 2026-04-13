
import { payablesService } from '../payablesService';
import { generateTxId, registerFinancialRecords, sanitizeRecordId, isValidUUID } from './orchestratorHelpers';
import type { PaymentData, PaymentResult } from './orchestratorTypes';
import { isSqlCanonicalOpsEnabled } from '../../sqlCanonicalOps';

/**
 * Handler para pagamento de Pedido de Compra.
 * Refatorado para usar rpc_ops_financial_process_action (SQL-First).
 */
export const handlePurchaseOrderPayment = async (
  recordId: string,
  data: PaymentData
): Promise<PaymentResult> => {
  const txId = generateTxId();
  const { supabase } = await import('../../supabase');
  const canonicalOpsEnabled = isSqlCanonicalOpsEnabled();

  let entryId = '';
  let purchaseOrderId = '';
  let supplierName = data.entityName || 'Fornecedor';

  // 1. Resolução do ID do Lançamento Financeiro (entry_id)
  const sanitizedId = sanitizeRecordId(recordId);

  if (canonicalOpsEnabled) {
    // Busca direta via view enriquecida para garantir que temos o ID correto
    // Utilizamos origin_id pois a view mapeia a origem (Pedido de Compra) ao lançamento
    const query = supabase.from('vw_payables_enriched').select('id, origin_id, partner_name');
    
    // Filtro defensivo: apenas tenta comparar UUID se for um UUID válido
    if (isValidUUID(sanitizedId)) {
      const { data: entry } = await query
        .or(`id.eq.${sanitizedId},origin_id.eq.${sanitizedId}`)
        .maybeSingle();

      if (entry) {
        entryId = entry.id;
        purchaseOrderId = entry.origin_id || '';
        supplierName = entry.partner_name || supplierName;
      }
    }
  } else {
    // MODO LEGADO (Fallback)
    await payablesService.loadFromSupabase();
    const payable = payablesService.getById(sanitizedId) || payablesService.getAll().find(p => p.purchaseOrderId === sanitizedId);
    if (payable) {
      entryId = payable.id;
      purchaseOrderId = payable.purchaseOrderId || '';
      supplierName = payable.partnerName || supplierName;
    }
  }

  if (!entryId) {
    throw new Error(`Não foi possível localizar o lançamento financeiro para o pedido: ${recordId}`);
  }

  // 2. Descrição formatada
  const description = `Pagamento Pedido Compra: ${supplierName}`;

  // 3. EXECUÇÃO ATÔMICA (RPC SQL-First)
  // O RPC já lida com:
  // - Inserção em financial_transactions
  // - Atualização de financial_links
  // - Atualização do saldo da conta bancária
  // - Atualização automática do status do Payable (via Trigger fn_update_entry_paid_amount)
  const { data: result, error: rpcError } = await supabase.rpc('rpc_ops_financial_process_action', {
    p_entry_id: entryId,
    p_account_id: data.accountId,
    p_amount: data.amount,
    p_discount: data.discount || 0,
    p_description: description,
    p_transaction_date: data.date,
    p_metadata: { source: 'purchaseOrderHandler', tx_id: txId }
  });

  if (rpcError || (result && !result.success)) {
    throw new Error(`Erro no processamento SQL de pagamento: ${rpcError?.message || result?.error}`);
  }

  // 4. Registro de Histórico (Compatibilidade de UI)
  // Mantemos para que a tela de "Histórico" (Extrato) continue funcionando sem mudanças imediatas.
  await registerFinancialRecords({
    txId,
    date: data.date,
    amount: data.amount,
    discount: data.discount || 0,
    accountId: data.accountId,
    accountName: data.accountName,
    type: 'payment',
    recordId: entryId,
    referenceType: 'purchase_order',
    referenceId: purchaseOrderId,
    description,
    historyType: 'Pagamento Compra',
    entityName: supplierName,
    partnerId: data.partnerId,
    notes: data.notes,
    purchaseOrderId
  });

  return { success: true, txId };
};
