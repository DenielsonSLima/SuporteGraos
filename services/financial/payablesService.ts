import { Persistence } from '../persistence';
import { supabase } from '../supabase';
import { supabaseWithRetry } from '../../utils/fetchWithRetry';
import { invalidateDashboardCache } from '../dashboardCache';
import { invalidateFinancialCache } from '../financialCache';
import { auditService } from '../auditService';

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
  loadingId?: string; // ID do carregamento (para fretes)
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

export interface PayablesPageOptions {
  limit: number;
  beforeDate?: string;
  startDate?: string;
  endDate?: string;
}

const db = new Persistence<Payable>('payables', [], { useStorage: false });
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isLoaded = false;

// ============================================================================
// MAPEAMENTO
// ============================================================================

const mapToDb = (item: Payable) => ({
  id: item.id,
  purchase_order_id: item.purchaseOrderId || null,
  loading_id: item.loadingId || null,
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
  loadingId: row.loading_id,
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

const PAYABLES_SELECT_FIELDS = [
  'id',
  'purchase_order_id',
  'loading_id',
  'partner_id',
  'partner_name',
  'description',
  'due_date',
  'amount',
  'paid_amount',
  'status',
  'sub_type',
  'payment_method',
  'bank_account_id',
  'payment_date',
  'notes',
  'company_id',
  'driver_name',
  'weight_kg'
].join(',');

const fetchPage = async (options: PayablesPageOptions): Promise<Payable[]> => {
  try {
    const { limit, beforeDate, startDate, endDate } = options;
    let query = supabase
      .from('payables')
      .select(PAYABLES_SELECT_FIELDS)
      .order('due_date', { ascending: false })
      .limit(limit);

    if (beforeDate) query = query.lte('due_date', beforeDate);
    if (startDate) query = query.gte('due_date', startDate);
    if (endDate) query = query.lte('due_date', endDate);

    const data = await supabaseWithRetry(() => query);
    return (data || []).map(mapFromDb);
  } catch (error) {
    console.error('❌ Erro ao paginar payables:', error);
    return [];
  }
};

// ============================================================================
// CARREGAMENTO INICIAL
// ============================================================================

const loadFromSupabase = async (): Promise<Payable[]> => {
  try {
    const data = await supabaseWithRetry(() =>
      supabase
        .from('payables')
        .select('*')
        .order('due_date', { ascending: true })
    );

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

      invalidateFinancialCache();
      invalidateDashboardCache();
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

// ❌ NÃO inicializar automaticamente - aguardar autenticação via supabaseInitService
// void loadFromSupabase();
// startRealtime();

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const payablesService = {
  getAll: () => db.getAll(),
  getById: (id: string) => db.getById(id),
  subscribe: (callback: (items: Payable[]) => void) => db.subscribe(callback),
  loadFromSupabase,
  fetchPage,
  startRealtime,

  add: (item: Payable) => {
    db.add(item);
    void persistUpsert(item);
    invalidateDashboardCache();
    
    // Audit Log
    void auditService.logAction('create', 'Financeiro', `Conta a pagar criada: ${item.description} - R$ ${item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, {
      entityType: 'Payable',
      entityId: item.id,
      metadata: { partnerId: item.partnerId, amount: item.amount, dueDate: item.dueDate }
    });
  },

  update: (item: Payable) => {
    const old = db.getById(item.id);
    db.update(item);
    void persistUpsert(item);
    invalidateDashboardCache();
    
    // Audit Log (detecta se é pagamento)
    const isPaying = old && old.paidAmount !== item.paidAmount;
    const action = isPaying ? 'update' : 'update';
    const desc = isPaying 
      ? `Pagamento registrado: ${item.description} - R$ ${(item.paidAmount - old.paidAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : `Conta a pagar atualizada: ${item.description}`;
    
    void auditService.logAction(action, 'Financeiro', desc, {
      entityType: 'Payable',
      entityId: item.id,
      metadata: { paidAmount: item.paidAmount, status: item.status }
    });
  },

  delete: (id: string) => {
    const item = db.getById(id);
    db.delete(id);
    void persistDelete(id);
    invalidateDashboardCache();
    
    // Audit Log
    if (item) {
      void auditService.logAction('delete', 'Financeiro', `Conta a pagar excluída: ${item.description} - R$ ${item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, {
        entityType: 'Payable',
        entityId: id,
        metadata: { amount: item.amount }
      });
    }
  }
};
