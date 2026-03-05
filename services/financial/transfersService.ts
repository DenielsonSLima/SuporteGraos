import { Persistence } from '../persistence';
import { authService } from '../authService';
import { supabase } from '../supabase';
import { supabaseWithRetry } from '../../utils/fetchWithRetry';
import { invalidateDashboardCache } from '../dashboardCache';
import { invalidateFinancialCache } from '../financialCache';
import { auditService } from '../auditService';
import { getTodayBR } from '../../utils/dateUtils';

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

export interface TransfersPageOptions {
  limit: number;
  beforeDate?: string;
  startDate?: string;
  endDate?: string;
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
  company_id: item.companyId || authService.getCurrentUser()?.companyId || null,
  created_by: authService.getCurrentUser()?.id || null
});

const mapFromDb = (row: any): Transfer => ({
  id: row.id,
  fromAccountId: row.from_account_id,
  toAccountId: row.to_account_id,
  amount: Number(row.amount),
  transferDate: row.transfer_date || getTodayBR(),
  description: row.description,
  notes: row.notes,
  companyId: row.company_id
});

const TRANSFERS_SELECT_FIELDS = [
  'id',
  'from_account_id',
  'to_account_id',
  'amount',
  'transfer_date',
  'description',
  'notes',
  'company_id'
].join(',');

const fetchPage = async (options: TransfersPageOptions): Promise<Transfer[]> => {
  try {
    const { limit, beforeDate, startDate, endDate } = options;
    const user = authService.getCurrentUser();
    const companyId = user?.companyId;

    if (!companyId) {
      return [];
    }

    let query = supabase
      .from('transfers')
      .select(TRANSFERS_SELECT_FIELDS)
      .eq('company_id', companyId)
      .order('transfer_date', { ascending: false })
      .limit(limit);

    if (beforeDate) query = query.lte('transfer_date', beforeDate);
    if (startDate) query = query.gte('transfer_date', startDate);
    if (endDate) query = query.lte('transfer_date', endDate);

    const data = await supabaseWithRetry(() => query);
    return (data as any[] || []).map(mapFromDb);
  } catch (error) {
    return [];
  }
};

// ============================================================================
// CARREGAMENTO INICIAL
// ============================================================================

const loadFromSupabase = async (): Promise<Transfer[]> => {
  try {
    const user = authService.getCurrentUser();
    const companyId = user?.companyId;

    if (!companyId) {
      return [];
    }

    const data = await supabaseWithRetry(() =>
      supabase
        .from('transfers')
        .select('*')
        .eq('company_id', companyId)
        .order('transfer_date', { ascending: false })
    );

    const mapped = (data as any[] || []).map(mapFromDb);
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

const stopRealtime = () => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
};

// ============================================================================
// PERSISTÊNCIA
// ============================================================================

const persistUpsert = async (item: Transfer) => {
  try {
    const payload = mapToDb(item);
    const { error } = await supabase.from('transfers').upsert(payload).select();
    if (error) {
      return;
    }
    await loadFromSupabase();
  } catch (err) {
  }
};

const persistDelete = async (id: string) => {
  try {
    const { error } = await supabase.from('transfers').delete().eq('id', id);
    if (error) console.error('Erro ao excluir transfer', error);
  } catch (err) {
  }
};

const reverseTransferFinancialMovements = async (item: Transfer) => {
  const { registerFinancialRecords } = await import('./handlers/orchestratorHelpers');
  const txId = Math.random().toString(36).substr(2, 9);

  await registerFinancialRecords({
    txId,
    date: item.transferDate,
    amount: item.amount,
    discount: 0,
    accountId: item.fromAccountId,
    accountName: 'Transferência (Origem)',
    type: 'receipt',
    recordId: item.id,
    referenceType: 'standalone',
    referenceId: item.id,
    description: `Estorno transferência [TRANSFER_REV:${item.id}] retorno para origem`,
    historyType: 'Estorno Transferência Bancária',
    entityName: 'Transferência',
    partnerId: '',
    notes: `[TRANSFER_REV_IN:${item.id}]`
  });

  await registerFinancialRecords({
    txId,
    date: item.transferDate,
    amount: item.amount,
    discount: 0,
    accountId: item.toAccountId,
    accountName: 'Transferência (Destino)',
    type: 'payment',
    recordId: item.id,
    referenceType: 'standalone',
    referenceId: item.id,
    description: `Estorno transferência [TRANSFER_REV:${item.id}] retirada do destino`,
    historyType: 'Estorno Transferência Bancária',
    entityName: 'Transferência',
    partnerId: '',
    notes: `[TRANSFER_REV_OUT:${item.id}]`
  });
};

const createTransferFinancialMovements = async (item: Transfer) => {
  const { registerFinancialRecords } = await import('./handlers/orchestratorHelpers');
  const txId = Math.random().toString(36).substr(2, 9);

  await registerFinancialRecords({
    txId,
    date: item.transferDate,
    amount: item.amount,
    discount: 0,
    accountId: item.fromAccountId,
    accountName: 'Transferência (Origem)',
    type: 'payment',
    recordId: item.id,
    referenceType: 'standalone',
    referenceId: item.id,
    description: `Transferência p/ ${item.toAccountId}: ${item.description}`,
    historyType: 'Transferência Bancária',
    entityName: 'Transferência',
    partnerId: '',
    notes: `[TRANSFER_OUT:${item.id}]`
  });

  await registerFinancialRecords({
    txId,
    date: item.transferDate,
    amount: item.amount,
    discount: 0,
    accountId: item.toAccountId,
    accountName: 'Transferência (Destino)',
    type: 'receipt',
    recordId: item.id,
    referenceType: 'standalone',
    referenceId: item.id,
    description: `Transferência de ${item.fromAccountId}: ${item.description}`,
    historyType: 'Transferência Bancária',
    entityName: 'Transferência',
    partnerId: '',
    notes: `[TRANSFER_IN:${item.id}]`
  });
};

// ❌ NÃO inicializar automaticamente - aguardar autenticação via supabaseInitService
// void loadFromSupabase();
// startRealtime();

// ============================================================================
// EXPORT SERVICE
// ============================================================================

export const transfersService = {
  getAll: () => db.getAll(),
  getById: (id: string) => db.getById(id),
  subscribe: (callback: (items: Transfer[]) => void) => db.subscribe(callback),
  loadFromSupabase,
  fetchPage,
  startRealtime,
  stopRealtime,

  add: async (item: Transfer) => {
    db.add(item);

    const user = authService.getCurrentUser();
    const companyId = user?.companyId;
    if (!companyId) throw new Error('Usuário sem empresa vinculada');

    const { error } = await supabase.rpc('rpc_transfer_accounts', {
      p_id: item.id,
      p_company_id: companyId,
      p_from_account_id: item.fromAccountId,
      p_to_account_id: item.toAccountId,
      p_amount: item.amount,
      p_transfer_date: item.transferDate,
      p_description: item.description,
      p_notes: item.notes || null,
      p_created_by: user.id
    });

    if (error) {
      console.error('[transfersService] Erro ao registrar transferência rpc:', error);
      throw error;
    }

    try {
      const { financialTransactionService } = await import('./financialTransactionService');
      await financialTransactionService.normalizeLegacyTransferTypesAndRecalculate();
    } catch {
    }

    invalidateFinancialCache();
    invalidateDashboardCache();
    window.dispatchEvent(new Event('financial:updated'));
  },

  update: async (item: Transfer) => {
    const previous = db.getById(item.id);
    db.update(item);

    await persistUpsert(item);
    if (previous) {
      await reverseTransferFinancialMovements(previous);
    }
    await createTransferFinancialMovements(item);

    try {
      const { financialTransactionService } = await import('./financialTransactionService');
      await financialTransactionService.normalizeLegacyTransferTypesAndRecalculate();
    } catch {
    }

    invalidateFinancialCache();
    invalidateDashboardCache();
    window.dispatchEvent(new Event('financial:updated'));

    // Audit Log
    void auditService.logAction('update', 'Financeiro', `Transferência alterada: R$ ${item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - ${item.description}`, {
      entityType: 'Transfer',
      entityId: item.id,
      metadata: {
        previousAmount: previous?.amount,
        amount: item.amount,
        previousFrom: previous?.fromAccountId,
        previousTo: previous?.toAccountId,
        from: item.fromAccountId,
        to: item.toAccountId
      }
    });
  },

  delete: async (id: string) => {
    const item = db.getById(id);
    db.delete(id);

    if (item) {
      await reverseTransferFinancialMovements(item);
    }
    await persistDelete(id);

    try {
      const { financialTransactionService } = await import('./financialTransactionService');
      await financialTransactionService.normalizeLegacyTransferTypesAndRecalculate();
    } catch {
    }

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
  },

  importData: async (data: Transfer[]): Promise<void> => {
    if (!data || data.length === 0) return;
    db.setAll(data);
    const companyId = authService.getCurrentUser()?.companyId;
    if (!companyId) return;

    try {
      const payload = data.map(t => ({
        ...mapToDb(t),
        company_id: companyId
      }));
      const { error } = await supabase.from('transfers').upsert(payload, { onConflict: 'id' });
      if (error) {
      } else {
      }
    } catch (err) {
    }
    invalidateFinancialCache();
    invalidateDashboardCache();
    window.dispatchEvent(new Event('financial:updated'));
  }
};
