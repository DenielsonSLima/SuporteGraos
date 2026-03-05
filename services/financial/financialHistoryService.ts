import { Persistence } from '../persistence';
import { authService } from '../authService';
import { supabase } from '../supabase';
import { invalidateDashboardCache } from '../dashboardCache';
import { invalidateFinancialCache } from '../financialCache';
import { getTodayBR } from '../../utils/dateUtils';
import { payablesService } from './payablesService';
import { receivablesService } from './receivablesService';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../sqlCanonicalOps';

// ⚠️ LEGACY SERVICE — Em modo canônico (SQL Canonical Ops), este serviço é
// completamente inerte (retorna vazio, não inicia realtime).
// O HistoryTab agora usa useTransactionsByDateRange + useTransactionTotals.
// Este serviço existe apenas para compatibilidade de import dos consumidores legacy.
// TODO: Remover completamente quando todos os consumidores forem migrados.

export interface FinancialHistory {
  id: string;
  date: string;
  type: string;
  operation: 'inflow' | 'outflow';
  referenceType?: string;
  referenceId?: string;
  partnerId?: string;
  description: string;
  amount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  bankAccountId?: string;
  notes?: string;
  companyId?: string;
  status?: 'pending' | 'partially_paid' | 'paid' | 'cancelled';
  transactionAmount?: number;
}

export interface FinancialHistoryPageOptions {
  limit: number;
  beforeDate?: string;
  startDate?: string;
  endDate?: string;
}

const db = new Persistence<FinancialHistory>('financial_history', [], { useStorage: false });
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isLoaded = false;

// ============================================================================
// MAPEAMENTO
// ============================================================================

const mapToDb = (item: FinancialHistory) => ({
  id: item.id,
  date: item.date,
  type: item.type,
  operation: item.operation,
  reference_type: item.referenceType || null,
  reference_id: item.referenceId || null,
  partner_id: item.partnerId || null,
  description: item.description,
  amount: item.amount,
  balance_before: item.balanceBefore || null,
  balance_after: item.balanceAfter || null,
  bank_account_id: item.bankAccountId || null,
  notes: item.notes || null,
  company_id: item.companyId || authService.getCurrentUser()?.companyId || null
});

const mapFromV2 = (row: any): FinancialHistory => ({
  id: row.transaction_id || row.entry_id,
  date: row.payment_date || row.due_date,
  type: row.entry_type,
  operation: row.movement_type === 'credit' ? 'inflow' : 'outflow',
  referenceType: row.origin_type,
  referenceId: row.entry_id,
  partnerId: undefined,
  description: row.entry_description,
  amount: row.transaction_amount || 0, // No Histórico Geral, mostramos o valor da movimentação real
  transactionAmount: row.transaction_amount || 0,
  balanceBefore: undefined,
  balanceAfter: undefined,
  bankAccountId: row.account_id,
  status: 'paid', // Se está na view com INNER JOIN, é uma movimentação efetivada
  notes: row.entry_description,
  companyId: row.company_id
});

const V2_SELECT_FIELDS = [
  'entry_id',
  'company_id',
  'entry_type',
  'origin_type',
  'entry_description',
  'total_amount',
  'entry_status',
  'due_date',
  'entry_created_at',
  'transaction_id',
  'account_id',
  'movement_type',
  'transaction_amount',
  'payment_date'
].join(',');

const FINANCIAL_HISTORY_SELECT_FIELDS = [
  'id',
  'date',
  'type',
  'operation',
  'reference_type',
  'reference_id',
  'partner_id',
  'description',
  'amount',
  'balance_before',
  'balance_after',
  'bank_account_id',
  'notes',
  'company_id'
].join(',');

const fetchPage = async (options: FinancialHistoryPageOptions): Promise<FinancialHistory[]> => {
  if (isSqlCanonicalOpsEnabled()) {
    return [];
  }

  try {
    const { limit, beforeDate, startDate, endDate } = options;
    const user = authService.getCurrentUser();
    const companyId = user?.companyId;

    if (!companyId) {
      return [];
    }

    let query = supabase
      .from('financial_history_v2')
      .select(V2_SELECT_FIELDS)
      .eq('company_id', companyId)
      // Ordenação: Pendentes recentes primeiro, depois por data de pagamento
      .order('payment_date', { ascending: false, nullsFirst: true })
      .order('due_date', { ascending: false, nullsFirst: true })
      .order('entry_created_at', { ascending: false })
      .limit(limit);

    if (beforeDate) {
      query = query.or(`payment_date.lte.${beforeDate},and(payment_date.is.null,due_date.lte.${beforeDate})`);
    }
    if (startDate) {
      query = query.or(`payment_date.gte.${startDate},due_date.gte.${startDate}`);
    }
    if (endDate) {
      query = query.or(`payment_date.lte.${endDate},due_date.lte.${endDate}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapFromV2);
  } catch (error) {
    return [];
  }
};

// ============================================================================
// CARREGAMENTO INICIAL
// ============================================================================

const loadFromSupabase = async (): Promise<FinancialHistory[]> => {
  if (isSqlCanonicalOpsEnabled()) {
    db.setAll([]);
    isLoaded = true;
    return [];
  }

  try {
    const user = authService.getCurrentUser();
    const companyId = user?.companyId;

    if (!companyId) {
      return [];
    }

    const { data, error } = await supabase
      .from('financial_history_v2')
      .select('*')
      .eq('company_id', companyId)
      .order('payment_date', { ascending: false })
      .order('entry_created_at', { ascending: false });

    if (error) throw error;
    const mapped = (data || []).map(mapFromV2);
    db.setAll(mapped);
    isLoaded = true;

    return mapped;
  } catch (error) {
    return [];
  }
};

// ============================================================================
// REALTIME
// ============================================================================

const startRealtime = () => {
  if (isSqlCanonicalOpsEnabled()) {
    sqlCanonicalOpsLog('financialHistoryService.startRealtime ignorado (modo canônico)');
    return;
  }

  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('realtime:financial_history_v2')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_entries' }, () => {
      void loadFromSupabase();
      invalidateFinancialCache();
      invalidateDashboardCache();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_transactions_v2' }, (payload: any) => {
      const rec = payload.new || payload.old;
      if (!rec) return;

      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const mapped = mapFromV2(rec);
        const existing = db.getById(mapped.id);
        if (existing) db.update(mapped);
        else db.add(mapped);
      } else if (payload.eventType === 'DELETE') {
        db.delete(rec.id);
      }

      invalidateFinancialCache();
      invalidateDashboardCache();
    })
    .subscribe();
};

// ============================================================================
// PERSISTÊNCIA
// ============================================================================

const persistUpsert = async (item: FinancialHistory) => {
  try {
    const payload = mapToDb(item);
    const { error } = await supabase.from('financial_history').upsert(payload).select();
    if (error) {
      return;
    }
    // Realtime irá atualizar automaticamente
  } catch (err) {
  }
};

const persistDelete = async (id: string) => {
  // Imutabilidade do ledger: em vez de deletar, cria um registro de estorno
  try {
    const original = db.getById(id);
    if (!original) return;

    const reversalId = `rev-${id}-${Date.now()}`;
    const reversal: FinancialHistory = {
      id: reversalId,
      date: getTodayBR(),
      type: original.type,
      operation: original.operation === 'inflow' ? 'outflow' : 'inflow',
      referenceType: original.referenceType,
      referenceId: original.referenceId,
      partnerId: original.partnerId,
      description: `[ESTORNO] ${original.description}`,
      amount: original.amount,
      bankAccountId: original.bankAccountId,
      notes: `[REV_OF:${id}] Estorno automático`,
      companyId: original.companyId,
      status: 'cancelled',
    };

    const payload = mapToDb(reversal);
    const { error } = await supabase.from('financial_history').upsert(payload).select();
    if (error) console.error('Erro ao criar estorno financial_history', error);

    // Adiciona estorno ao cache local
    db.add(reversal);
  } catch (err) {
    console.error('Erro ao estornar financial_history', err);
  }
};

const stopRealtime = () => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
};

// ❌ NÃO inicializar automaticamente - aguardar autenticação via supabaseInitService
// void loadFromSupabase();
// startRealtime();

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const financialHistoryService = {
  getAll: () => db.getAll(),
  getById: (id: string) => db.getById(id),
  subscribe: (callback: (items: FinancialHistory[]) => void) => db.subscribe(callback),
  loadFromSupabase,
  fetchPage,
  startRealtime,
  stopRealtime,

  add: (item: FinancialHistory) => {
    db.add(item);
    void persistUpsert(item);
    invalidateFinancialCache();
    invalidateDashboardCache();
  },

  update: (item: FinancialHistory) => {
    db.update(item);
    void persistUpsert(item);
    invalidateFinancialCache();
    invalidateDashboardCache();
  },

  delete: (id: string) => {
    // Não remove do cache local — cria estorno que será adicionado pelo persistDelete
    void persistDelete(id);
    invalidateFinancialCache();
    invalidateDashboardCache();
  },

  deleteByRef: async (refId: string) => {
    // Imutabilidade: localizar registros por [REF:refId] e criar estornos individuais
    const allItems = db.getAll();
    const matching = allItems.filter(h => (h.notes || '').includes(`[REF:${refId}]`));
    for (const h of matching) {
      await persistDelete(h.id);
    }
  }
};
