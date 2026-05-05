// services/loansService.ts
// ============================================================================
// Service para Empréstimos e Parcelas
// ============================================================================
// Usa RPC rpc_create_loan() para criar empréstimo + entries + installments
// ============================================================================

import { supabase } from './supabase';

export interface Loan {
  id: string;
  company_id: string;
  type: 'taken' | 'granted';
  lender_id?: string;
  principal_amount: number;
  interest_rate?: number;
  start_date: string;
  end_date?: string;
  paid_amount: number;
  remaining_amount: number;
  status: 'open' | 'paid' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface LoanInstallment {
  id: string;
  company_id: string;
  loan_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  paid_date?: string;
  status: 'open' | 'paid' | 'overdue' | 'cancelled';
  created_at: string;
  updated_at: string;
}

function mapLoan(row: any): Loan {
  return {
    id: row.id,
    company_id: row.company_id,
    type: row.type || 'taken',
    lender_id: row.lender_id,
    principal_amount: parseFloat(row.principal_amount ?? '0'),
    interest_rate: row.interest_rate ? parseFloat(row.interest_rate) : undefined,
    start_date: row.start_date,
    end_date: row.end_date,
    paid_amount: parseFloat(row.paid_amount ?? '0'),
    remaining_amount: parseFloat(row.remaining_amount ?? '0'),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapInstallment(row: any): LoanInstallment {
  return {
    id: row.id,
    company_id: row.company_id,
    loan_id: row.loan_id,
    installment_number: row.installment_number,
    amount: parseFloat(row.amount ?? '0'),
    due_date: row.due_date,
    paid_date: row.paid_date,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const loansService = {
  getAll: async (): Promise<Loan[]> => {
    // 1. Busca todos os empréstimos
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('*')
      .order('start_date', { ascending: false });

    if (loansError) throw new Error(`Erro ao buscar empréstimos: ${loansError.message}`);
    if (!loans || loans.length === 0) return [];

    const loanIds = loans.map(l => l.id);

    // 2. Busca o account_id e a descrição vinculada
    // Tentativa A: Via financial_entries (parcelas pagas ou liquidação)
    const { data: entries } = await supabase
      .from('financial_entries')
      .select(`
        origin_id,
        description,
        financial_transactions!entry_id (
          account_id
        )
      `)
      .in('origin_id', loanIds)
      .eq('origin_type', 'loan');

    // Tentativa B: Via metadata da transação (desembolso inicial)
    // ... (mesmo código de antes para disbursementTxs)
    const { data: disbursementTxs } = await supabase
      .from('financial_transactions')
      .select('account_id, metadata')
      .eq('company_id', loans[0].company_id)
      .not('metadata', 'is', null);

    const disbursementMap = new Map<string, string>();
    disbursementTxs?.forEach(tx => {
      const loanId = (tx.metadata as any)?.loan_id;
      if (loanId && loanIds.includes(loanId)) {
        disbursementMap.set(loanId, tx.account_id);
      }
    });

    // 3. Mapeia e mescla
    return loans.map(row => {
      const loan = mapLoan(row);
      const entry = entries?.find(e => e.origin_id === row.id);
      
      // Prioridade 1: Transação de desembolso (metadata)
      let accountId = disbursementMap.get(row.id);
      
      // Prioridade 2: Transações via entry_id
      if (!accountId) {
        accountId = entry?.financial_transactions?.[0]?.account_id;
      }

      return {
        ...loan,
        totalValue: loan.principal_amount,
        paidValue: loan.paid_amount,
        remainingValue: loan.remaining_amount,
        account_id: accountId,
        description: entry?.description || 'Empréstimo'
      } as any;
    });
  },

  getInstallments: async (loanId: string): Promise<LoanInstallment[]> => {
    const { data, error } = await supabase
      .from('loan_installments')
      .select('*')
      .eq('loan_id', loanId)
      .order('installment_number', { ascending: true });
    if (error) throw new Error(`Erro ao buscar parcelas: ${error.message}`);
    return (data ?? []).map(mapInstallment);
  },

  // Operação atômica via RPC (Canonical Mode)
  create: async (params: {
    lenderId?: string;
    principalAmount: number;
    interestRate?: number;
    startDate?: string;
    endDate?: string;
    numInstallments?: number;
    description?: string;
    accountId?: string;
    accountName?: string;
    type?: 'taken' | 'granted';
  }): Promise<string> => {
    const { data, error } = await supabase.rpc('rpc_create_loan', {
      p_type: params.type || 'taken',
      p_account_id: params.accountId || null,
      p_lender_id: params.lenderId || null,
      p_principal_amount: params.principalAmount,
      p_interest_rate: params.interestRate || 0,
      p_start_date: params.startDate || new Date().toISOString().split('T')[0],
      p_end_date: params.endDate || null,
      p_num_installments: params.numInstallments || 1,
      p_description: params.description || null,
    });

    if (error) throw new Error(error.message);
    return data as string;
  },

  update: async (loanId: string, updates: Partial<Omit<Loan, 'id' | 'company_id' | 'created_at' | 'updated_at'>>): Promise<void> => {
    const { error } = await supabase
      .from('loans')
      .update({
        lender_id: updates.lender_id,
        principal_amount: updates.principal_amount,
        interest_rate: updates.interest_rate,
        start_date: updates.start_date,
        end_date: updates.end_date,
        paid_amount: updates.paid_amount,
        remaining_amount: updates.remaining_amount,
        status: updates.status,
      })
      .eq('id', loanId);
    if (error) throw new Error(`Erro ao atualizar empréstimo: ${error.message}`);
  },

  delete: async (loanId: string): Promise<void> => {
    try {
      // 1. Buscar detalhes do empréstimo para o estorno
      const { data: loan, error: fetchError } = await supabase
        .from('loans')
        .select('*')
        .eq('id', loanId)
        .single();
      
      if (fetchError || !loan) throw new Error('Empréstimo não encontrado');

      // 2. Cancela parcelas associadas
      await supabase
        .from('loan_installments')
        .update({ status: 'cancelled' })
        .eq('loan_id', loanId);

      // 3. Cancela a entrada financeira principal (financial_entries)
      await supabase
        .from('financial_entries')
        .update({ status: 'cancelled' })
        .eq('origin_id', loanId)
        .eq('origin_type', 'loan');

      // 4. Estornar a transação de desembolso inicial se houver
      const { data: txs } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('metadata->>loan_id', loanId)
        .eq('metadata->>is_disbursement', 'true');

      if (txs && txs.length > 0) {
        for (const tx of txs) {
          // Criar transação de estorno (tipo oposto)
          const reversalType = tx.type === 'debit' ? 'credit' : 'debit';
          await supabase.from('financial_transactions').insert({
            company_id: loan.company_id,
            account_id: tx.account_id,
            type: reversalType,
            amount: tx.amount,
            transaction_date: new Date().toISOString().split('T')[0],
            description: `[ESTORNO] ${tx.description}`,
            metadata: {
              loan_id: loanId,
              is_reversal: true,
              reverses_id: tx.id
            }
          });
        }
      }

      // 5. Cancela o empréstimo
      const { error } = await supabase
        .from('loans')
        .update({ status: 'cancelled' })
        .eq('id', loanId);

      if (error) throw error;

      // 6. Invalidar caches
      const { invalidateFinancialCache } = await import('./financialCache');
      const { invalidateDashboardCache } = await import('./dashboardCache');
      invalidateFinancialCache();
      invalidateDashboardCache();

    } catch (error: any) {
      throw new Error(`Erro ao cancelar empréstimo: ${error.message}`);
    }
  },

  subscribeRealtime: (() => {
    const listeners = new Set<() => void>();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    return (onAnyChange: () => void): (() => void) => {
      listeners.add(onAnyChange);
      if (!channel) {
        channel = supabase
          .channel('realtime:loans')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, () => listeners.forEach(fn => fn()))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'loan_installments' }, () => listeners.forEach(fn => fn()))
          .subscribe();
      }
      return () => {
        listeners.delete(onAnyChange);
        if (listeners.size === 0 && channel) { supabase.removeChannel(channel); channel = null; }
      };
    };
  })(),

  /**
   * Adiciona um reforço (increase) ou pagamento (decrease) a um empréstimo.
   * Atualiza os totais na tabela loans e cria a transação bancária.
   */
  addTransaction: async (loanId: string, tx: {
    type: 'increase' | 'decrease';
    value: number;
    description: string;
    accountId?: string;
    date: string;
  }): Promise<void> => {
    try {
      // 1. Buscar dados atuais do empréstimo
      const { data: loan, error: fetchError } = await supabase
        .from('loans')
        .select('*')
        .eq('id', loanId)
        .single();
      
      if (fetchError || !loan) throw new Error('Empréstimo não encontrado');

      // 2. Calcular novos totais
      const updates: any = {};
      if (tx.type === 'increase') {
        updates.principal_amount = Number(loan.principal_amount) + tx.value;
      } else {
        updates.paid_amount = Number(loan.paid_amount) + tx.value;
      }

      // 3. Atualizar tabela loans
      const { error: updateError } = await supabase
        .from('loans')
        .update(updates)
        .eq('id', loanId);

      if (updateError) throw updateError;

      // 4. Criar transação bancária se houver conta
      if (tx.accountId) {
        // Se for empréstimo concedido (granted): 
        // - increase (reforço) = debit (sai mais dinheiro)
        // - decrease (pagamento) = credit (entra dinheiro de volta)
        let txType: 'credit' | 'debit';
        if (loan.type === 'granted') {
          txType = tx.type === 'increase' ? 'debit' : 'credit';
        } else {
          // Tomado (taken)
          txType = tx.type === 'increase' ? 'credit' : 'debit';
        }

        const { error: txError } = await supabase.from('financial_transactions').insert({
          company_id: loan.company_id,
          account_id: tx.accountId,
          type: txType,
          amount: tx.value,
          transaction_date: tx.date,
          description: tx.description,
          metadata: {
            loan_id: loanId,
            origin_type: 'loan',
            is_reinforcement: tx.type === 'increase',
            is_payment: tx.type === 'decrease'
          }
        });

        if (txError) throw txError;
      }

      // 5. Invalidar caches
      const { invalidateFinancialCache } = await import('./financialCache');
      const { invalidateDashboardCache } = await import('./dashboardCache');
      invalidateFinancialCache();
      invalidateDashboardCache();

      invalidateDashboardCache();

    } catch (error: any) {
      throw new Error(`Erro ao salvar transação de empréstimo: ${error.message}`);
    }
  },

  /**
   * Remove uma transação de reforço ou pagamento e estorna o saldo.
   */
  removeTransaction: async (loanId: string, txId: string): Promise<void> => {
    try {
      // 1. Buscar dados do empréstimo
      const { data: loan, error: fetchError } = await supabase
        .from('loans')
        .select('*')
        .eq('id', loanId)
        .single();
      
      if (fetchError || !loan) throw new Error('Empréstimo não encontrado');

      // 2. Tentar buscar em admin_expenses (Legado) ou financial_transactions (Canônico)
      let value = 0;
      let description = '';
      let isReinforcement = false;
      let targetTxId = '';

      const { data: adminTx } = await supabase
        .from('admin_expenses')
        .select('*')
        .eq('id', txId)
        .single();

      if (adminTx) {
        value = Number(adminTx.amount || adminTx.original_value || 0);
        description = adminTx.description;
        isReinforcement = description.includes('Reforço') || adminTx.notes?.includes('increase');
        targetTxId = txId;
      } else {
        // Se não for legado, busca na tabela canônica
        const { data: canonicalTx } = await supabase
          .from('financial_transactions')
          .select('*')
          .eq('id', txId)
          .single();
        
        if (!canonicalTx) return;

        value = Number(canonicalTx.amount);
        description = canonicalTx.description;
        isReinforcement = canonicalTx.metadata?.is_reinforcement || description.includes('Reforço');
        targetTxId = txId;
      }

      // 3. Reverter totais no empréstimo
      const updates: any = {};
      if (isReinforcement) {
        updates.principal_amount = Number(loan.principal_amount) - value;
      } else {
        updates.paid_amount = Number(loan.paid_amount) - value;
      }

      await supabase.from('loans').update(updates).eq('id', loanId);

      // 4. Estornar transação bancária vinculada (se for canônico, já temos o ID)
      const { data: targetTx } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('id', targetTxId)
        .single();
      
      if (targetTx) {
        const reversalType = targetTx.type === 'debit' ? 'credit' : 'debit';
        await supabase.from('financial_transactions').insert({
          company_id: loan.company_id,
          account_id: targetTx.account_id,
          type: reversalType,
          amount: targetTx.amount,
          transaction_date: new Date().toISOString().split('T')[0],
          description: `[ESTORNO] ${targetTx.description}`,
          metadata: {
            loan_id: loanId,
            is_reversal: true,
            reverses_id: targetTx.id
          }
        });
      }

      // 5. Invalidar caches
      const { invalidateFinancialCache } = await import('./financialCache');
      const { invalidateDashboardCache } = await import('./dashboardCache');
      invalidateFinancialCache();
      invalidateDashboardCache();

    } catch (error: any) {
      throw new Error(`Erro ao remover transação de empréstimo: ${error.message}`);
    }
  },

  /**
   * Totais de empréstimos ativos via RPC server-side.
   * Zero cálculo no frontend.
   */
  getActiveTotals: async (): Promise<{ 
    takenPrincipal: number; 
    takenPaid: number; 
    takenRemaining: number; 
    grantedPrincipal: number; 
    grantedPaid: number; 
    grantedRemaining: number; 
    countActive: number 
  }> => {
    const { data, error } = await supabase.rpc('rpc_loans_active_totals');

    if (error) {
      console.error('[loansService] getActiveTotals RPC error:', error.message);
      return { takenTotal: 0, grantedTotal: 0, countActive: 0 };
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data;
    return {
      takenPrincipal: Number(result?.takenPrincipal ?? 0),
      takenPaid: Number(result?.takenPaid ?? 0),
      takenRemaining: Number(result?.takenRemaining ?? 0),
      grantedPrincipal: Number(result?.grantedPrincipal ?? 0),
      grantedPaid: Number(result?.grantedPaid ?? 0),
      grantedRemaining: Number(result?.grantedRemaining ?? 0),
      countActive: Number(result?.countActive ?? 0),
    };
  },
};
