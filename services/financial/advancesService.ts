import { Persistence } from '../persistence';
import { supabase } from '../supabase';

export interface Advance {
  id: string;
  partnerId: string;
  type: 'given' | 'received';
  amount: number;
  outstandingBalance: number;
  advanceDate: string;
  relatedType?: string;
  relatedId?: string;
  status: 'pending' | 'settled' | 'cancelled';
  notes?: string;
  companyId?: string;
}

const db = new Persistence<Advance>('advances', []);
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isLoaded = false;

// ============================================================================
// MAPEAMENTO
// ============================================================================

const mapToDb = (item: Advance) => ({
  id: item.id,
  partner_id: item.partnerId,
  type: item.type,
  amount: item.amount,
  outstanding_balance: item.outstandingBalance,
  advance_date: item.advanceDate,
  related_type: item.relatedType || null,
  related_id: item.relatedId || null,
  status: item.status,
  notes: item.notes || null,
  company_id: item.companyId || null
});

const mapFromDb = (row: any): Advance => ({
  id: row.id,
  partnerId: row.partner_id,
  type: row.type,
  amount: Number(row.amount),
  outstandingBalance: Number(row.outstanding_balance),
  advanceDate: row.advance_date,
  relatedType: row.related_type,
  relatedId: row.related_id,
  status: row.status,
  notes: row.notes,
  companyId: row.company_id
});

// ============================================================================
// CARREGAMENTO INICIAL
// ============================================================================

const loadFromSupabase = async (): Promise<Advance[]> => {
  try {
    const { data, error } = await supabase
      .from('advances')
      .select('*')
      .order('advance_date', { ascending: false });

    if (error) throw error;
    const mapped = (data || []).map(mapFromDb);
    db.setAll(mapped);
    isLoaded = true;
    console.log('🔄 Antecipações sincronizando em tempo real...');
    return mapped;
  } catch (error) {
    console.error('❌ Erro ao carregar advances:', error);
    return [];
  }
};

// ============================================================================
// REALTIME
// ============================================================================

const startRealtime = () => {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('realtime:advances')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'advances' }, (payload) => {
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

const persistUpsert = async (item: Advance) => {
  try {
    const payload = mapToDb(item);
    const { error } = await supabase.from('advances').upsert(payload).select();
    if (error) {
      console.error('Erro ao salvar advance no Supabase', error);
      return;
    }
    await loadFromSupabase();
  } catch (err) {
    console.error('Erro inesperado ao salvar advance', err);
  }
};

const persistDelete = async (id: string) => {
  try {
    const { error } = await supabase.from('advances').delete().eq('id', id);
    if (error) console.error('Erro ao excluir advance', error);
  } catch (err) {
    console.error('Erro inesperado ao excluir advance', err);
  }
};

void loadFromSupabase();
startRealtime();

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const advancesService = {
  getAll: () => db.getAll(),
  getById: (id: string) => db.getById(id),
  subscribe: (callback: (items: Advance[]) => void) => db.subscribe(callback),
  loadFromSupabase,

  add: (item: Advance) => {
    db.add(item);
    void persistUpsert(item);
  },

  update: (item: Advance) => {
    db.update(item);
    void persistUpsert(item);
  },

  delete: (id: string) => {
    db.delete(id);
    void persistDelete(id);
  }
};
