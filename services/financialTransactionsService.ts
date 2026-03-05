// services/financialTransactionsService.ts
// ============================================================================
// Service para o Livro-Razão (Financial Transactions)
// ============================================================================
// Tabela IMUTÁVEL: apenas INSERT permitido (é auditoria)
// Triggers recalculam saldos e status automaticamente
// ============================================================================

import { supabase } from './supabase';
import { authService } from './authService';

export type TransactionType = 'credit' | 'debit';

export interface FinancialTransaction {
  id: string;
  company_id: string;
  entry_id?: string;
  account_id: string;
  type: TransactionType;
  amount: number;
  transaction_date: string;
  created_by?: string;
  description?: string;
  created_at: string;
}

// Mapeador: snake_case (DB) → camelCase (Frontend)
function mapRow(row: any): FinancialTransaction {
  return {
    id: row.id,
    company_id: row.company_id,
    entry_id: row.entry_id,
    account_id: row.account_id,
    type: row.type,
    amount: parseFloat(row.amount ?? '0'),
    transaction_date: row.transaction_date,
    created_by: row.created_by,
    description: row.description,
    created_at: row.created_at,
  };
}

// Helper: busca company_id
async function getCompanyId(): Promise<string> {
  const { data, error } = await supabase
    .from('app_users')
    .select('company_id')
    .single();
  if (error || !data?.company_id)
    throw new Error('Usuário sem empresa vinculada');
  return data.company_id as string;
}

// Helper: busca user ID
async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('app_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  return data?.id || null;
}

export const financialTransactionsService = {
  // LEITURA — Transações de uma conta
  getByAccount: async (accountId: string): Promise<FinancialTransaction[]> => {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('transaction_date', { ascending: false });

    if (error)
      throw new Error(`Erro ao buscar transações: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  // LEITURA — Transações de uma entry (obrigação)
  getByEntry: async (entryId: string): Promise<FinancialTransaction[]> => {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('entry_id', entryId)
      .order('transaction_date', { ascending: false });

    if (error)
      throw new Error(`Erro ao buscar pagamentos: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  // LEITURA — Transações de um período
  getByDateRange: async (
    startDate: string,
    endDate: string,
  ): Promise<FinancialTransaction[]> => {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('*')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false });

    if (error)
      throw new Error(`Erro ao buscar transações: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  // LEITURA — Resumo: totais de créditos e débitos por conta
  getSummaryByAccount: async (
    accountId: string,
  ): Promise<{ credits: number; debits: number }> => {
    const { data, error } = await supabase.rpc(
      'rpc_financial_transactions_summary_by_account',
      { p_account_id: accountId },
    );

    if (error) {
      throw new Error(
        `Erro ao buscar resumo financeiro via RPC (rpc_financial_transactions_summary_by_account): ${error.message}`,
      );
    }

    return {
      credits: Number(data?.credits ?? 0),
      debits: Number(data?.debits ?? 0),
    };
  },

  // INSERÇÃO — Registrar nova transação
  // TRIGGERS vão:
  //   1. Recalcular account.balance
  //   2. Recalcular entry.paid_amount
  //   3. Atualizar entry.status
  //   4. Validar saldo (se debit)
  add: async (
    transaction: Omit<
      FinancialTransaction,
      'id' | 'company_id' | 'created_by' | 'created_at'
    >,
  ): Promise<string> => {
    const companyId = await getCompanyId();
    const createdBy = await getCurrentUserId();

    const { data, error } = await supabase
      .from('financial_transactions')
      .insert({
        company_id: companyId,
        entry_id: transaction.entry_id || null,
        account_id: transaction.account_id,
        type: transaction.type,
        amount: transaction.amount,
        transaction_date: transaction.transaction_date,
        created_by: createdBy,
        description: transaction.description,
      })
      .select('id')
      .single();

    if (error) {
      // Se o erro é de validação de saldo, passa a mensagem original
      if (error.message.includes('Saldo insuficiente')) {
        throw new Error(error.message);
      }
      throw new Error(`Erro ao registrar transação: ${error.message}`);
    }

    return data.id;
  },

  // OBS: UPDATE/DELETE NÃO PERMITIDOS
  // Esta é uma tabela de auditoria imutável.
  // Para reverter um pagamento, INSERT um novo debit (crédito reverso)
  
  // EXEMPLO: Se você inseriu um debit de 1000 e quer reverter:
  // 1. INSERT um novo debit de -1000 (reverte)
  // 2. ou INSERT um novo credit de 1000 (reverte)

  // ============================================================================
  // TOTAIS VIA RPC — Zero cálculo no frontend
  // ============================================================================

  /**
   * Retorna totalInflow, totalOutflow, totalNet para um período.
   * Substitui o cálculo client-side do HistoryTab.
   */
  getTotalsByDateRange: async (
    startDate: string,
    endDate: string,
  ): Promise<{ totalInflow: number; totalOutflow: number; totalNet: number }> => {
    const { data, error } = await supabase.rpc('rpc_transactions_totals_by_date_range', {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      console.error('[financialTransactionsService] getTotalsByDateRange RPC error:', error.message);
      return { totalInflow: 0, totalOutflow: 0, totalNet: 0 };
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data;
    return {
      totalInflow: Number(result?.totalInflow ?? 0),
      totalOutflow: Number(result?.totalOutflow ?? 0),
      totalNet: Number(result?.totalNet ?? 0),
    };
  },
  
  // REALTIME — Canal compartilhado (singleton) para evitar duplicação
  subscribeRealtime: (() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const listeners = new Set<() => void>();

    const ensureChannel = () => {
      if (channel) return;

      const companyId = authService.getCurrentUser()?.companyId;

      channel = supabase
        .channel('realtime:financial_transactions')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'financial_transactions',
          },
          (payload: any) => {
            const changedCompanyId = payload?.new?.company_id ?? payload?.old?.company_id;
            if (!companyId || !changedCompanyId || changedCompanyId === companyId) {
              listeners.forEach(cb => cb());
            }
          },
        )
        .subscribe();
    };

    return (onAnyChange: () => void): (() => void) => {
      listeners.add(onAnyChange);
      ensureChannel();

      return () => {
        listeners.delete(onAnyChange);
        if (listeners.size === 0 && channel) {
          supabase.removeChannel(channel);
          channel = null;
        }
      };
    };
  })(),
};
