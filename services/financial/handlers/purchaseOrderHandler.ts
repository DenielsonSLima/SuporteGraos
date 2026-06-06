
import { payablesService } from '../payablesService';
import { generateTxId, registerFinancialRecords, sanitizeRecordId, isValidUUID, getCompanyId } from './orchestratorHelpers';
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
    // Tenta carregar o pedido de compra do banco de dados para criar a entry de forma dinâmica
    // Evita erro quando o pedido foi criado com valor 0 e não gerou payable no DB ainda
    if (isValidUUID(sanitizedId)) {
      const { data: order } = await supabase
        .from('ops_purchase_orders')
        .select('id, number, partner_id, partner_name, total_value, company_id')
        .or(`id.eq.${sanitizedId},legacy_id.eq.${sanitizedId}`)
        .maybeSingle();

      if (order) {
        const companyId = order.company_id || getCompanyId();
        if (companyId) {
          // Cria a entry dinamicamente
          const { data: newEntry, error: insertError } = await supabase
            .from('financial_entries')
            .insert({
              company_id: companyId,
              type: 'payable',
              origin_type: 'purchase_order',
              origin_id: order.id,
              description: `Pedido de Compra ${order.number}`,
              total_amount: Number(order.total_value) || 0,
              due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              partner_id: order.partner_id
            })
            .select('id')
            .single();

          if (insertError) {
            console.error('[purchaseOrderHandler] Erro ao criar entry dinâmica:', insertError);
          } else if (newEntry) {
            entryId = newEntry.id;
            purchaseOrderId = order.id;
            supplierName = order.partner_name || supplierName;
          }
        }
      }
    }
  }

  if (!entryId) {
    throw new Error(`Não foi possível localizar o lançamento financeiro para o pedido: ${recordId}`);
  }

  // 2. Descrição formatada
  const isAdvance = data.notes && data.notes.toLowerCase().includes('adiantamento');
  const description = isAdvance 
    ? `Adiantamento Pedido Compra: ${supplierName}` 
    : `Pagamento Pedido Compra: ${supplierName}`;

  // 3. EXECUÇÃO ATÔMICA (RPC SQL-First)
  // O RPC já lida com:
  // - Inserção em financial_transactions
  // - Atualização de financial_links
  // - Atualização do saldo da conta bancária
  // - Atualização automática do status do Payable (via Trigger fn_update_entry_paid_amount)
  const { data: result, error: rpcError } = await supabase.rpc('rpc_ops_financial_process_action', {
    p_entry_id: entryId,
    p_account_id: data.accountId || null,
    p_amount: data.amount,
    p_discount: data.discount || 0,
    p_description: description,
    p_transaction_date: data.date,
    p_metadata: { 
      source: 'purchaseOrderHandler', 
      tx_id: txId, 
      notes: data.notes,
      subType: isAdvance ? 'advance' : 'payment'
    }
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
    historyType: isAdvance ? 'Adiantamento Concedido' : 'Pagamento Compra',
    entityName: supplierName,
    partnerId: data.partnerId,
    notes: data.notes,
    purchaseOrderId,
    metadata: { subType: isAdvance ? 'advance' : 'payment' }
  });

  return { success: true, txId };
};

/**
 * Handler para adiantamento de Pedido de Compra.
 * Cria o adiantamento real (tabela advances) e o vincula ao Pedido de Compra.
 */
export const handlePurchaseOrderAdvance = async (
  recordId: string,
  data: PaymentData
): Promise<PaymentResult> => {
  const txId = generateTxId();
  const { supabase } = await import('../../supabase');

  const purchaseOrderId = sanitizeRecordId(recordId);
  const supplierName = data.entityName || 'Fornecedor';

  const description = `Adiantamento Pedido Compra: ${supplierName}`;

  // 1. Criar o adiantamento real no banco de dados via RPC rpc_create_advance
  const { data: advanceId, error: rpcError } = await supabase.rpc('rpc_create_advance', {
    p_recipient_id: data.partnerId,
    p_recipient_type: 'supplier',
    p_amount: data.amount,
    p_account_id: data.accountId,
    p_description: data.notes || description,
    p_advance_date: data.date,
    p_parent_id: null
  });

  if (rpcError || !advanceId) {
    throw new Error(`Erro ao criar adiantamento no banco: ${rpcError?.message || 'ID não retornado'}`);
  }

  // 2. Buscar a financial_entry e a financial_transaction geradas para podermos linkar
  const { data: entry, error: entryError } = await supabase
    .from('financial_entries')
    .select('id')
    .eq('origin_type', 'advance')
    .eq('origin_id', advanceId)
    .single();

  if (entryError || !entry) {
    throw new Error(`Erro ao localizar lançamento do adiantamento: ${entryError?.message}`);
  }

  const { data: transaction, error: txError } = await supabase
    .from('financial_transactions')
    .select('id')
    .eq('entry_id', entry.id)
    .single();

  if (txError || !transaction) {
    throw new Error(`Erro ao localizar transação do adiantamento: ${txError?.message}`);
  }

  // 3. Vincular a transação ao Pedido de Compra na tabela financial_links
  // Isso ativará o trigger trg_sync_purchase_order_financials para atualizar paid_value e re-calcular o saldo
  const { error: linkError } = await supabase
    .from('financial_links')
    .insert({
      transaction_id: transaction.id,
      link_type: 'payment',
      purchase_order_id: purchaseOrderId,
      metadata: {
        source: 'purchaseOrderHandler',
        tx_id: txId,
        notes: data.notes,
        subType: 'advance'
      }
    });

  if (linkError) {
    throw new Error(`Erro ao vincular adiantamento ao pedido: ${linkError.message}`);
  }

  // 4. Registro de Histórico (Compatibilidade de UI - Extrato)
  await registerFinancialRecords({
    txId,
    date: data.date,
    amount: data.amount,
    discount: data.discount || 0,
    accountId: data.accountId,
    accountName: data.accountName,
    type: 'payment',
    recordId: entry.id,
    referenceType: 'purchase_order',
    referenceId: purchaseOrderId,
    description,
    historyType: 'Adiantamento Concedido',
    entityName: supplierName,
    partnerId: data.partnerId,
    notes: data.notes,
    purchaseOrderId,
    metadata: { subType: 'advance' },
    skipTransactionInsert: true // Não insere no JS pois o RPC já inseriu
  });

  return { success: true, txId };
};

