import { Persistence } from '../persistence';
import { supabase } from '../supabase';

const generateUUID = (): string => {
  if (typeof self !== 'undefined' && self.crypto && self.crypto.randomUUID) {
    return self.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export interface Payable {
  id: string;
  purchaseOrderId?: string;
  partnerId: string;
  partnerName?: string;
  description: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  subType?: 'purchase_order' | 'freight' | 'commission' | 'other';
  paymentMethod?: string;
  bankAccountId?: string;
  paymentDate?: string;
  notes?: string;
  companyId?: string;
  driverName?: string;
  weightKg?: number;
}

const db = new Persistence<Payable>('payables', []);
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isLoaded = false;

// ============================================================================
// MAPEAMENTO
// ============================================================================

const mapToDb = (item: Payable) => ({
  id: item.id,
  purchase_order_id: item.purchaseOrderId || null,
  partner_id: item.partnerId,
  partner_name: item.partnerName || null,
  description: item.description,
  due_date: item.dueDate,
  amount: item.amount,
  paid_amount: item.paidAmount,
  status: item.status,
  sub_type: item.subType || 'other',
  payment_method: item.paymentMethod || null,
  bank_account_id: item.bankAccountId || null,
  payment_date: item.paymentDate || null,
  notes: item.notes || null,
  company_id: item.companyId || null,
  driver_name: item.driverName || null,
  weight_kg: item.weightKg || null
});

const mapFromDb = (row: any): Payable => ({
  id: row.id,
  purchaseOrderId: row.purchase_order_id,
  partnerId: row.partner_id,
  partnerName: row.partner_name,
  description: row.description,
  dueDate: row.due_date,
  amount: Number(row.amount),
  paidAmount: Number(row.paid_amount || 0),
  status: row.status,
  subType: row.sub_type || 'other',
  paymentMethod: row.payment_method,
  bankAccountId: row.bank_account_id,
  paymentDate: row.payment_date,
  notes: row.notes,
  companyId: row.company_id,
  driverName: row.driver_name,
  weightKg: row.weight_kg ? Number(row.weight_kg) : undefined
});

// ============================================================================
// CARREGAMENTO INICIAL
// ============================================================================

const loadFromSupabase = async (): Promise<Payable[]> => {
  try {
    const { data, error } = await supabase
      .from('payables')
      .select('*')
      .order('due_date', { ascending: true });

    if (error) throw error;
    const mapped = (data || []).map(mapFromDb);
    db.setAll(mapped);
    isLoaded = true;
    console.log('🔄 Contas a pagar sincronizando em tempo real...');
    return mapped;
  } catch (error) {
    console.error('❌ Erro ao carregar payables:', error);
    return [];
  }
};

// ============================================================================
// REALTIME
// ============================================================================

const startRealtime = () => {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('realtime:payables')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payables' }, (payload) => {
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

const persistUpsert = async (item: Payable) => {
  try {
    const payload = mapToDb(item);
    const { error } = await supabase.from('payables').upsert(payload).select();
    
    if (error) {
      console.error('❌ Erro ao salvar payable:', error);
      return;
    }
    
    // silencioso
    // Realtime irá atualizar automaticamente via subscription
  } catch (err) {
    console.error('❌ Erro inesperado ao salvar payable:', err);
  }
};

const persistDelete = async (id: string) => {
  try {
    const { error } = await supabase.from('payables').delete().eq('id', id);
    if (error) console.error('Erro ao excluir payable', error);
  } catch (err) {
    console.error('Erro inesperado ao excluir payable', err);
  }
};

void loadFromSupabase();
startRealtime();

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const payablesService = {
  getAll: () => db.getAll(),
  getById: (id: string) => db.getById(id),
  subscribe: (callback: (items: Payable[]) => void) => db.subscribe(callback),
  loadFromSupabase,

  add: (item: Payable) => {
    db.add(item);
    void persistUpsert(item);
  },

  update: (item: Payable) => {
    db.update(item);
    void persistUpsert(item);
  },

  delete: (id: string) => {
    db.delete(id);
    void persistDelete(id);
  }
};
