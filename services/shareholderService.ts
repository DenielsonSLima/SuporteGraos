import { supabase } from './supabase';
import { Persistence } from './persistence';
import { invalidateDashboardCache } from './dashboardCache';

// ─── TIPOS EXPORTADOS ─────────────────────────────────────────────────────────

export interface ShareholderTransaction {
  id: string;
  date: string;
  type: 'credit' | 'debit';
  value: number;
  description: string;
  accountId?: string;
}

export interface ShareholderRecurrence {
  active: boolean;
  amount: number;
  day: number;
  lastGeneratedMonth?: string;
}

export interface Shareholder {
  id: string;
  name: string;
  cpf: string;
  email: string;
  phone: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zip: string;
  };
  financial: {
    proLaboreValue: number;
    currentBalance: number;
    lastProLaboreDate?: string;
    recurrence?: ShareholderRecurrence;
    history: ShareholderTransaction[];
  };
}

// ─── MAPEADORES ───────────────────────────────────────────────────────────────

function mapRow(row: any, transactions: ShareholderTransaction[] = []): Shareholder {
  return {
    id: row.id,
    name: row.name ?? '',
    cpf: row.cpf ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    address: {
      street: row.address_street ?? '',
      number: row.address_number ?? '',
      neighborhood: row.address_neighborhood ?? '',
      city: row.address_city ?? '',
      state: row.address_state ?? '',
      zip: row.address_zip ?? '',
    },
    financial: {
      proLaboreValue: Number(row.pro_labore_value) || 0,
      currentBalance: Number(row.current_balance) || 0,
      lastProLaboreDate: row.last_pro_labore_date ?? undefined,
      recurrence: {
        active: row.recurrence_active ?? false,
        amount: Number(row.recurrence_amount) || 0,
        day: row.recurrence_day ?? 1,
        lastGeneratedMonth: row.recurrence_last_generated_month ?? undefined,
      },
      history: transactions,
    },
  };
}

function mapTransactionRow(row: any): ShareholderTransaction {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    value: Number(row.value),
    description: row.description ?? '',
    accountId: row.account_name ?? undefined,
  };
}

// ─── INSTÂNCIA DE PERSISTÊNCIA (CACHE) ────────────────────────────────────────

const db = new Persistence<Shareholder>('shareholders', [], { useStorage: false });
let isInitialized = false;
let realtimeSubscription: any = null;

// ─── SERVICE ──────────────────────────────────────────────────────────────────

export const shareholderService = {

  /**
   * Inicializa o serviço e carrega dados
   */
  initialize: async () => {
    if (isInitialized) return;
    await shareholderService.loadFromSupabase();
    shareholderService.startRealtime();
    isInitialized = true;
  },

  /**
   * Carrega dados do Supabase para o cache em memória
   */
  loadFromSupabase: async () => {
    try {
      const { data, error } = await supabase
        .from('shareholders')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      if (data) {
        db.setAll(data.map((row) => mapRow(row)));
      }
    } catch (error) {
      console.error('❌ Erro ao carregar sócios:', error);
    }
  },

  /**
   * Configura sincronização em tempo real
   */
  startRealtime: () => {
    if (realtimeSubscription) return;
    realtimeSubscription = supabase
      .channel('shareholder_all_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shareholders' }, () => {
        shareholderService.loadFromSupabase();
        invalidateDashboardCache();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shareholder_transactions' }, () => {
        // Quando as transações mudam, precisamos recarregar os saldos
        shareholderService.loadFromSupabase();
        invalidateDashboardCache();
      })
      .subscribe();
  },

  stopRealtime: () => {
    if (realtimeSubscription) {
      supabase.removeChannel(realtimeSubscription);
      realtimeSubscription = null;
    }
  },

  /**
   * Lista todos os sócios da empresa (Síncrono via Cache).
   */
  getAll: (): Shareholder[] => db.getAll(),

  /**
   * Busca um sócio pelo ID, incluindo o histórico de transações.
   */
  getById: async (id: string): Promise<Shareholder | null> => {
    const [{ data: row, error }, { data: txRows, error: txErr }] = await Promise.all([
      supabase.from('shareholders').select('*').eq('id', id).single(),
      supabase.from('shareholder_transactions').select('*').eq('shareholder_id', id).order('date', { ascending: false }),
    ]);

    if (error) throw new Error(`Erro ao buscar sócio: ${error.message}`);
    if (!row) return null;
    if (txErr) throw new Error(`Erro ao buscar transações: ${txErr.message}`);

    return mapRow(row, (txRows ?? []).map(mapTransactionRow));
  },

  /**
   * Adiciona um novo sócio.
   */
  add: async (shareholder: Omit<Shareholder, 'id'>): Promise<Shareholder> => {
    const { data: profile } = await supabase
      .from('app_users')
      .select('company_id')
      .single();

    if (!profile?.company_id) throw new Error('Usuário sem empresa vinculada');

    const { data, error } = await supabase
      .from('shareholders')
      .insert({
        company_id: profile.company_id,
        name: shareholder.name,
        cpf: shareholder.cpf || null,
        email: shareholder.email || null,
        phone: shareholder.phone || null,
        address_street: shareholder.address.street || null,
        address_number: shareholder.address.number || null,
        address_neighborhood: shareholder.address.neighborhood || null,
        address_city: shareholder.address.city || null,
        address_state: shareholder.address.state || null,
        address_zip: shareholder.address.zip || null,
        pro_labore_value: shareholder.financial?.proLaboreValue ?? 0,
        current_balance: shareholder.financial?.currentBalance ?? 0,
        recurrence_active: shareholder.financial?.recurrence?.active ?? false,
        recurrence_amount: shareholder.financial?.recurrence?.amount ?? 0,
        recurrence_day: shareholder.financial?.recurrence?.day ?? 1,
      })
      .select()
      .single();

    if (error) throw new Error(`Erro ao cadastrar sócio: ${error.message}`);

    const newShareholder = mapRow(data);
    db.add(newShareholder);
    invalidateDashboardCache();

    return newShareholder;
  },

  /**
   * Atualiza um sócio existente.
   */
  update: async (shareholder: Shareholder): Promise<void> => {
    const { error } = await supabase
      .from('shareholders')
      .update({
        name: shareholder.name,
        cpf: shareholder.cpf || null,
        email: shareholder.email || null,
        phone: shareholder.phone || null,
        address_street: shareholder.address.street || null,
        address_number: shareholder.address.number || null,
        address_neighborhood: shareholder.address.neighborhood || null,
        address_city: shareholder.address.city || null,
        address_state: shareholder.address.state || null,
        address_zip: shareholder.address.zip || null,
        pro_labore_value: shareholder.financial?.proLaboreValue ?? 0,
        recurrence_active: shareholder.financial?.recurrence?.active ?? false,
        recurrence_amount: shareholder.financial?.recurrence?.amount ?? 0,
        recurrence_day: shareholder.financial?.recurrence?.day ?? 1,
      })
      .eq('id', shareholder.id);

    if (error) throw new Error(`Erro ao atualizar sócio: ${error.message}`);

    db.update(shareholder);
    invalidateDashboardCache();
  },

  /**
   * Exclui um sócio.
   */
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('shareholders')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Erro ao excluir sócio: ${error.message}`);

    db.delete(id);
    invalidateDashboardCache();
  },

  /**
   * Adiciona uma transação financeira para um sócio.
   */
  addTransaction: async (
    shareholderId: string,
    tx: Omit<ShareholderTransaction, 'id'>,
  ): Promise<void> => {
    const { data: profile } = await supabase
      .from('app_users')
      .select('company_id')
      .single();

    if (!profile?.company_id) throw new Error('Usuário sem empresa vinculada');

    const { error } = await supabase.from('shareholder_transactions').insert({
      company_id: profile.company_id,
      shareholder_id: shareholderId,
      date: tx.date,
      type: tx.type,
      value: tx.value,
      description: tx.description || '',
      account_name: tx.accountId ?? null,
    });

    if (error) throw new Error(`Erro ao registrar transação: ${error.message}`);

    // Recalcular saldo e recarregar cache
    await shareholderService._recalcBalance(shareholderId);
    await shareholderService.loadFromSupabase();
    invalidateDashboardCache();
  },

  /**
   * Recalcula o saldo atual do sócio (Internal)
   * Usa a VIEW v_shareholder_balances para agregar no banco (SQL SUM)
   * em vez de buscar todas as transações e reduzir no browser.
   */
  _recalcBalance: async (shareholderId: string): Promise<void> => {
    // SKIL "Saldo Sagrado": recálculo via RPC server-side (nunca UPDATE direto)
    const { error } = await supabase.rpc('rpc_recalc_shareholder_balance', {
      p_shareholder_id: shareholderId,
    });

    if (error) {
      console.error('[shareholderService] Erro ao recalcular saldo via RPC:', error.message);
      throw new Error(`Falha ao recalcular saldo do sócio: ${error.message}`);
    }
  },

  /**
   * Atualiza uma transação financeira existente de um sócio.
   */
  updateTransaction: async (
    shareholderId: string,
    tx: ShareholderTransaction,
  ): Promise<void> => {
    const { error } = await supabase
      .from('shareholder_transactions')
      .update({
        date: tx.date,
        type: tx.type,
        value: tx.value,
        description: tx.description || '',
        account_name: tx.accountId ?? null,
      })
      .eq('id', tx.id);

    if (error) throw new Error(`Erro ao atualizar transação: ${error.message}`);

    await shareholderService._recalcBalance(shareholderId);
    await shareholderService.loadFromSupabase();
    invalidateDashboardCache();
  },

  /**
   * Exclui uma transação financeira de um sócio.
   */
  deleteTransaction: async (
    shareholderId: string,
    txId: string,
  ): Promise<void> => {
    const { error } = await supabase
      .from('shareholder_transactions')
      .delete()
      .eq('id', txId);

    if (error) throw new Error(`Erro ao excluir transação: ${error.message}`);

    await shareholderService._recalcBalance(shareholderId);
    await shareholderService.loadFromSupabase();
    invalidateDashboardCache();
  },

  // ─── COMPATIBILIDADE ─────────────────────────────────────────────────────────

  subscribe: (callback: (items: Shareholder[]) => void): (() => void) => {
    return db.subscribe(callback);
  },

  /**
   * Totais de créditos/débitos de um sócio via RPC server-side.
   * Zero cálculo no frontend.
   */
  getShareholderTotals: async (shareholderId: string): Promise<{ totalCredits: number; totalDebits: number; balance: number }> => {
    const { data, error } = await supabase.rpc('rpc_shareholder_totals', {
      p_shareholder_id: shareholderId,
    });

    if (error) {
      console.error('[shareholderService] getShareholderTotals RPC error:', error.message);
      return { totalCredits: 0, totalDebits: 0, balance: 0 };
    }

    const result = typeof data === 'string' ? JSON.parse(data) : data;
    return {
      totalCredits: Number(result?.totalCredits ?? 0),
      totalDebits: Number(result?.totalDebits ?? 0),
      balance: Number(result?.balance ?? 0),
    };
  },

  subscribeRealtime: (() => {
    const listeners = new Set<() => void>();
    return (onAnyChange: () => void): (() => void) => {
      listeners.add(onAnyChange);
      // startRealtime já guarda contra duplicação internamente
      shareholderService.startRealtime();
      return () => {
        listeners.delete(onAnyChange);
        // NÃO remove o canal — startRealtime é global para o service
      };
    };
  })(),
};
