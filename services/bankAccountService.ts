import { logService } from './logService';
import { authService } from './authService';
import { BankAccount } from '../modules/Financial/types';
import { Persistence } from './persistence';
import { supabase } from './supabase';
import { invalidateSettingsCache } from './settingsCache';
import { waitForInit } from './supabaseInitService';
import { financialActionService } from './financialActionService';
import { bankAccountSupabaseSync } from './bankAccount/supabaseSyncService';

const accountsDb = new Persistence<BankAccount>('bank_accounts', [], { useStorage: false });
let _isSupabaseLoaded = false;
let bankAccountsChannel: ReturnType<typeof supabase.channel> | null = null;
let _realtimeStarted = false;

const syncWindowAccounts = () => {
  if (typeof window === 'undefined') return;
  (window as any).bankAccountsList = accountsDb.getAll();
};

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

const mapBankAccountRecord = (record: any): BankAccount => ({
  id: record.id,
  bankName: record.bank_name,
  owner: record.owner || '',
  agency: record.agency || '',
  accountNumber: record.account_number || '',
  active: record.active !== false
});

const loadFromSupabase = async () => {
  try {
    const stats = await waitForInit();
    if (stats.data.bankAccounts && Array.isArray(stats.data.bankAccounts)) {
      const bankAccounts: BankAccount[] = (stats.data.bankAccounts || []).map((account: any) => ({
        id: account.id,
        bankName: account.bank_name,
        owner: account.owner || '',
        agency: account.agency || '',
        accountNumber: account.account_number || '',
        active: account.active
      }));
      accountsDb.setAll(bankAccounts);
      syncWindowAccounts();
      _isSupabaseLoaded = true;
      invalidateSettingsCache();
    }
  } catch (error) {
    console.warn('⚠️ BankAccountService: Erro ao carregar do Supabase:', error);
    _isSupabaseLoaded = false;
  }
};

const startBankAccountRealtime = () => {
  if (_realtimeStarted) return;
  _realtimeStarted = true;

  if (!bankAccountsChannel) {
    bankAccountsChannel = supabase
      .channel('realtime:contas_bancarias')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contas_bancarias' }, payload => {
        const rec = payload.new || payload.old;
        if (!rec) return;
        const account = mapBankAccountRecord(rec);

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const existing = accountsDb.getById(account.id);
          if (existing) accountsDb.update(account);
          else accountsDb.add(account);
        } else if (payload.eventType === 'DELETE') {
          accountsDb.delete(account.id);
        }

        syncWindowAccounts();
        invalidateSettingsCache();
        console.log(`🔔 Realtime contas_bancarias: ${payload.eventType}`);
      })
      .subscribe(status => {
        // Realtime subscribed
      });
  }
};

loadFromSupabase();
startBankAccountRealtime();

export const bankAccountService = {
  getBankAccounts: () => accountsDb.getAll(),

  subscribe: (callback: (items: BankAccount[]) => void) => accountsDb.subscribe(callback),

  addBankAccount: async (account: BankAccount) => {
    const all = accountsDb.getAll();
    if (all.some(a => a.bankName.trim().toLowerCase() === account.bankName.trim().toLowerCase())) {
      throw new Error("Já existe uma conta cadastrada com este nome.");
    }
    accountsDb.add(account);
    syncWindowAccounts();
    invalidateSettingsCache();
    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId, userName, action: 'create', module: 'Configurações',
      description: `Cadastrou conta bancária: ${account.bankName}`,
      entityId: account.id
    });

    // Sync to Supabase (background)
    Promise.resolve().then(() => bankAccountSupabaseSync.syncInsertAccount(account));
  },

  updateBankAccount: async (updatedAccount: BankAccount) => {
    const all = accountsDb.getAll();
    if (all.some(a => a.id !== updatedAccount.id && a.bankName.trim().toLowerCase() === updatedAccount.bankName.trim().toLowerCase())) {
      throw new Error("Já existe outra conta com este nome.");
    }
    accountsDb.update(updatedAccount);
    syncWindowAccounts();
    invalidateSettingsCache();

    // Sync to Supabase (background)
    Promise.resolve().then(() => bankAccountSupabaseSync.syncUpdateAccount(updatedAccount));
  },

  deleteBankAccount: async (id: string) => {
    if (bankAccountService.isAccountInUse(id)) {
      throw new Error("Não é possível excluir uma conta com movimentações. Inative-a em vez disso.");
    }
    
    accountsDb.delete(id);
    syncWindowAccounts();
    invalidateSettingsCache();

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId, userName, action: 'delete', module: 'Configurações',
      description: `Excluiu conta bancária (ID: ${id})`,
      entityId: id
    });

    // Sync to Supabase (background)
    Promise.resolve().then(() => bankAccountSupabaseSync.syncDeleteAccount(id));
  },

  isAccountInUse: (accountId: string): boolean => {
    const acc = accountsDb.getById(accountId);
    if (financialActionService.getStandaloneRecords().some(r => r.bankAccount === accountId || r.bankAccount === acc?.bankName)) return true;
    return false;
  },

  importData: (bankAccounts: BankAccount[]) => {
    if (bankAccounts) accountsDb.setAll(bankAccounts);
    syncWindowAccounts();
  }
};
