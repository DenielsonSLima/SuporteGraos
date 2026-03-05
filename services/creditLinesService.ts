// services/creditLinesService.ts
// ============================================================================
// Service para Linhas de Crédito
// ============================================================================
// Usa RPC rpc_use_credit_line() para utilizar crédito (gera entry payable)
// ============================================================================

import { supabase } from './supabase';

export interface CreditLine {
  id: string;
  company_id: string;
  creditor_id?: string;
  name: string;
  total_limit: number;
  used_amount: number;
  available_amount: number;
  interest_rate?: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreditLineTotals {
  totalLimit: number;
  totalUsed: number;
  totalAvailable: number;
}

function mapRow(row: any): CreditLine {
  return {
    id: row.id,
    company_id: row.company_id,
    creditor_id: row.creditor_id,
    name: row.name ?? '',
    total_limit: parseFloat(row.total_limit ?? '0'),
    used_amount: parseFloat(row.used_amount ?? '0'),
    available_amount: parseFloat(row.available_amount ?? '0'),
    interest_rate: row.interest_rate ? parseFloat(row.interest_rate) : undefined,
    is_active: row.is_active ?? true,
    start_date: row.start_date,
    end_date: row.end_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getCompanyId(): Promise<string> {
  const { data, error } = await supabase.from('app_users').select('company_id').single();
  if (error || !data?.company_id) throw new Error('Usuário sem empresa vinculada');
  return data.company_id as string;
}

export const creditLinesService = {
  getAll: async (): Promise<CreditLine[]> => {
    const { data, error } = await supabase
      .from('credit_lines')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw new Error(`Erro ao buscar linhas de crédito: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  getActive: async (): Promise<CreditLine[]> => {
    const { data, error } = await supabase
      .from('credit_lines')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (error) throw new Error(`Erro ao buscar linhas ativas: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  getTotals: async (): Promise<CreditLineTotals> => {
    const { data, error } = await supabase.rpc('rpc_credit_lines_totals');
    if (error) {
      throw new Error(`Erro ao buscar totais das linhas de crédito: ${error.message}`);
    }

    const row = Array.isArray(data) ? data[0] : data;
    return {
      totalLimit: Number(row?.total_limit ?? 0),
      totalUsed: Number(row?.total_used ?? 0),
      totalAvailable: Number(row?.total_available ?? 0),
    };
  },

  add: async (creditLine: Omit<CreditLine, 'id' | 'company_id' | 'used_amount' | 'available_amount' | 'created_at' | 'updated_at'>): Promise<void> => {
    const companyId = await getCompanyId();
    const { error } = await supabase.from('credit_lines').insert({
      company_id: companyId,
      creditor_id: creditLine.creditor_id || null,
      name: creditLine.name,
      total_limit: creditLine.total_limit,
      interest_rate: creditLine.interest_rate || null,
      is_active: creditLine.is_active ?? true,
      start_date: creditLine.start_date || null,
      end_date: creditLine.end_date || null,
    });
    if (error) throw new Error(`Erro ao criar linha de crédito: ${error.message}`);
  },

  // Usar crédito via RPC atômica
  useCredit: async (params: {
    creditLineId: string;
    amount: number;
    partnerId: string;
    description?: string;
    dueDate?: string;
  }): Promise<string> => {
    const { data, error } = await supabase.rpc('rpc_use_credit_line', {
      p_credit_line_id: params.creditLineId,
      p_amount: params.amount,
      p_partner_id: params.partnerId,
      p_description: params.description || null,
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
          .channel('realtime:credit_lines')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_lines' }, () => listeners.forEach(fn => fn()))
          .subscribe();
      }
      return () => {
        listeners.delete(onAnyChange);
        if (listeners.size === 0 && channel) { supabase.removeChannel(channel); channel = null; }
      };
    };
  })(),
};
