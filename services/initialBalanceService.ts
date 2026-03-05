/**
 * initialBalanceService.ts
 *
 * CRUD de saldos iniciais (marco zero) por conta bancária.
 *
 * Tabela: public.initial_balances
 * RLS: company_id = public.my_company_id() — isolamento automático por empresa.
 * Constraint UNIQUE (company_id, account_id): cada conta tem apenas 1 saldo inicial.
 */

import { supabase } from './supabase';

// ─── TIPO EXPORTADO ───────────────────────────────────────────────────────────

export interface InitialBalanceRecord {
  id: string;
  accountId: string;
  accountName: string;
  date: string;
  value: number;
}

// ─── MAPEADOR ─────────────────────────────────────────────────────────────────

function mapRow(row: any): InitialBalanceRecord {
  return {
    id:          row.id,
    accountId:   row.account_id   ?? '',
    accountName: row.account_name ?? '',
    date:        row.date         ?? '',
    value:       typeof row.value === 'number' ? row.value : parseFloat(row.value ?? '0'),
  };
}

// ─── OPERAÇÕES CRUD ───────────────────────────────────────────────────────────

async function getAll(): Promise<InitialBalanceRecord[]> {
  const { data, error } = await supabase
    .from('initial_balances')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

async function _getCompanyId(): Promise<string> {
  const { data } = await supabase.rpc('my_company_id');
  if (!data) throw new Error('Empresa não encontrada para o usuário logado.');
  return data as string;
}

async function add(balance: InitialBalanceRecord): Promise<void> {
  const { error } = await supabase.rpc('rpc_set_initial_balance', {
    p_account_id: balance.accountId,
    p_account_name: balance.accountName,
    p_date: balance.date,
    p_value: balance.value,
  });
  if (error) {
    if (error.code === '23505') throw new Error(`A conta ${balance.accountName} já possui um saldo inicial cadastrado.`);
    throw error;
  }
}

async function remove(id: string): Promise<void> {
  const { error } = await supabase.rpc('rpc_remove_initial_balance', {
    p_balance_id: id,
  });
  if (error) throw error;
}

// ─── REALTIME (singleton channel) ─────────────────────────────────────────────────────────

const subscribeRealtime = (() => {
  const listeners = new Set<() => void>();
  let channel: ReturnType<typeof supabase.channel> | null = null;
  return (callback: () => void): (() => void) => {
    listeners.add(callback);
    if (!channel) {
      channel = supabase
        .channel('initial-balances-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'initial_balances' }, () => listeners.forEach(fn => fn()))
        .subscribe();
    }
    return () => {
      listeners.delete(callback);
      if (listeners.size === 0 && channel) { supabase.removeChannel(channel); channel = null; }
    };
  };
})();

// ─── INTERFACE PÚBLICA ────────────────────────────────────────────────────────

export const initialBalanceService = {
  // ── Novo padrão (usado pelos hooks TanStack Query) ──
  getAll,
  subscribeRealtime,

  // ── Usado pelos componentes diretamente ──
  add,
  delete: remove,

  // ── Shims de compatibilidade legados ──
  getInitialBalances:   (): InitialBalanceRecord[] => [],
  addInitialBalance:    add,
  removeInitialBalance: remove,
  subscribe:            (_cb: (items: InitialBalanceRecord[]) => void): (() => void) => () => {},
  loadFromSupabase:     async (): Promise<void> => {},
  startRealtime:        (): void => {},
  importData:           (_data: InitialBalanceRecord[]): void => {},
};
