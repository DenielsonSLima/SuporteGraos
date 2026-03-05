import { Persistence } from '../persistence';
import { supabase } from '../supabase';
import { invalidateDashboardCache } from '../dashboardCache';
import { invalidateFinancialCache } from '../financialCache';
import { logService } from '../logService';
import { auditService } from '../auditService';
import { authService } from '../authService';
import { FinancialRecord } from '../../modules/Financial/types';
import { shouldSkipLegacyTableOps } from '../realtimeTableAvailability';
import { sqlCanonicalOpsLog } from '../sqlCanonicalOps';
import { creditMathService } from './credits/creditMathService';
import { creditReportsService } from './credits/creditReportsService';

// Tipos de créditos
export type CreditType = 'credit_income' | 'investment';

// Interface para o credit que mapeia FinancialRecord
export interface Credit extends FinancialRecord {
  type: 'taken' | 'given';
  investmentRate?: number; // Taxa de rendimento
  earningsToDate?: number; // Juros/rendimentos até agora
}

const db = new Persistence<FinancialRecord>('credits', [], { useStorage: false });
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isLoaded = false;

// ============================================================================
// REALTIME
// ============================================================================

const startRealtime = () => {
  if (shouldSkipLegacyTableOps('credits')) {
    sqlCanonicalOpsLog('creditService.startRealtime ignorado: tabela credits indisponível no modo canônico');
    return;
  }

  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('realtime:credits')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'credits'
    }, () => {
      isLoaded = false;
      void loadFromSupabase();
      invalidateFinancialCache();
      invalidateDashboardCache();
    })
    .subscribe(status => {
      if (status === 'SUBSCRIBED') {
      }
    });
};

const stopRealtime = () => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
};

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
const fromSupabase = (record: any): FinancialRecord => {
  return {
    id: record.id,
    description: record.description,
    entityName: record.entity_name || 'Sem Nome',
    driverName: record.driver_name,
    category: record.category,
    dueDate: record.due_date,
    issueDate: record.issue_date,
    settlementDate: record.settlement_date,
    originalValue: parseFloat(record.original_value) || 0,
    paidValue: parseFloat(record.paid_value || 0) || 0,
    remainingValue: Math.max(0, (parseFloat(record.original_value) || 0) - (parseFloat(record.paid_value || 0) || 0) - (parseFloat(record.discount_value || 0) || 0)),
    discountValue: parseFloat(record.discount_value || 0) || 0,
    status: record.status,
    subType: record.sub_type,
    bankAccount: record.bank_account,
    notes: record.notes,
    assetId: record.asset_id,
    isAssetReceipt: record.is_asset_receipt,
    assetName: record.asset_name,
    weightKg: parseFloat(record.weight_kg || 0) || 0,
  };
};

/**
 * Converte registro do app para formato Supabase (camelCase → snake_case)
 */
const toSupabase = (record: FinancialRecord) => {
  const result = {
    id: record.id,
    description: record.description,
    entity_name: record.entityName,
    driver_name: record.driverName || null,
    category: record.category || 'income',
    due_date: record.dueDate,
    issue_date: record.issueDate,
    settlement_date: record.settlementDate || null,
    original_value: record.originalValue,
    paid_value: record.paidValue ?? 0,
    discount_value: record.discountValue ?? 0,
    status: record.status,
    sub_type: record.subType && record.subType.length > 0 ? record.subType : 'credit_income',
    bank_account: record.bankAccount,
    notes: record.notes || null,
    asset_id: record.assetId || null,
    is_asset_receipt: record.isAssetReceipt || null,
    asset_name: record.assetName || null,
    weight_kg: record.weightKg ?? 0,
    company_id: authService.getCurrentUser()?.companyId || null
  };
  return result;
};

// ============================================================================
// FUNCIONALIDADES PRINCIPAIS
// ============================================================================

/**
 * Carrega créditos do Supabase e armazena em cache
 */
export const loadFromSupabase = async (): Promise<FinancialRecord[]> => {
  if (shouldSkipLegacyTableOps('credits')) {
    sqlCanonicalOpsLog('creditService.loadFromSupabase ignorado: tabela credits indisponível no modo canônico');
    db.setAll([]);
    isLoaded = true;
    return [];
  }

  if (isLoaded) {
    return db.getAll() || [];
  }

  try {
    const { data, error } = await supabase
      .from('credits')
      .select('*')
      .order('issue_date', { ascending: false });

    if (error) {
      return [];
    }

    const records = (data || []).map(fromSupabase);
    db.setAll(records);
    isLoaded = true;

    return records;
  } catch (err) {
    return [];
  }
};

/**
 * Cria um novo crédito
 */
export const create = async (credit: FinancialRecord): Promise<Credit | null> => {
  if (shouldSkipLegacyTableOps('credits')) {
    sqlCanonicalOpsLog('creditService.create ignorado: tabela credits indisponível no modo canônico');
    return null;
  }

  try {
    const sbRecord = toSupabase(credit);

    const { data, error } = await supabase
      .from('credits')
      .insert([sbRecord])
      .select()
      .single();

    if (error) {
      return null;
    }

    const mapped = fromSupabase(data);
    db.add(mapped);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'create',
      module: 'Financeiro',
      description: `Crédito criado: ${mapped.description} - R$ ${mapped.originalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      entityId: mapped.id
    });
    void auditService.logAction('create', 'Financeiro', `Crédito criado: ${mapped.description} - R$ ${mapped.originalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, {
      entityType: 'credit',
      entityId: mapped.id,
      metadata: { subType: mapped.subType, bankAccount: mapped.bankAccount }
    });

    invalidateFinancialCache();

    // ✅ SINGLE LEDGER: Criar a entrada financeira
    try {
      const user = authService.getCurrentUser();
      const companyId = user?.companyId;
      if (companyId) {
        // Mapeamento: given (emprestei -> receivable), taken (tomei -> payable)
        // SubType investment/credit_income costumam ser receivables
        const entryType = (mapped as any).type === 'taken' ? 'loan_payable' : 'loan_receivable';

        await supabase.from('financial_entries').insert({
          company_id: companyId,
          type: entryType,
          origin_type: 'loan',
          origin_id: mapped.id,
          total_amount: mapped.originalValue,
          due_date: mapped.dueDate,
          status: 'open',
          paid_amount: 0,
          remaining_amount: mapped.originalValue,
          created_date: new Date().toISOString().split('T')[0]
        });
      }
    } catch (err) {
    }

    return mapped as Credit;
  } catch (err) {
    return null;
  }
};

/**
 * Atualiza um crédito existente
 */
export const update = async (id: string, updates: Partial<FinancialRecord>): Promise<Credit | null> => {
  if (shouldSkipLegacyTableOps('credits')) {
    sqlCanonicalOpsLog('creditService.update ignorado: tabela credits indisponível no modo canônico');
    return null;
  }

  try {
    const sbUpdates = toSupabase(updates as FinancialRecord);

    const { data, error } = await supabase
      .from('credits')
      .update(sbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return null;
    }

    const mapped = fromSupabase(data);
    const records = db.getAll();
    const updated = records.map(r => r.id === id ? mapped : r);
    db.setAll(updated);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'update',
      module: 'Financeiro',
      description: `Crédito atualizado: ${mapped.description} - R$ ${mapped.originalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      entityId: mapped.id
    });
    void auditService.logAction('update', 'Financeiro', `Crédito atualizado: ${mapped.description} - R$ ${mapped.originalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, {
      entityType: 'credit',
      entityId: mapped.id,
      metadata: { subType: mapped.subType, bankAccount: mapped.bankAccount }
    });

    invalidateFinancialCache();

    // ✅ SINGLE LEDGER: Atualizar a entrada financeira
    try {
      await supabase.from('financial_entries').update({
        total_amount: mapped.originalValue,
        due_date: mapped.dueDate
      }).eq('origin_id', id).eq('origin_type', 'loan');
    } catch (err) {
    }

    return mapped as Credit;
  } catch (err) {
    return null;
  }
};

/**
 * Remove um crédito
 */
export const remove = async (id: string): Promise<boolean> => {
  if (shouldSkipLegacyTableOps('credits')) {
    sqlCanonicalOpsLog('creditService.remove ignorado: tabela credits indisponível no modo canônico');
    return false;
  }

  try {
    const { error } = await supabase
      .from('credits')
      .delete()
      .eq('id', id);

    if (error) {
      return false;
    }

    const records = db.getAll();
    db.setAll(records.filter(r => r.id !== id));

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'delete',
      module: 'Financeiro',
      description: `Crédito removido: ${id}`,
      entityId: id
    });
    void auditService.logAction('delete', 'Financeiro', `Crédito removido: ${id}`, {
      entityType: 'credit',
      entityId: id
    });

    invalidateFinancialCache();

    // ✅ SINGLE LEDGER: Marcar entrada como estornada (imutabilidade do ledger)
    try {
      await supabase.from('financial_entries')
        .update({ status: 'reversed', description: `[ESTORNO] ${id}` })
        .eq('origin_id', id)
        .eq('origin_type', 'loan');
    } catch (err) {
    }

    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Inscreve-se para atualizações em tempo real
 */
export const subscribe = (callback: (credits: FinancialRecord[]) => void): (() => void) => {
  if (shouldSkipLegacyTableOps('credits')) {
    return () => {};
  }

  const channel = supabase
    .channel('credits-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'credits',
      },
      async () => {
        const records = await loadFromSupabase();
        callback(records);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Calcula os juros/rendimentos para um crédito
 */
export const calculateEarnings = (
  principal: number,
  interestRate: number,
  monthsElapsed: number
): number => creditMathService.calculateEarnings(principal, interestRate, monthsElapsed);

/**
 * Calcula o valor total incluindo rendimentos
 */
export const calculateTotalValue = (
  principal: number,
  interestRate: number,
  monthsElapsed: number
): number => creditMathService.calculateTotalValue(principal, interestRate, monthsElapsed);

/**
 * Obtém apenas créditos (filtra por sub_type)
 */
export const getCredits = (): FinancialRecord[] => {
  const all = db.getAll() || [];
  return all.filter(c => ['credit_income', 'investment'].includes(c.subType || ''));
};

/**
 * Agrupa créditos por mês
 */
export const groupByMonth = (credits: FinancialRecord[]): Record<string, FinancialRecord[]> =>
  creditMathService.groupByMonth(credits);

/**
 * Retorna créditos do mês atual
 */
export const getCurrentMonthCredits = (): FinancialRecord[] => {
  const credits = getCredits();
  return creditReportsService.getCurrentMonthCredits(credits);
};

/**
 * Retorna créditos de outros meses (não é mês atual)
 */
export const getOtherMonthsCredits = (): FinancialRecord[] => {
  const credits = getCredits();
  return creditReportsService.getOtherMonthsCredits(credits);
};

// ============================================================================
// RELATÓRIOS
// ============================================================================

/**
 * Resumo de créditos (KPIs)
 */
export const getSummary = () => {
  const credits = getCredits();
  return creditReportsService.getSummary(credits);
};

export default {
  loadFromSupabase,
  startRealtime,
  stopRealtime,
  create,
  update,
  remove,
  subscribe,
  calculateEarnings,
  calculateTotalValue,
  getCredits,
  groupByMonth,
  getCurrentMonthCredits,
  getOtherMonthsCredits,
  getSummary,
};
