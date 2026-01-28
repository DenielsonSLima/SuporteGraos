import { Persistence } from '../persistence';
import { supabase } from '../supabase';

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
}

const db = new Persistence<FinancialHistory>('financial_history', []);
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
  company_id: item.companyId || null
});

const mapFromDb = (row: any): FinancialHistory => ({
  id: row.id,
  date: row.date,
  type: row.type,
  operation: row.operation,
  referenceType: row.reference_type,
  referenceId: row.reference_id,
  partnerId: row.partner_id,
  description: row.description,
  amount: Number(row.amount),
  balanceBefore: row.balance_before ? Number(row.balance_before) : undefined,
  balanceAfter: row.balance_after ? Number(row.balance_after) : undefined,
  bankAccountId: row.bank_account_id,
  notes: row.notes,
  companyId: row.company_id
});

// ============================================================================
// CARREGAMENTO INICIAL
// ============================================================================

const loadFromSupabase = async (): Promise<FinancialHistory[]> => {
  try {
    const { data, error } = await supabase
      .from('financial_history')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    const mapped = (data || []).map(mapFromDb);
    db.setAll(mapped);
    isLoaded = true;
    console.log('🔄 Histórico financeiro sincronizando em tempo real...');

    return mapped;
  } catch (error) {
    console.error('❌ Erro ao carregar financial history:', error);
    return [];
  }
};

// ============================================================================
// REALTIME
// ============================================================================

const startRealtime = () => {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('realtime:financial_history')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_history' }, (payload) => {
      const rec = payload.new || payload.old;
      if (!rec) return;

      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const mapped = mapFromDb(rec);
        const existing = db.getById(mapped.id);
        if (existing) db.update(mapped);
        else db.add(mapped);
      } else if (payload.eventType === 'DELETE') {
        db.delete(rec.id);
      }

      console.log(`🔔 Realtime financial_history: ${payload.eventType}`);
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
      console.error('❌ Erro ao salvar history no Supabase', error);
      return;
    }
    console.log('✅ Financial History salvo:', item.id.substring(0, 8));
    // Realtime irá atualizar automaticamente
  } catch (err) {
    console.error('❌ Erro inesperado ao salvar history', err);
  }
};

const persistDelete = async (id: string) => {
  try {
    const { error } = await supabase.from('financial_history').delete().eq('id', id);
    if (error) console.error('Erro ao excluir financial_history', error);
  } catch (err) {
    console.error('Erro inesperado ao excluir financial_history', err);
  }
};

void loadFromSupabase();
startRealtime();

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const financialHistoryService = {
  getAll: () => db.getAll(),
  getById: (id: string) => db.getById(id),
  subscribe: (callback: (items: FinancialHistory[]) => void) => db.subscribe(callback),
  loadFromSupabase,

  add: (item: FinancialHistory) => {
    db.add(item);
    void persistUpsert(item);
  },

  update: (item: FinancialHistory) => {
    db.update(item);
    void persistUpsert(item);
  },

  delete: (id: string) => {
    db.delete(id);
    void persistDelete(id);
  }
};
