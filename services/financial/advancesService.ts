import { Persistence } from '../persistence';
import { authService } from '../authService';
import { supabase } from '../supabase';
import { invalidateDashboardCache } from '../dashboardCache';
import { invalidateFinancialCache } from '../financialCache';
import { AdvanceTransaction } from '../../modules/Financial/Advances/types';

const db = new Persistence<AdvanceTransaction>('advances', [], { useStorage: false });
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isLoaded = false;

// ============================================================================
// MAPEAMENTO
// ============================================================================

const mapToDb = (item: AdvanceTransaction) => ({
  id: item.id,
  partner_id: item.partnerId,
  partner_name: item.partnerName,
  type: item.type === 'given' ? 'given' : 'received',
  amount: item.value,
  outstanding_balance: item.value, // Initially same as total
  advance_date: item.date,
  status: item.status === 'active' ? 'pending' : 'settled',
  description: item.description,
  notes: null,
  company_id: authService.getCurrentUser()?.companyId || null,
  created_by: authService.getCurrentUser()?.id || null
});

const mapFromDb = (row: any): AdvanceTransaction => ({
  id: row.id,
  partnerId: row.partner_id,
  partnerName: row.partner_name || 'Desconhecido',
  type: row.type === 'given' ? 'given' : 'taken',
  date: row.advance_date,
  value: Number(row.amount),
  description: row.description || '',
  status: row.status === 'pending' ? 'active' : 'settled'
});

// ============================================================================
// CARREGAMENTO INICIAL
// ============================================================================

const loadFromSupabase = async (): Promise<AdvanceTransaction[]> => {
  try {
    const user = authService.getCurrentUser();
    const companyId = user?.companyId;

    if (!companyId) {
      return [];
    }

    const { data, error } = await supabase
      .from('advances')
      .select('*')
      .eq('company_id', companyId)
      .order('advance_date', { ascending: false });

    if (error) throw error;
    const mapped = (data || []).map(mapFromDb);
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

      invalidateFinancialCache();
      invalidateDashboardCache();
    })
    .subscribe();
};

// ============================================================================
// PERSISTÊNCIA
// ============================================================================

const persistUpsert = async (item: AdvanceTransaction) => {
  try {
    const payload = mapToDb(item);
    const { error } = await supabase.from('advances').upsert(payload).select();
    if (error) {
      return;
    }
    await loadFromSupabase();
  } catch (err) {
  }
};

const persistDelete = async (id: string) => {
  try {
    const { error } = await supabase.from('advances').delete().eq('id', id);
    if (error) console.error('Erro ao excluir advance', error);
  } catch (err) {
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

export const advancesService = {
  getAll: () => db.getAll(),
  getById: (id: string) => db.getById(id),
  subscribe: (callback: (items: AdvanceTransaction[]) => void) => db.subscribe(callback),
  loadFromSupabase,
  startRealtime,
  stopRealtime,

  addTransaction: async (item: AdvanceTransaction, cashData?: { accountId: string, accountName: string }) => {
    db.add(item);

    // 1. Persistir no Supabase
    const payload = mapToDb(item);
    const { data: adv, error } = await supabase.from('advances').insert(payload).select().single();

    if (error) throw error;

    // 2. Se houver movimentação de caixa (Adiantamento Pago/Recebido em Dinheiro)
    if (cashData) {
      const { registerFinancialRecords } = await import('./handlers/orchestratorHelpers');
      const txId = Math.random().toString(36).substr(2, 9);

      await registerFinancialRecords({
        txId,
        date: item.date,
        amount: item.value,
        discount: 0,
        accountId: cashData.accountId,
        accountName: cashData.accountName,
        type: item.type === 'given' ? 'payment' : 'receipt',
        recordId: adv.id,
        referenceType: 'standalone', // Advances são standalone por enquanto mas vinculados via link
        referenceId: adv.id,
        description: `Adiantamento: ${item.partnerName}${item.description ? ` - ${item.description}` : ''}`,
        historyType: item.type === 'given' ? 'Adiantamento Concedido' : 'Adiantamento Recebido',
        entityName: item.partnerName,
        partnerId: item.partnerId,
        notes: `[ADVANCE_ID:${adv.id}]`
      });
    }

    invalidateFinancialCache();
    invalidateDashboardCache();
  },

  updateTransaction: (item: AdvanceTransaction) => {
    db.update(item);
    void persistUpsert(item);
  },

  deleteTransaction: async (id: string) => {
    // Triggers e Links cuidarão do estorno se deletarmos a transação vinculada?
    // Por enquanto, deletar a antecipação deve ser cauteloso.
    db.delete(id);
    void persistDelete(id);
  }
};
