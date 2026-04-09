import { supabase } from '../../supabase';
import { generateTxId, registerFinancialRecords, resolveAccountId } from './orchestratorHelpers';
import type { PaymentData, PaymentResult } from './orchestratorTypes';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../../sqlCanonicalOps';
import { FinancialRecord, FinancialStatus } from '../../../modules/Financial/types';
import { StandaloneRecord as StandaloneRecordDB } from '../../../types/database';

/**
 * Handler para Despesas Administrativas e Avulsas.
 * Refatorado para Foundation V2 (Links robustos + Triggers).
 */
export const handleStandalonePayment = async (
  recordId: string,
  data: PaymentData,
  standalone: FinancialRecord | null,
  serviceToUpdate: any // Interface polimórfica (standaloneRecordsService | creditService | etc)
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
      status: ((currentPaid + transactionValue + currentDisc + discountValue) >= standalone.originalValue - 0.01 ? 'paid' : 'partial') as FinancialStatus,
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
  const description = `${data.notes || standalone?.description || entityName}`;

  // --- 3. Registrar via Orquestrador (Foundation V2) ---
  // Se não houver 'entry' (ex: despesa avulsa), o orquestrador Legacy cuida do saldo via FinancialTransaction trigger.
  // Se houver 'entry', o RPC de pagamento cuida disso.
  
  // Tenta encontrar a financial_entry para decidir se fazemos o registro direto ou via RPC
  const targetOriginId = recordId;
  const { data: entries } = await supabase
    .from('financial_entries')
    .select('id, type')
    .eq('origin_id', targetOriginId);

  const entry = entries?.[0];

  if (entry && data.accountId) {
    // Via RPC Modular (Atômico) - SQL-First
    await supabase.rpc('rpc_ops_financial_process_action', {
      p_entry_id: entry.id,
      p_account_id: data.accountId,
      p_amount: transactionValue,
      p_discount: discountValue,
      p_date: data.date,
      p_description: description,
      p_tx_id: txId
    });

    // Registramos apenas o histórico/vínculo no modo Foundation
    // registerFinancialRecords pulará a escrita no ledger se detectar que o RPC já fez
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
  } else {
    // Via Registro Direto (Fallback/Extra)
    await registerFinancialRecords({
      txId,
      date: data.date,
      amount: transactionValue,
      discount: discountValue,
      accountId: resolveAccountId(data.accountId),
      accountName: data.accountName,
      type: 'payment',
      recordId,
      referenceType: standalone?.subType || 'admin',
      referenceId: recordId,
      description,
      historyType: 'Despesa Extra',
      entityName,
      partnerId: data.partnerId,
      notes: data.notes,
      companyId: standalone?.companyId,
      metadata: { 
        deductFromPartner: (data as any).deductFromPartner 
      },
      purchaseOrderId: data.purchaseOrderId
    });
  }

  return { success: true, txId };
};
