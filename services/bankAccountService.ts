/**
 * bankAccountService.ts
 *
 * CRUD de contas bancárias via supabase-js direto.
 * Interface pública mantida compatível com o código legado
 * (financialService, BankAccountsSettings, etc.).
 *
 * Tabela: public.accounts
 * RLS: company_id = public.my_company_id() — isolamento automático por empresa.
 */

import { supabase } from './supabase';
import { BankAccount } from '../modules/Financial/types';

// ─── MAPEADOR ─────────────────────────────────────────────────────────────────

function mapRow(row: any): BankAccount {
  return {
    id:            row.id,
    bankName:      row.account_name   ?? '',
    owner:         row.owner          ?? '',
    agency:        row.agency         ?? '',
    accountNumber: row.account_number ?? '',
    active:        row.is_active      ?? true,
  };
}

// ─── OPERAÇÕES CRUD ───────────────────────────────────────────────────────────

async function getAll(): Promise<BankAccount[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('account_name');
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

async function _getCompanyId(): Promise<string> {
  const { data } = await supabase.rpc('my_company_id');
  if (!data) throw new Error('Empresa não encontrada para o usuário logado.');
  return data as string;
}

async function add(account: BankAccount): Promise<void> {
  const companyId = await _getCompanyId();
  const { error } = await supabase.from('accounts').insert({
    id:             account.id,
    account_name:   account.bankName.trim(),
    account_type:   'bank',
    owner:          account.owner          ?? '',
    agency:         account.agency         ?? '',
    account_number: account.accountNumber  ?? '',
    is_active:      account.active         ?? true,
    company_id:     companyId,
    balance:        0,
  });
  if (error) {
    if (error.code === '23505') throw new Error('Já existe uma conta cadastrada com este nome.');
    throw error;
  }
}

async function update(account: BankAccount): Promise<void> {
  const { error } = await supabase
    .from('accounts')
    .update({
      account_name:   account.bankName.trim(),
      owner:          account.owner          ?? '',
      agency:         account.agency         ?? '',
      account_number: account.accountNumber  ?? '',
      is_active:      account.active         ?? true,
    })
    .eq('id', account.id);
  if (error) throw error;
}

async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id);
  if (error) {
    if (error.code === '23503') throw new Error('Não é possível excluir uma conta com movimentações vinculadas. Inative-a em vez disso.');
    throw error;
  }
}

// ─── REALTIME (singleton channel) ─────────────────────────────────────────────────────────

const subscribeRealtime = (() => {
  const listeners = new Set<() => void>();
  let channel: ReturnType<typeof supabase.channel> | null = null;
  return (callback: () => void): (() => void) => {
    listeners.add(callback);
    if (!channel) {
      channel = supabase
        .channel('bank-accounts-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, () => listeners.forEach(fn => fn()))
        .subscribe();
    }
    return () => {
      listeners.delete(callback);
      if (listeners.size === 0 && channel) { supabase.removeChannel(channel); channel = null; }
    };
  };
})();

// ─── INTERFACE PÚBLICA ────────────────────────────────────────────────────────

export const bankAccountService = {
  // ── Novo padrão (usado pelos hooks TanStack Query) ──
  getAll,
  subscribeRealtime,

  // ── Usado pelos componentes diretamente ──
  add,
  update,
  delete: remove,

  // ── Shims de compatibilidade legados (financialService, etc.) ──
  getBankAccounts:   (): BankAccount[] => {
    console.warn('bankAccountService.getBankAccounts() is DEPRECATED. Use useAccounts() hook or accountsService.getAll()');
    return [];
  },
  getById:           (_id: string): BankAccount | undefined => undefined,
  addBankAccount:    add,
  updateBankAccount: update,
  deleteBankAccount: remove,
  isAccountInUse:    (_id: string): boolean => false,
  subscribe:         (_cb: (items: BankAccount[]) => void): (() => void) => () => {},
  loadFromSupabase:  async (): Promise<void> => {},
  startRealtime:     (): void => {},
  importData:        (_data: BankAccount[]): void => {},
};
