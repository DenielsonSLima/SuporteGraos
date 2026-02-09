import { Persistence } from '../persistence';
import { supabase } from '../supabase';
import { supabaseWithRetry } from '../../utils/fetchWithRetry';
import { invalidateDashboardCache } from '../dashboardCache';
import { invalidateFinancialCache } from '../financialCache';
import { auditService } from '../auditService';

export interface Receivable {
  id: string;
  salesOrderId?: string;
  partnerId: string;
  description: string;
  dueDate: string;
  amount: number;
  receivedAmount: number;
  status: 'pending' | 'partially_received' | 'received' | 'overdue' | 'cancelled';
  paymentMethod?: string;
  bankAccountId?: string;
  receiptDate?: string;
  notes?: string;
  companyId?: string;
}

const db = new Persistence<Receivable>('receivables', [], { useStorage: false });
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isLoaded = false;

// ============================================================================
// MAPEAMENTO
// ============================================================================

const mapToDb = (item: Receivable) => ({
  id: item.id,
  sales_order_id: item.salesOrderId || null,
  partner_id: item.partnerId,
  description: item.description,
  due_date: item.dueDate,
  amount: item.amount,
  received_amount: item.receivedAmount,
  status: item.status,
  payment_method: item.paymentMethod || null,
  bank_account_id: item.bankAccountId || null,
  receipt_date: item.receiptDate || null,
  notes: item.notes || null,
  company_id: item.companyId || null
});

const mapFromDb = (row: any): Receivable => ({
  id: row.id,
  salesOrderId: row.sales_order_id,
  partnerId: row.partner_id,
  description: row.description,
  dueDate: row.due_date,
  amount: Number(row.amount),
  receivedAmount: Number(row.received_amount || 0),
  status: row.status,
  paymentMethod: row.payment_method,
  bankAccountId: row.bank_account_id,
  receiptDate: row.receipt_date,
  notes: row.notes,
  companyId: row.company_id
});

// ============================================================================
// CARREGAMENTO INICIAL
// ============================================================================

const loadFromSupabase = async (): Promise<Receivable[]> => {
  try {
    const data = await supabaseWithRetry(() =>
      supabase
        .from('receivables')
        .select('*')
        .order('due_date', { ascending: true })
    );

    const mapped = (data || []).map(mapFromDb);
    db.setAll(mapped);
    isLoaded = true;
    console.log('🔄 Contas a receber sincronizando em tempo real...');
    return mapped;
  } catch (error) {
    console.error('❌ Erro ao carregar receivables:', error);
    return [];
  }
};

// ============================================================================
// REALTIME
// ============================================================================

const startRealtime = () => {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('realtime:receivables')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'receivables' }, (payload) => {
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

const persistUpsert = async (item: Receivable) => {
  try {
    const payload = mapToDb(item);
    const { error } = await supabase.from('receivables').upsert(payload).select();
    if (error) {
      console.error('❌ Erro ao salvar receivable no Supabase', error);
      return;
    }
    // silencioso
    // Realtime irá atualizar automaticamente
  } catch (err) {
    console.error('❌ Erro inesperado ao salvar receivable', err);
  }
};

const persistDelete = async (id: string) => {
  try {
    const { error } = await supabase.from('receivables').delete().eq('id', id);
    if (error) console.error('Erro ao excluir receivable', error);
  } catch (err) {
    console.error('Erro inesperado ao excluir receivable', err);
  }
};

// ❌ NÃO inicializar automaticamente - aguardar autenticação via supabaseInitService
// void loadFromSupabase();
// startRealtime();

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const receivablesService = {
  getAll: () => db.getAll(),
  getById: (id: string) => db.getById(id),
  subscribe: (callback: (items: Receivable[]) => void) => db.subscribe(callback),
  loadFromSupabase,
  startRealtime,

  add: (item: Receivable) => {
    db.add(item);
    void persistUpsert(item);
    invalidateDashboardCache();
    
    // Audit Log
    void auditService.logAction('create', 'Financeiro', `Conta a receber criada: ${item.description} - R$ ${item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, {
      entityType: 'Receivable',
      entityId: item.id,
      metadata: { partnerId: item.partnerId, amount: item.amount, dueDate: item.dueDate }
    });
  },

  update: (item: Receivable) => {
    const old = db.getById(item.id);
    db.update(item);
    void persistUpsert(item);
    invalidateDashboardCache();
    
    // Audit Log (detecta se é recebimento)
    const isReceiving = old && old.receivedAmount !== item.receivedAmount;
    const desc = isReceiving 
      ? `Recebimento registrado: ${item.description} - R$ ${(item.receivedAmount - old.receivedAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : `Conta a receber atualizada: ${item.description}`;
    
    void auditService.logAction('update', 'Financeiro', desc, {
      entityType: 'Receivable',
      entityId: item.id,
      metadata: { receivedAmount: item.receivedAmount, status: item.status }
    });
  },

  delete: (id: string) => {
    const item = db.getById(id);
    db.delete(id);
    void persistDelete(id);
    invalidateDashboardCache();
    
    // Audit Log
    if (item) {
      void auditService.logAction('delete', 'Financeiro', `Conta a receber excluída: ${item.description} - R$ ${item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, {
        entityType: 'Receivable',
        entityId: id,
        metadata: { amount: item.amount }
      });
    }
  }
};
