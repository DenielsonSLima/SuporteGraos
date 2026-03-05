
import { generateTxId, registerFinancialRecords } from './orchestratorHelpers';
import type { PaymentData, PaymentResult } from './orchestratorTypes';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../../sqlCanonicalOps';

/**
 * Handler para Despesas Administrativas e Avulsas.
 * Refatorado para Foundation V2 (Links robustos + Triggers).
 */
export const handleStandalonePayment = async (
  recordId: string,
  data: PaymentData,
  standalone: any,
  serviceToUpdate: any
): Promise<PaymentResult> => {
  const canonicalOpsEnabled = isSqlCanonicalOpsEnabled();
  const txId = generateTxId();
  const transactionValue = data.amount;
  const discountValue = data.discount;

  // --- 1. Atualizar o Registro de Origem (AdminExpense, Credit, Shareholder, etc.) ---
  if (standalone && !canonicalOpsEnabled) {
    const currentPaid = standalone.paidValue || 0;
    const currentDisc = standalone.discountValue || 0;
    const updateData = {
      ...standalone,
      paidValue: currentPaid + transactionValue,
      discountValue: currentDisc + discountValue,
      settlementDate: data.date,
      status: ((currentPaid + transactionValue + currentDisc + discountValue) >= standalone.originalValue - 0.01 ? 'paid' : 'partial'),
      bankAccount: data.accountName,
      notes: data.notes
    };

    const creditService = (await import('../creditService')).default;
    if (serviceToUpdate === creditService) {
      await creditService.update(standalone.id, updateData);
    } else {
      await serviceToUpdate.update(updateData);
    }
  } else if (standalone && canonicalOpsEnabled) {
    sqlCanonicalOpsLog('standaloneHandler: atualização local de standalone ignorada (SQL canônico ativo)');
  }

  // --- 2. Descrição padronizada ---
  const entityName = data.entityName || standalone?.entityName || 'Despesa';
  const description = `Pagamento: ${standalone?.description || entityName}`;

  // --- 3. Registrar via Orquestrador (Foundation V2) ---
  // Financial Transaction Trigger cuida do saldo.
  // Financial Links vincula ao registro standalone.
  await registerFinancialRecords({
    txId,
    date: data.date,
    amount: transactionValue,
    discount: discountValue,
    accountId: data.accountId,
    accountName: data.accountName,
    type: 'payment',
    recordId,
    referenceType: standalone?.subType || 'admin',
    referenceId: recordId,
    description,
    historyType: 'Despesa Administrativa',
    entityName,
    partnerId: data.partnerId,
    notes: data.notes,
    companyId: standalone?.companyId
  });

  // ✅ SINGLE LEDGER: Processar o pagamento e desconto no banco de dados via RPC
  try {
    const { supabase } = await import('../../supabase');

    // Tenta encontrar a financial_entry correta:
    // Para Standalone, origin_id = recordId
    const targetOriginId = recordId;

    const { data: entries } = await supabase
      .from('financial_entries')
      .select('id, type')
      .eq('origin_id', targetOriginId);

    const entry = entries?.[0];

    if (entry && data.accountId) {
      if (transactionValue > 0) {
        await supabase.rpc('pay_financial_entry', {
          p_entry_id: entry.id,
          p_account_id: data.accountId,
          p_amount: transactionValue,
          p_description: description
        });
      }

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
