// services/adminExpensesService.ts
// ============================================================================
// Service para Despesas Administrativas
// ============================================================================
// Usa RPC rpc_create_admin_expense() para criar despesa + entry payable
// ============================================================================

import { supabase } from './supabase';

export interface AdminExpense {
  id: string;
  company_id: string;
  category_id: string;
  description: string;
  amount: number;
  payee_name?: string;
  payee_id?: string;
  account_id?: string;
  expense_date: string;
  due_date?: string;
  paid_date?: string;
  status: 'open' | 'paid' | 'cancelled';
  created_at: string;
  updated_at: string;
}

function mapRow(row: any): AdminExpense {
  return {
    id: row.id,
    company_id: row.company_id,
    category_id: row.category_id,
    description: row.description ?? '',
    amount: parseFloat(row.amount ?? '0'),
    payee_name: row.payee_name,
    payee_id: row.payee_id,
    account_id: row.account_id,
    expense_date: row.expense_date,
    due_date: row.due_date,
    paid_date: row.paid_date,
    status: row.status ?? 'open',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const adminExpensesService = {
  getAll: async (): Promise<AdminExpense[]> => {
    const { data, error } = await supabase
      .from('admin_expenses')
      .select('*')
      .order('expense_date', { ascending: false });
    if (error) throw new Error(`Erro ao buscar despesas: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  getByCategory: async (categoryId: string): Promise<AdminExpense[]> => {
    const { data, error } = await supabase
      .from('admin_expenses')
      .select('*')
      .eq('category_id', categoryId)
      .order('expense_date', { ascending: false });
    if (error) throw new Error(`Erro ao buscar despesas por categoria: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  getByDateRange: async (startDate: string, endDate: string): Promise<AdminExpense[]> => {
    const { data, error } = await supabase
      .from('admin_expenses')
      .select('*')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false });
    if (error) throw new Error(`Erro ao buscar despesas por período: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  // Criar despesa via RPC atômica (gera entry payable automaticamente)
  create: async (params: {
    categoryId?: string;
    description: string;
    amount: number;
    payeeName?: string;
    payeeId?: string;
    accountId?: string;
    expenseDate?: string;
    dueDate?: string;
  }): Promise<string> => {
    const { data, error } = await supabase.rpc('rpc_create_admin_expense', {
      p_category_id: params.categoryId || null,
      p_description: params.description,
      p_amount: params.amount,
      p_payee_name: params.payeeName || null,
      p_payee_id: params.payeeId || null,
      p_account_id: params.accountId || null,
      p_expense_date: params.expenseDate || new Date().toISOString().split('T')[0],
      p_due_date: params.dueDate || null,
    });
    if (error) throw new Error(error.message);
    return data as string;
  },

  subscribeRealtime: (() => {
    const listeners = new Set<() => void>();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    return (onAnyChange: () => void): (() => void) => {
      listeners.add(onAnyChange);
      if (!channel) {
        channel = supabase
          .channel('realtime:admin_expenses')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_expenses' }, () => listeners.forEach(fn => fn()))
          .subscribe();
      }
      return () => {
        listeners.delete(onAnyChange);
        if (listeners.size === 0 && channel) { supabase.removeChannel(channel); channel = null; }
      };
    };
  })(),
};
