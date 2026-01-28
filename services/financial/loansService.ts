import { Persistence } from '../persistence';
import { supabase } from '../supabase';

export interface Loan {
  id: string;
  partnerId?: string;
  type: 'taken' | 'given';
  amount: number;
  outstandingBalance: number;
  interestRate?: number;
  contractDate: string;
  dueDate: string;
  status: 'active' | 'paid' | 'defaulted' | 'cancelled';
  notes?: string;
  companyId?: string;
}

const db = new Persistence<Loan>('loans', []);
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isLoaded = false;

// ============================================================================
// MAPEAMENTO
// ============================================================================

const mapToDb = (item: Loan) => ({
  id: item.id,
  partner_id: item.partnerId || null,
  type: item.type,
  amount: item.amount,
  outstanding_balance: item.outstandingBalance,
  interest_rate: item.interestRate || null,
  contract_date: item.contractDate,
  due_date: item.dueDate,
  status: item.status,
  notes: item.notes || null,
  company_id: item.companyId || null
});

const mapFromDb = (row: any): Loan => ({
  id: row.id,
  partnerId: row.partner_id,
  type: row.type,
  amount: Number(row.amount),
  outstandingBalance: Number(row.outstanding_balance),
  interestRate: row.interest_rate ? Number(row.interest_rate) : undefined,
  contractDate: row.contract_date,
  dueDate: row.due_date,
  status: row.status,
  notes: row.notes,
  companyId: row.company_id
});

// ============================================================================
// CARREGAMENTO INICIAL
// ============================================================================

const loadFromSupabase = async (): Promise<Loan[]> => {
  try {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .order('contract_date', { ascending: false });

    if (error) throw error;
    const mapped = (data || []).map(mapFromDb);
    db.setAll(mapped);
    isLoaded = true;
    console.log('🔄 Empréstimos sincronizando em tempo real...');
    return mapped;
  } catch (error) {
    console.error('❌ Erro ao carregar loans:', error);
    return [];
  }
};

// ============================================================================
// REALTIME
// ============================================================================

const startRealtime = () => {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('realtime:loans')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, (payload) => {
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

      // silencioso
    })
    .subscribe();
};

// ============================================================================
// PERSISTÊNCIA
// ============================================================================

const persistUpsert = async (item: Loan) => {
  try {
    const payload = mapToDb(item);
    const { error } = await supabase.from('loans').upsert(payload).select();
    if (error) {
      console.error('Erro ao salvar loan no Supabase', error);
      return;
    }
    await loadFromSupabase();
  } catch (err) {
    console.error('Erro inesperado ao salvar loan', err);
  }
};

const persistDelete = async (id: string) => {
  try {
    const { error } = await supabase.from('loans').delete().eq('id', id);
    if (error) console.error('Erro ao excluir loan', error);
  } catch (err) {
    console.error('Erro inesperado ao excluir loan', err);
  }
};

void loadFromSupabase();
startRealtime();

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const loansService = {
  getAll: () => db.getAll(),
  getById: (id: string) => db.getById(id),
  subscribe: (callback: (items: Loan[]) => void) => db.subscribe(callback),
  loadFromSupabase,

  add: (item: Loan) => {
    db.add(item);
    void persistUpsert(item);
  },

  update: (item: Loan) => {
    db.update(item);
    void persistUpsert(item);
  },

  delete: (id: string) => {
    db.delete(id);
    void persistDelete(id);
  }
};
