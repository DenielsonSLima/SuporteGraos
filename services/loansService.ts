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
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .order('start_date', { ascending: false });
    if (error) throw new Error(`Erro ao buscar empréstimos: ${error.message}`);
    return (data ?? []).map(mapLoan);
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

  // Operação atômica via RPC
  create: async (params: {
    lenderId?: string;
    principalAmount: number;
    interestRate?: number;
    startDate?: string;
    endDate?: string;
    numInstallments?: number;
    description?: string;
  }): Promise<string> => {
    const { data, error } = await supabase.rpc('rpc_create_loan', {
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
    // Cancela parcelas associadas primeiro
    await supabase
      .from('loan_installments')
      .update({ status: 'cancelled' })
      .eq('loan_id', loanId);
    
    // Cancela o empréstimo
    const { error } = await supabase
      .from('loans')
      .update({ status: 'cancelled' })
      .eq('id', loanId);
    if (error) throw new Error(`Erro ao cancelar empréstimo: ${error.message}`);
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
   * Totais de empréstimos ativos via RPC server-side.
   * Zero cálculo no frontend.
   */
  getActiveTotals: async (): Promise<{ takenTotal: number; grantedTotal: number; countActive: number }> => {
    const { data, error } = await supabase.rpc('rpc_loans_active_totals');

    if (error) {
      console.error('[loansService] getActiveTotals RPC error:', error.message);
      return { takenTotal: 0, grantedTotal: 0, countActive: 0 };
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data;
    return {
      takenTotal: Number(result?.takenTotal ?? 0),
      grantedTotal: Number(result?.grantedTotal ?? 0),
      countActive: Number(result?.countActive ?? 0),
    };
  },
};
