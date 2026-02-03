import { Persistence } from '../persistence';
import { supabase } from '../supabase';
import { invalidateDashboardCache } from '../dashboardCache';
import { invalidateFinancialCache } from '../financialCache';
import { auditService } from '../auditService';

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  transferDate: string;
  description: string;
  notes?: string;
  companyId?: string;
}

const db = new Persistence<Transfer>('transfers', [], { useStorage: false });
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isLoaded = false;

// ============================================================================
// MAPEAMENTO
// ============================================================================

const mapToDb = (item: Transfer) => ({
  id: item.id,
  from_account_id: item.fromAccountId,
  to_account_id: item.toAccountId,
  amount: item.amount,
  transfer_date: item.transferDate,
  description: item.description,
  notes: item.notes || null,
  company_id: item.companyId || null
});

const mapFromDb = (row: any): Transfer => ({
  id: row.id,
  fromAccountId: row.from_account_id,
  toAccountId: row.to_account_id,
  amount: Number(row.amount),
  transferDate: row.transfer_date,
  description: row.description,
  notes: row.notes,
  companyId: row.company_id
});

// ============================================================================
// CARREGAMENTO INICIAL
// ============================================================================

const loadFromSupabase = async (): Promise<Transfer[]> => {
  try {
    const { data, error } = await supabase
      .from('transfers')
      .select('*')
      .order('transfer_date', { ascending: false });

    if (error) throw error;
    const mapped = (data || []).map(mapFromDb);
    db.setAll(mapped);
    isLoaded = true;
    console.log('🔄 Transferências sincronizando em tempo real...');

    return mapped;
  } catch (error) {
    console.error('❌ Erro ao carregar transfers:', error);
    return [];
  }
};

// ============================================================================
// REALTIME
// ============================================================================

const startRealtime = () => {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('realtime:transfers')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transfers' }, (payload) => {
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
      
      // Disparar evento para o histórico atualizar
      window.dispatchEvent(new Event('financial:updated'));
    })
    .subscribe();
};

// ============================================================================
// PERSISTÊNCIA
// ============================================================================

const persistUpsert = async (item: Transfer) => {
  try {
    const payload = mapToDb(item);
    const { error } = await supabase.from('transfers').upsert(payload).select();
    if (error) {
      console.error('Erro ao salvar transfer no Supabase', error);
      return;
    }
    await loadFromSupabase();
  } catch (err) {
    console.error('Erro inesperado ao salvar transfer', err);
  }
};

const persistDelete = async (id: string) => {
  try {
    const { error } = await supabase.from('transfers').delete().eq('id', id);
    if (error) console.error('Erro ao excluir transfer', error);
  } catch (err) {
    console.error('Erro inesperado ao excluir transfer', err);
  }
};

void loadFromSupabase();
startRealtime();

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const transfersService = {
  getAll: () => db.getAll(),
  getById: (id: string) => db.getById(id),
  subscribe: (callback: (items: Transfer[]) => void) => db.subscribe(callback),
  loadFromSupabase,

  add: (item: Transfer) => {
    db.add(item);
    void persistUpsert(item);
    invalidateFinancialCache();
    invalidateDashboardCache();
    window.dispatchEvent(new Event('financial:updated'));
    
    // Audit Log
    void auditService.logAction('create', 'Financeiro', `Transferência criada: R$ ${item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - ${item.description}`, {
      entityType: 'Transfer',
      entityId: item.id,
      metadata: { amount: item.amount, fromAccountId: item.fromAccountId, toAccountId: item.toAccountId }
    });
  },

  update: (item: Transfer) => {
    db.update(item);
    void persistUpsert(item);
    invalidateFinancialCache();
    invalidateDashboardCache();
    window.dispatchEvent(new Event('financial:updated'));
    
    // Audit Log
    void auditService.logAction('update', 'Financeiro', `Transferência alterada: R$ ${item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - ${item.description}`, {
      entityType: 'Transfer',
      entityId: item.id,
      metadata: { amount: item.amount }
    });
  },

  delete: (id: string) => {
    const item = db.getById(id);
    db.delete(id);
    void persistDelete(id);
    invalidateFinancialCache();
    invalidateDashboardCache();
    window.dispatchEvent(new Event('financial:updated'));
    
    // Audit Log
    if (item) {
      void auditService.logAction('delete', 'Financeiro', `Transferência excluída: R$ ${item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - ${item.description}`, {
        entityType: 'Transfer',
        entityId: id,
        metadata: { amount: item.amount }
      });
    }
  }
};
