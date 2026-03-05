// services/transfersService.ts
// ============================================================================
// Service para Transferências entre Contas
// ============================================================================
// Usa RPC rpc_transfer_between_accounts() para operação atômica
// ============================================================================

import { supabase } from './supabase';
import { authService } from './authService';

export interface Transfer {
  id: string;
  company_id: string;
  account_from_id: string;
  account_to_id: string;
  amount: number;
  description?: string;
  transfer_date: string;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

function mapRow(row: any): Transfer {
  return {
    id: row.id,
    company_id: row.company_id,
    account_from_id: row.account_from_id,
    account_to_id: row.account_to_id,
    amount: parseFloat(row.amount ?? '0'),
    description: row.description,
    transfer_date: row.transfer_date,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function emitFinancialUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('financial:updated'));
  window.dispatchEvent(new Event('data:updated'));
}

export const transfersService = {
  getAll: async (): Promise<Transfer[]> => {
    const companyId = authService.getCurrentUser()?.companyId;
    let query = supabase
      .from('transfers')
      .select('*')
      .neq('status', 'cancelled'); // Ledger imutável: delete = cancel, não exibe canceladas

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query.order('transfer_date', { ascending: false });

    if (error) throw new Error(`Erro ao buscar transferências: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  // Operação atômica via RPC
  transfer: async (params: {
    accountFromId: string;
    accountToId: string;
    amount: number;
    description?: string;
    transferDate?: string;
  }): Promise<string> => {
    const { data, error } = await supabase.rpc('rpc_transfer_between_accounts', {
      p_account_from_id: params.accountFromId,
      p_account_to_id: params.accountToId,
      p_amount: params.amount,
      p_description: params.description || null,
      p_transfer_date: params.transferDate || new Date().toISOString().split('T')[0],
    });

    if (error) throw new Error(error.message);
    emitFinancialUpdated();
    return data as string;
  },

  update: async (id: string, params: {
    accountFromId: string;
    accountToId: string;
    amount: number;
    description?: string;
    transferDate?: string;
  }): Promise<void> => {
    const { error } = await supabase.rpc('rpc_update_transfer_between_accounts', {
      p_transfer_id: id,
      p_account_from_id: params.accountFromId,
      p_account_to_id: params.accountToId,
      p_amount: params.amount,
      p_description: params.description || null,
      p_transfer_date: params.transferDate || new Date().toISOString().split('T')[0],
    });

    if (error) throw new Error(error.message);
    emitFinancialUpdated();
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.rpc('rpc_delete_transfer_between_accounts', {
      p_transfer_id: id,
    });

    if (error) throw new Error(error.message);
    emitFinancialUpdated();
  },

  /**
   * Retorna total e contagem de transferências do mês via RPC.
   * Zero cálculo no frontend.
   */
  getMonthTotal: async (year?: number, month?: number): Promise<{ total: number; count: number }> => {
    const now = new Date();
    const { data, error } = await supabase.rpc('rpc_transfers_month_total', {
      p_year: year ?? now.getFullYear(),
      p_month: month ?? now.getMonth() + 1,
    });

    if (error) {
      console.error('[transfersService] getMonthTotal RPC error:', error.message);
      return { total: 0, count: 0 };
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data;
    return {
      total: Number(result?.total ?? 0),
      count: Number(result?.count ?? 0),
    };
  },

  subscribeRealtime: (() => {
    const listeners = new Set<() => void>();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    return (onAnyChange: () => void): (() => void) => {
      listeners.add(onAnyChange);
      if (!channel) {
        const companyId = authService.getCurrentUser()?.companyId;
        channel = supabase
          .channel('realtime:transfers')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'transfers',
              ...(companyId ? { filter: `company_id=eq.${companyId}` } : {})
            },
            () => listeners.forEach(fn => fn())
          )
          .subscribe();
      }
      return () => {
        listeners.delete(onAnyChange);
        if (listeners.size === 0 && channel) { supabase.removeChannel(channel); channel = null; }
      };
    };
  })(),
};
