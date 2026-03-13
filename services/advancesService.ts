// services/advancesService.ts
// ============================================================================
// Service para Adiantamentos
// ============================================================================
// Usa RPC rpc_create_advance() para criar adiantamento + entry + transaction
// ============================================================================

import { supabase } from './supabase';

export interface Advance {
  id: string;
  company_id: string;
  recipient_id: string;
  recipient_type: 'supplier' | 'client' | 'shareholder';
  amount: number;
  settled_amount: number;
  remaining_amount: number;
  description?: string;
  advance_date: string;
  settlement_date?: string;
  status: 'open' | 'partially_settled' | 'settled' | 'cancelled';
  created_at: string;
  updated_at: string;
}

function mapRow(row: any): Advance {
  return {
    id: row.id,
    company_id: row.company_id,
    recipient_id: row.recipient_id,
    recipient_type: row.recipient_type,
    amount: parseFloat(row.amount ?? '0'),
    settled_amount: parseFloat(row.settled_amount ?? '0'),
    remaining_amount: parseFloat(row.remaining_amount ?? '0'),
    description: row.description,
    advance_date: row.advance_date,
    settlement_date: row.settlement_date,
    status: row.status ?? 'open',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const advancesService = {
  getAll: async (): Promise<Advance[]> => {
    const { data, error } = await supabase
      .from('advances')
      .select('*')
      .order('advance_date', { ascending: false });
    if (error) throw new Error(`Erro ao buscar adiantamentos: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  getByRecipientType: async (type: 'supplier' | 'client' | 'shareholder'): Promise<Advance[]> => {
    const { data, error } = await supabase
      .from('advances')
      .select('*')
      .eq('recipient_type', type)
      .order('advance_date', { ascending: false });
    if (error) throw new Error(`Erro ao buscar adiantamentos por tipo: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  getOpen: async (): Promise<Advance[]> => {
    const { data, error } = await supabase
      .from('advances')
      .select('*')
      .eq('status', 'open')
      .order('advance_date', { ascending: false });
    if (error) throw new Error(`Erro ao buscar adiantamentos abertos: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  // Criar adiantamento via RPC atômica (gera entry + transaction)
  create: async (params: {
    recipientId: string;
    recipientType: 'supplier' | 'client' | 'shareholder';
    amount: number;
    accountId: string;
    description?: string;
    advanceDate?: string;
    parentId?: string;
  }): Promise<string> => {
    const { data, error } = await supabase.rpc('rpc_create_advance', {
      p_recipient_id: params.recipientId,
      p_recipient_type: params.recipientType,
      p_amount: params.amount,
      p_account_id: params.accountId,
      p_description: params.description || null,
      p_advance_date: params.advanceDate || new Date().toISOString().split('T')[0],
      p_parent_id: params.parentId || null,
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
          .channel('realtime:advances')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'advances' }, () => listeners.forEach(fn => fn()))
          .subscribe();
      }
      return () => {
        listeners.delete(onAnyChange);
        if (listeners.size === 0 && channel) { supabase.removeChannel(channel); channel = null; }
      };
    };
  })(),
};
