
import { payablesService, Payable } from '../payablesService';
import { generateTxId, registerFinancialRecords } from './orchestratorHelpers';
import type { PaymentData, PaymentResult } from './orchestratorTypes';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../../sqlCanonicalOps';

/**
 * Handler para pagamento de Comissão (Corretores).
 * Refatorado para Foundation V2 (Links robustos + Triggers).
 */
export const handleCommissionPayment = async (
  recordId: string,
  data: PaymentData
): Promise<PaymentResult> => {
  const canonicalOpsEnabled = isSqlCanonicalOpsEnabled();
  const txId = generateTxId();
  const transactionValue = data.amount;
  const discountValue = data.discount;

  await payablesService.loadFromSupabase();

  let payable = payablesService.getById(recordId);
  let commissionId = '';

  if (!payable) {
    const allCommissionPayables = payablesService.getAll().filter(p => p.subType === 'commission');
    const orderId = recordId.replace('com-', '');
    payable = allCommissionPayables.find(p => p.purchaseOrderId === orderId);
  }

  if (payable) {
    commissionId = payable.commissionId || '';
  }

  // --- 1. Atualizar o PAYABLE ---
  if (payable && !canonicalOpsEnabled) {
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
  } else if (payable && canonicalOpsEnabled) {
    sqlCanonicalOpsLog('commissionHandler: atualização local de payable ignorada (SQL canônico ativo)');
  }

  // --- 2. Descrição padronizada ---
  const brokerName = payable?.partnerName || data.entityName || 'Corretor';
  const description = `Pagamento Comissão: ${brokerName}${payable?.description ? ` - ${payable.description}` : ''}`;

  // --- 3. Registrar via Orquestrador (Foundation V2) ---
  await registerFinancialRecords({
    txId,
    date: data.date,
    amount: transactionValue,
    discount: discountValue,
    accountId: data.accountId,
    accountName: data.accountName,
    type: 'payment',
    recordId: payable?.id || recordId,
    referenceType: 'commission',
    referenceId: commissionId || recordId,
    description,
    historyType: 'Pagamento Comissão',
    entityName: brokerName,
    partnerId: payable?.partnerId || data.partnerId,
    notes: data.notes
  });

  // ✅ SINGLE LEDGER: Processar o pagamento e desconto no banco de dados via RPC
  try {
    const { supabase } = await import('../../supabase');

    // Tenta encontrar a financial_entry correta:
    // Para Comissão, origin_type = 'purchase_commission' e origin_id = commissionId (ou recordId)
    // No addcommission do PO handler, usamos o ID da transação (tx.id) como origin_id.
    const targetOriginId = commissionId || recordId;

    const { data: entries } = await supabase
      .from('financial_entries')
      .select('id, origin_type')
      .eq('origin_id', targetOriginId)
      .eq('origin_type', 'purchase_commission');

    let entry = entries?.[0];

    // Se não encontrou por purchase_commission, tenta o tipo genérico commission
    if (!entry) {
      const { data: altEntries } = await supabase
        .from('financial_entries')
        .select('id')
        .eq('origin_id', targetOriginId)
        .eq('type', 'commission');
      entry = altEntries?.[0];
    }

    if (entry && data.accountId) {
      // Pagar o valor (debit)
      if (transactionValue > 0) {
        await supabase.rpc('pay_financial_entry', {
          p_entry_id: entry.id,
          p_account_id: data.accountId,
          p_amount: transactionValue,
          p_description: `Pagamento Comissão: ${data.entityName || 'Corretor'}`
        });
      }

      // Registrar abatimento/desconto na obrigação
      if (discountValue > 0) {
        await supabase.rpc('apply_discount_financial_entry', {
          p_entry_id: entry.id,
          p_amount: discountValue
        });
      }

    } else {
    }
  } catch (err) {
  }

  return { success: true, txId };
};
