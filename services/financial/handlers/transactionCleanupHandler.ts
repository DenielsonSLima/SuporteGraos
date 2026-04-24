/**
 * ============================================================================
 * HANDLER: REMOÇÃO DE TRANSAÇÃO FINANCEIRA (COM RESTAURAÇÃO DE SALDO)
 * ============================================================================
 * 
 * Responsável por estornar uma transação específica e RESTAURAR o saldo
 * no Contas a Paga
import { financialHistoryService } from '../financialHistoryService';
import { isSqlCanonicalOpsEnabled } from '../../sqlCanonicalOps';

/**
 * Handler para Estorno de Transação.
 * Refatorado para usar rpc_ops_financial_void_transaction (SQL-First).
 */
export const handleTransactionVoid = async (
  txId: string,
  _data?: any
): Promise<{ success: boolean }> => {
  const { supabase } = await import('../../supabase');
  const canonicalOpsEnabled = isSqlCanonicalOpsEnabled();

  // 1. EXECUÇÃO ATÔMICA (RPC SQL-First)
  // O RPC rpc_ops_financial_void_transaction lida com:
  // - Deleção da transação em financial_transactions
  // - Deleção de links em financial_links
  // - Atualização (Rollback) do saldo na conta bancária
  // - Restauração automática do status no payable/receivable (via trigger fn_update_entry_paid_amount)
  if (canonicalOpsEnabled) {
    const { data: result, error: rpcError } = await supabase.rpc('rpc_ops_financial_void_transaction', {
      p_transaction_id: txId
    });

    if (rpcError || (result && !result.success)) {
      throw new Error(`Erro no estorno atômico SQL: ${rpcError?.message || result?.error}`);
    }
  }

  // 2. Limpeza de Histórico (Legado)
  // No sistema legado, o histórico é uma tabela separada que precisa ser limpa.
  // Buscamos o registro histórico vinculado a esta transação.
  await financialHistoryService.loadFromSupabase();
  const historyEntry = financialHistoryService.getAll().find(h => h.txId === txId);

  if (historyEntry) {
    await financialHistoryService.delete(historyEntry.id);
  }

  // 3. Invalidação Global de Cache
  const { invalidateFinancialCache } = await import('../../financialCache');
  invalidateFinancialCache();

  return { success: true };
};
