import { Persistence } from '../persistence';
import { supabase } from '../supabase';
import { invalidateDashboardCache } from '../dashboardCache';
import { invalidateFinancialCache } from '../financialCache';
import { FinancialRecord } from '../../modules/Financial/types';
import { logService } from '../logService';
import { auditService } from '../auditService';
import { authService } from '../authService';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../sqlCanonicalOps';
import { StandaloneRecord as StandaloneRecordDB } from '../../types/database';

// Tipos de empréstimos
export type LoanType = 'loan_taken' | 'loan_granted';

// Interface para o loan que mapeia FinancialRecord
export interface Loan extends FinancialRecord {
  type: 'taken' | 'granted';
}

export interface LoansPageOptions {
  limit: number;
  beforeDate?: string;
  startDate?: string;
  endDate?: string;
}

const db = new Persistence<FinancialRecord>('loans', [], { useStorage: false });
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isLoaded = false;

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return {
    userId: user?.id || 'system',
    userName: user?.name || 'Sistema'
  };
};

// ============================================================================
// MAPEAMENTO
// ============================================================================

/**
 * Converte registro do Supabase (snake_case) para o formato do app (camelCase)
 */
const fromSupabase = (record: StandaloneRecordDB): FinancialRecord => {

  return {
    id: record.id,
    description: record.description,
    entityName: record.entity_name || 'Sem Nome',
    driverName: record.driver_name,
    category: record.category,
    dueDate: record.due_date,
    issueDate: record.issue_date,
    settlementDate: record.settlement_date,
    originalValue: record.original_value || 0,
    paidValue: record.paid_value || 0,
    discountValue: record.discount_value || 0,
    status: record.status as FinancialRecord['status'],
    subType: record.sub_type as FinancialRecord['subType'],
    bankAccount: record.bank_account ?? undefined,
    notes: record.notes ?? undefined,
  };
};

/**
 * Converte registro do app para o formato do Supabase
 */
const toSupabase = (record: FinancialRecord): Partial<StandaloneRecordDB> => ({
  id: record.id,
  description: record.description,
  entity_name: record.entityName,
  driver_name: record.driverName,
  category: record.category,
  due_date: record.dueDate,
  issue_date: record.issueDate,
  settlement_date: record.settlementDate,
  original_value: record.originalValue,
  paid_value: record.paidValue || 0,
  discount_value: record.discountValue || 0,
  status: record.status,
  sub_type: record.subType,
  bank_account: record.bankAccount,
  notes: record.notes,
  company_id: authService.getCurrentUser()?.companyId || null
});

const LOANS_SELECT_FIELDS = [
  'id',
  'description',
  'entity_name',
  'driver_name',
  'category',
  'due_date',
  'issue_date',
  'settlement_date',
  'original_value',
  'paid_value',
  'discount_value',
  'status',
  'sub_type',
  'bank_account',
  'notes'
].join(',');

const fetchPage = async (options: LoansPageOptions): Promise<FinancialRecord[]> => {
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
      .from('admin_expenses')
      .select(LOANS_SELECT_FIELDS)
      .eq('company_id', companyId)
      .in('sub_type', ['loan_taken', 'loan_granted'])
      .order('issue_date', { ascending: false })
      .limit(limit);

    if (beforeDate) query = query.lte('issue_date', beforeDate);
    if (startDate) query = query.gte('issue_date', startDate);
    if (endDate) query = query.lte('issue_date', endDate);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(fromSupabase);
  } catch (error) {
    return [];
  }
};

// ============================================================================
// CARREGAMENTO INICIAL
// ============================================================================

const loadFromSupabase = async (): Promise<FinancialRecord[]> => {
  if (isSqlCanonicalOpsEnabled()) {
    db.clear();
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
      .from('admin_expenses')
      .select('*')
      .eq('company_id', companyId)
      .in('sub_type', ['loan_taken', 'loan_granted'])
      .order('issue_date', { ascending: false });

    if (error) {
      throw error;
    }


    const mapped = (data || []).map(fromSupabase);
    db.clear();
    mapped.forEach(record => db.add(record));
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
    sqlCanonicalOpsLog('loansService.startRealtime legado ignorado (modo canônico)');
    return;
  }

  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('realtime:admin_expenses_loans')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'admin_expenses',
        filter: `sub_type=in.(loan_taken,loan_granted)`
      },
      (payload) => {
        const rec = payload.new || payload.old;
        if (!rec) return;

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const mapped = fromSupabase(rec);
          const existing = db.getById(mapped.id);
          if (existing) db.update(mapped);
          else db.add(mapped);
        } else if (payload.eventType === 'DELETE') {
          db.delete(rec.id);
        }

        invalidateFinancialCache();
        invalidateDashboardCache();
      }
    )
    .subscribe();
};

// ============================================================================
// PERSISTÊNCIA
// ============================================================================

const persistUpsert = async (item: FinancialRecord) => {
  try {
    const payload = toSupabase(item);


    const { error } = await supabase
      .from('admin_expenses')
      .upsert(payload)
      .select();

    if (error) {
      return;
    }
    await loadFromSupabase();
  } catch (err) {
  }
};

const persistDelete = async (id: string) => {
  try {
    const { error } = await supabase
      .from('admin_expenses')
      .delete()
      .eq('id', id);

    if (error) console.error('Erro ao excluir loan', error);
    else await loadFromSupabase();
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

export const loansService = {
  getAll: () => db.getAll(),
  getById: (id: string) => db.getById(id),
  subscribe: (callback: (items: FinancialRecord[]) => void) => db.subscribe(callback),
  loadFromSupabase,
  fetchPage,
  startRealtime,
  stopRealtime,

  add: async (item: FinancialRecord) => {
    // 1. Chamar RPC atômica para criar o empréstimo, a entry e movimentar o saldo
    const { userId, userName } = getLogInfo();
    const companyId = authService.getCurrentUser()?.companyId;

    if (!companyId) throw new Error('Company ID is missing');

    const { error } = await supabase.rpc('rpc_register_loan', {
      p_company_id: companyId,
      p_id: item.id,
      p_description: item.description,
      p_entity_name: item.entityName,
      p_category: item.category,
      p_issue_date: item.issueDate,
      p_due_date: item.dueDate,
      p_original_value: item.originalValue,
      p_bank_account_id: item.bankAccount,
      p_type: item.subType,
      p_notes: item.notes || ''
    });

    if (error) {
      console.error('[loansService] add error:', error);
      throw error;
    }

    // A RPC já salvou no standalone_records. Vamos atualizar a memória.
    db.add(item);

    logService.addLog({
      userId,
      userName,
      action: 'create',
      module: 'Financeiro',
      description: `Empréstimo criado: ${item.description} - R$ ${item.originalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      entityId: item.id
    });
    void auditService.logAction('create', 'Financeiro', `Empréstimo criado: ${item.description} - R$ ${item.originalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, {
      entityType: 'loan',
      entityId: item.id,
      metadata: { subType: item.subType, bankAccount: item.bankAccount }
    });

    invalidateFinancialCache();
    invalidateDashboardCache();
  },

  update: (item: FinancialRecord) => {
    db.update(item);
    void persistUpsert(item);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'update',
      module: 'Financeiro',
      description: `Empréstimo atualizado: ${item.description} - R$ ${item.originalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      entityId: item.id
    });
    void auditService.logAction('update', 'Financeiro', `Empréstimo atualizado: ${item.description} - R$ ${item.originalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, {
      entityType: 'loan',
      entityId: item.id,
      metadata: { subType: item.subType, bankAccount: item.bankAccount }
    });
    invalidateFinancialCache();
    invalidateDashboardCache();
  },

  delete: (id: string) => {
    // Remover o registro principal
    db.delete(id);
    void persistDelete(id);

    // Remover também o registro auxiliar (credit ou debit)
    const creditId = `${id}-credit`;
    const debitId = `${id}-debit`;

    db.delete(creditId);
    void persistDelete(creditId);

    db.delete(debitId);
    void persistDelete(debitId);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'delete',
      module: 'Financeiro',
      description: `Empréstimo removido: ${id}`,
      entityId: id
    });
    void auditService.logAction('delete', 'Financeiro', `Empréstimo removido: ${id}`, {
      entityType: 'loan',
      entityId: id
    });

    invalidateFinancialCache();
    invalidateDashboardCache();
  }
};
