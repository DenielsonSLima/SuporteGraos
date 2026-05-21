/**
 * cleanupService.ts
 * 
 * SERVIÇO DE EMERGÊNCIA: Recalcula todos os saldos financeiros
 * baseado nas transações REAIS existentes no banco.
 * 
 * Contexto: O handler de estorno (transactionCleanupHandler.ts) tinha um bug
 * que impedia a chamada da RPC de void. Os pagamentos eram removidos do
 * frontend mas NUNCA estornados no banco, corrompendo os saldos.
 */

import { supabase } from './supabase';

export async function runFinancialCleanup(companyId: string): Promise<{
  success: boolean;
  entriesFixed: number;
  accountsFixed: number;
  orphanLinksDeleted: number;
  details: string[];
}> {
  const details: string[] = [];
  let entriesFixed = 0;
  let accountsFixed = 0;
  let orphanLinksDeleted = 0;

  try {
    console.log('[CLEANUP] === INÍCIO DA LIMPEZA FINANCEIRA ===');
    console.log('[CLEANUP] Company ID:', companyId);

    // ========================================================================
    // PASSO 1: Buscar TODAS as financial_entries da empresa
    // ========================================================================
    const { data: entries, error: entriesError } = await supabase
      .from('financial_entries')
      .select('id, type, total_amount, paid_amount, remaining_amount, status, origin_type, origin_id')
      .eq('company_id', companyId);

    if (entriesError) {
      details.push(`Erro ao buscar entries: ${entriesError.message}`);
      console.error('[CLEANUP] Erro buscar entries:', entriesError);
      return { success: false, entriesFixed: 0, accountsFixed: 0, orphanLinksDeleted: 0, details };
    }

    console.log(`[CLEANUP] Encontradas ${entries?.length || 0} entries`);
    details.push(`Entries encontradas: ${entries?.length || 0}`);

    // ========================================================================
    // PASSO 2: Para cada entry, recalcular paid_amount baseado nas transações
    // ========================================================================
    if (entries && entries.length > 0) {
      for (const entry of entries) {
        // Buscar TODAS as transações vinculadas a esta entry
        const { data: txns, error: txnError } = await supabase
          .from('financial_transactions')
          .select('id, type, amount')
          .eq('entry_id', entry.id);

        if (txnError) {
          details.push(`Erro ao buscar txns da entry ${entry.id}: ${txnError.message}`);
          continue;
        }

        // Calcular paid_amount REAL baseado nas transações existentes
        let realPaidAmount = 0;
        if (txns && txns.length > 0) {
          for (const tx of txns) {
            if (entry.type === 'payable') {
              // Para payable: debit = pagamento (positivo), credit = estorno (negativo)
              if (tx.type === 'debit' || tx.type === 'OUT') realPaidAmount += tx.amount;
              else if (tx.type === 'credit' || tx.type === 'IN') realPaidAmount -= tx.amount;
            } else if (entry.type === 'receivable') {
              // Para receivable: credit = recebimento (positivo), debit = estorno (negativo)
              if (tx.type === 'credit' || tx.type === 'IN') realPaidAmount += tx.amount;
              else if (tx.type === 'debit' || tx.type === 'OUT') realPaidAmount -= tx.amount;
            } else {
              realPaidAmount += tx.amount;
            }
          }
        }

        // Verificar se precisa corrigir
        if (realPaidAmount !== entry.paid_amount) {
          const newRemaining = Math.max(entry.total_amount - realPaidAmount, 0);
          let newStatus: string;
          if (realPaidAmount >= entry.total_amount && entry.total_amount > 0) {
            newStatus = 'paid';
          } else if (realPaidAmount > 0) {
            newStatus = 'partially_paid';
          } else {
            newStatus = 'pending';
          }

          console.log(`[CLEANUP] CORRIGINDO entry ${entry.id} (${entry.type}/${entry.origin_type}): paid ${entry.paid_amount} -> ${realPaidAmount}, remaining ${entry.remaining_amount} -> ${newRemaining}, status ${entry.status} -> ${newStatus}`);
          details.push(`Entry ${entry.id.substring(0,8)}... (${entry.origin_type}): paid ${entry.paid_amount} → ${realPaidAmount}`);

          const { error: updateError } = await supabase
            .from('financial_entries')
            .update({
              paid_amount: realPaidAmount,
              remaining_amount: newRemaining,
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', entry.id);

          if (updateError) {
            details.push(`Erro ao atualizar entry ${entry.id}: ${updateError.message}`);
            console.error(`[CLEANUP] Erro update entry ${entry.id}:`, updateError);
          } else {
            entriesFixed++;
          }
        } else {
          console.log(`[CLEANUP] Entry ${entry.id.substring(0,8)}... OK (paid=${entry.paid_amount})`);
        }
      }
    }

    // ========================================================================
    // PASSO 3: Recalcular saldos bancários
    // ========================================================================
    const { data: accounts, error: accError } = await supabase
      .from('accounts')
      .select('id, name, balance')
      .eq('company_id', companyId);

    if (accError) {
      details.push(`Erro ao buscar accounts: ${accError.message}`);
    } else if (accounts && accounts.length > 0) {
      console.log(`[CLEANUP] Encontradas ${accounts.length} contas bancárias`);
      
      for (const account of accounts) {
        const { data: accTxns, error: accTxnError } = await supabase
          .from('financial_transactions')
          .select('type, amount')
          .eq('account_id', account.id);

        if (accTxnError) {
          details.push(`Erro ao buscar txns da conta ${account.name}: ${accTxnError.message}`);
          continue;
        }

        let realBalance = 0;
        if (accTxns && accTxns.length > 0) {
          for (const tx of accTxns) {
            if (tx.type === 'IN' || tx.type === 'credit') realBalance += tx.amount;
            else if (tx.type === 'OUT' || tx.type === 'debit') realBalance -= tx.amount;
          }
        }

        if (realBalance !== account.balance) {
          console.log(`[CLEANUP] CORRIGINDO conta ${account.name}: balance ${account.balance} -> ${realBalance}`);
          details.push(`Conta ${account.name}: balance ${account.balance} → ${realBalance}`);

          const { error: updateError } = await supabase
            .from('accounts')
            .update({ balance: realBalance, updated_at: new Date().toISOString() })
            .eq('id', account.id);

          if (updateError) {
            details.push(`Erro ao atualizar conta ${account.name}: ${updateError.message}`);
          } else {
            accountsFixed++;
          }
        }
      }
    }

    // ========================================================================
    // PASSO 4: Limpar financial_links órfãos
    // ========================================================================
    const { data: orphanLinks, error: orphanError } = await supabase
      .from('financial_links')
      .select('id, transaction_id');

    if (!orphanError && orphanLinks && orphanLinks.length > 0) {
      // Verificar quais transações ainda existem
      const txIds = orphanLinks.map(l => l.transaction_id);
      const { data: existingTxns } = await supabase
        .from('financial_transactions')
        .select('id')
        .in('id', txIds);

      const existingIds = new Set((existingTxns || []).map(t => t.id));
      const orphans = orphanLinks.filter(l => !existingIds.has(l.transaction_id));

      if (orphans.length > 0) {
        for (const orphan of orphans) {
          await supabase.from('financial_links').delete().eq('id', orphan.id);
          orphanLinksDeleted++;
        }
        details.push(`Links órfãos removidos: ${orphanLinksDeleted}`);
      }
    }

    console.log('[CLEANUP] === FIM DA LIMPEZA ===');
    console.log(`[CLEANUP] Entries corrigidas: ${entriesFixed}`);
    console.log(`[CLEANUP] Contas corrigidas: ${accountsFixed}`);
    console.log(`[CLEANUP] Links órfãos removidos: ${orphanLinksDeleted}`);

    return { success: true, entriesFixed, accountsFixed, orphanLinksDeleted, details };
  } catch (error: any) {
    console.error('[CLEANUP] ERRO FATAL:', error);
    details.push(`Erro fatal: ${error.message}`);
    return { success: false, entriesFixed, accountsFixed, orphanLinksDeleted, details };
  }
}
