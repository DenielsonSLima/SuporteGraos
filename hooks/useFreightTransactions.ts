/**
 * useFreightTransactions.ts
 * 
 * Hook para buscar o histórico de transações de frete vinculado a um carregamento.
 * Resolve a divergência onde pagamentos feitos no módulo Financeiro não apareciam 
 * na aba de histórico do frete na Logística.
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { supabase } from '../services/supabase';
import { financialTransactionsService, FinancialTransaction } from '../services/financialTransactionsService';

async function fetchFreightTransactions(loadingId: string): Promise<FinancialTransaction[]> {
    // 1. Encontra a entry correspondente ao frete
    const { data: entryData, error: entryError } = await supabase
        .from('financial_entries')
        .select('id')
        .eq('origin_id', loadingId)
        .eq('origin_type', 'freight')
        .maybeSingle();

    if (entryError || !entryData) {
        return [];
    }

    // 2. Busca as transações daquela entry vinculando com a conta bancária
    const { data: txData, error: txError } = await supabase
        .from('financial_transactions')
        .select(`
      *,
      accounts (
        account_name
      )
    `)
        .eq('entry_id', entryData.id)
        .order('transaction_date', { ascending: false });

    if (txError || !txData) {
        return [];
    }

    return txData.map(t => ({
        ...t,
        account_name: (t.accounts as any)?.account_name || 'Conta excluída'
    })) as any;
}

/**
 * Retorna a lista de transações (pagamentos/estornos) vinculadas ao frete de um carregamento.
 */
export function useFreightTransactions(loadingId: string | undefined) {
    return useQuery({
        queryKey: [...QUERY_KEYS.FREIGHTS, 'transactions', loadingId],
        queryFn: () => fetchFreightTransactions(loadingId!),
        enabled: !!loadingId,
        staleTime: STALE_TIMES.DYNAMIC,
        placeholderData: keepPreviousData,
    });
}
