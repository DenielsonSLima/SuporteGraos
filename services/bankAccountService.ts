/**
 * bankAccountService.ts
 *
 * CRUD de contas bancárias via supabase-js direto.
 * Interface pública mantida compatível com o código legado
 * (financialService, BankAccountsSettings, etc.).
 *
 * Tabela: public.bank_accounts
 * RLS: company_id = public.my_company_id() — isolamento automático por empresa.
 */

import { supabase } from './supabase';
import { BankAccount } from '../modules/Financial/types';

// ─── MAPEADOR ─────────────────────────────────────────────────────────────────

function mapRow(row: any): BankAccount {
  return {
    id:            row.id,
    bankName:      row.bank_name      ?? '',
    owner:         row.owner          ?? '',
    agency:        row.agency         ?? '',
    accountNumber: row.account_number ?? '',
    active:        row.active         ?? true,
  };
}

// ─── OPERAÇÕES CRUD ───────────────────────────────────────────────────────────

async function getAll(): Promise<BankAccount[]> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .order('bank_name');
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
  const { error } = await supabase.from('bank_accounts').insert({
    id:             account.id,
    bank_name:      account.bankName.trim(),
    owner:          account.owner          ?? '',
    agency:         account.agency         ?? '',
    account_number: account.accountNumber  ?? '',
    active:         account.active         ?? true,
    company_id:     companyId,
  });
  if (error) {
    if (error.code === '23505') throw new Error('Já existe uma conta cadastrada com este nome.');
    throw error;
  }
}

async function update(account: BankAccount): Promise<void> {
  const { error } = await supabase
    .from('bank_accounts')
    .update({
      bank_name:      account.bankName.trim(),
      owner:          account.owner          ?? '',
      agency:         account.agency         ?? '',
      account_number: account.accountNumber  ?? '',
      active:         account.active         ?? true,
    })
    .eq('id', account.id);
  if (error) throw error;
}

async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('bank_accounts')
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bank_accounts' }, () => listeners.forEach(fn => fn()))
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
  getBankAccounts:   (): BankAccount[] => [],
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
