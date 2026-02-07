import { logService } from './logService';
import { supabase } from './supabase';
import { invalidateSettingsCache } from './settingsCache';
import { waitForInit } from './supabaseInitService';
import { Persistence } from './persistence';
import { authService } from './authService';
import { InitialBalanceRecord, initialBalanceSupabaseSync } from './initialBalance/supabaseSyncService';

export type { InitialBalanceRecord } from './initialBalance/supabaseSyncService';

const balancesDb = new Persistence<InitialBalanceRecord>('initial_balances', [], { useStorage: false });
let initialBalancesChannel: ReturnType<typeof supabase.channel> | null = null;
let _realtimeStarted = false;

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

const mapInitialBalanceRecord = (record: any): InitialBalanceRecord => ({
  id: record.id,
  accountId: record.account_id,
  accountName: record.account_name,
  date: record.date,
  value: typeof record.value === 'number' ? record.value : parseFloat(record.value)
});

const loadFromSupabase = async () => {
  try {
    const stats = await waitForInit();
    if (stats.data.initialBalances) {
      const initialBalances: InitialBalanceRecord[] = (stats.data.initialBalances || []).map((balance: any) => ({
        id: balance.id,
        accountId: balance.account_id,
        accountName: balance.account_name,
        date: balance.date,
        value: parseFloat(balance.value)
      }));
      balancesDb.setAll(initialBalances);

    }
  } catch (error) {
    console.warn('⚠️ InitialBalanceService: Erro ao carregar do Supabase:', error);
  }
};

const startInitialBalanceRealtime = () => {
  if (_realtimeStarted) return;
  _realtimeStarted = true;

  if (!initialBalancesChannel) {
    initialBalancesChannel = supabase
      .channel('realtime:initial_balances')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'initial_balances' }, payload => {
        const rec = payload.new || payload.old;
        if (!rec) return;
        const balance = mapInitialBalanceRecord(rec);

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const existing = balancesDb.getById(balance.id);
          if (existing) balancesDb.update(balance);
          else balancesDb.add(balance);
        } else if (payload.eventType === 'DELETE') {
          balancesDb.delete(balance.id);
        }

        invalidateSettingsCache();
        console.log(`🔔 Realtime initial_balances: ${payload.eventType}`);
      })
      .subscribe(status => {
        // Realtime subscribed
      });
  }
};

// ❌ NÃO inicializar automaticamente - aguardar autenticação
// loadFromSupabase();
startInitialBalanceRealtime();

export const initialBalanceService = {
  loadFromSupabase,
  startRealtime: startInitialBalanceRealtime,
  getInitialBalances: () => balancesDb.getAll(),

  subscribe: (callback: (items: InitialBalanceRecord[]) => void) => {
    startInitialBalanceRealtime();
    return balancesDb.subscribe(callback);
  },

  addInitialBalance: async (balance: InitialBalanceRecord) => {
    const existing = balancesDb.getAll().find(b => b.accountId === balance.accountId);
    if (existing) {
      throw new Error(`A conta ${balance.accountName} já possui um saldo inicial cadastrado.`);
    }
    balancesDb.add(balance);
    invalidateSettingsCache();
    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId, userName, action: 'create', module: 'Configurações',
      description: `Definiu saldo inicial (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(balance.value)}) para conta: ${balance.accountName}`,
      entityId: balance.id
    });

    // Sync to Supabase (background)
    Promise.resolve().then(() => initialBalanceSupabaseSync.syncInsertBalance(balance));
  },

  removeInitialBalance: async (id: string) => {
    balancesDb.delete(id);
    invalidateSettingsCache();

    // Sync to Supabase (background)
    Promise.resolve().then(() => initialBalanceSupabaseSync.syncDeleteBalance(id));
  },

  importData: (initialBalances: InitialBalanceRecord[]) => {
    if (initialBalances) balancesDb.setAll(initialBalances);
  }
};
