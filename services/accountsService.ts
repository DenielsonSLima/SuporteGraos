// services/accountsService.ts
// ============================================================================
// Service para gerenciar contas bancárias (accounts)
// ============================================================================
// Padrão: supabase-js direto, RLS filtra por empresa automáticamente
// Sem persistence, sem waitForInit, sem auth adm
// ============================================================================

import { supabase } from './supabase';
import { authService } from './authService';

export interface Account {
  id: string;
  company_id: string;
  account_type: 'bank' | 'cash' | 'credit_card' | 'investment';
  account_name: string;
  owner?: string;
  agency?: string;
  account_number?: string;
  balance: number;
  is_active: boolean;
  allows_negative: boolean;
  created_at: string;
  updated_at: string;
}

// Mapeador: snake_case (DB) → camelCase (Frontend)
function mapRow(row: any): Account {
  return {
    id: row.id,
    company_id: row.company_id,
    account_type: row.account_type,
    account_name: row.account_name ?? '',
    owner: row.owner ?? '',
    agency: row.agency ?? '',
    account_number: row.account_number,
    balance: parseFloat(row.balance ?? '0'),
    is_active: row.is_active ?? true,
    allows_negative: row.allows_negative ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Helper: busca company_id da empresa do usuário autenticado
async function getCompanyId(): Promise<string> {
  const { data, error } = await supabase
    .from('app_users')
    .select('company_id')
    .single();
  if (error || !data?.company_id)
    throw new Error('Usuário sem empresa vinculada');
  return data.company_id as string;
}

export const accountsService = {
  // LEITURA — RLS filtra automaticamente por empresa
  getAll: async (): Promise<Account[]> => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('is_active', true)
      .order('account_name', { ascending: true });

    if (error) throw new Error(`Erro ao buscar contas: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  // LEITURA — todas (incluindo inativas) para Settings
  getAllForSettings: async (): Promise<Account[]> => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('account_name', { ascending: true });

    if (error) throw new Error(`Erro ao buscar contas: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  // LEITURA — busca uma conta por ID
  getById: async (id: string): Promise<Account | null> => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar conta: ${error.message}`);
    }
    return data ? mapRow(data) : null;
  },

  // LEITURA — busca saldo total de todas as contas ativas
  getTotalBalance: async (): Promise<number> => {
    const { data, error } = await supabase.rpc('rpc_accounts_total_balance');

    if (error) {
      throw new Error(
        `Erro ao buscar saldo total via RPC (rpc_accounts_total_balance): ${error.message}`,
      );
    }

    return Number(data ?? 0);
  },

  // INSERÇÃO — criar nova conta
  add: async (
    account: Omit<Account, 'id' | 'company_id' | 'balance' | 'created_at' | 'updated_at'>,
  ): Promise<string> => {
    const companyId = await getCompanyId();
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        company_id: companyId,
        account_type: account.account_type,
        account_name: account.account_name,
        owner: account.owner || null,
        agency: account.agency || null,
        account_number: account.account_number || null,
        is_active: account.is_active ?? true,
        allows_negative: account.allows_negative ?? false,
      })
      .select('id')
      .single();

    if (error) throw new Error(`Erro ao criar conta: ${error.message}`);
    return data.id;
  },

  // ATUALIZAÇÃO
  update: async (id: string, partial: Partial<Account>): Promise<void> => {
    const { error } = await supabase
      .from('accounts')
      .update({
        account_name: partial.account_name,
        owner: partial.owner,
        agency: partial.agency,
        account_number: partial.account_number,
        is_active: partial.is_active,
        allows_negative: partial.allows_negative,
      })
      .eq('id', id);

    if (error) throw new Error(`Erro ao atualizar conta: ${error.message}`);
  },

  // EXCLUSÃO lógica (só marca como inativa)
  softDelete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('accounts')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw new Error(`Erro ao desativar conta: ${error.message}`);
  },

  // REALTIME — singleton channel (evita canais duplicados)
  subscribeRealtime: (() => {
    const listeners = new Set<() => void>();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    return (onAnyChange: () => void): (() => void) => {
      listeners.add(onAnyChange);
      if (!channel) {
        channel = supabase
          .channel('realtime:accounts')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'accounts' },
            (payload: any) => {
              const companyId = authService.getCurrentUser()?.companyId;
              const changedCompanyId = payload?.new?.company_id ?? payload?.old?.company_id;
              if (!companyId || !changedCompanyId || changedCompanyId === companyId) {
                listeners.forEach(fn => fn());
              }
            },
          )
          .subscribe();
      }
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
