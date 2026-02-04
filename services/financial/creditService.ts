import { Persistence } from '../persistence';
import { supabase } from '../supabase';
import { invalidateDashboardCache } from '../dashboardCache';
import { invalidateFinancialCache } from '../financialCache';
import { FinancialRecord } from '../../modules/Financial/types';

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
    discountValue: parseFloat(record.discount_value || 0) || 0,
    status: record.status,
    subType: record.sub_type,
    bankAccount: record.bank_account_id,
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
const toSupabase = (record: FinancialRecord) => ({
  id: record.id,
  description: record.description,
  entity_name: record.entityName,
  driver_name: record.driverName,
  category: record.category,
  due_date: record.dueDate,
  issue_date: record.issueDate,
  settlement_date: record.settlementDate,
  original_value: record.originalValue,
  paid_value: record.paidValue,
  discount_value: record.discountValue,
  status: record.status,
  sub_type: record.subType,
  bank_account_id: record.bankAccount,
  notes: record.notes,
  asset_id: record.assetId,
  is_asset_receipt: record.isAssetReceipt,
  asset_name: record.assetName,
  weight_kg: record.weightKg,
});

// ============================================================================
// FUNCIONALIDADES PRINCIPAIS
// ============================================================================

/**
 * Carrega créditos do Supabase e armazena em cache
 */
export const loadFromSupabase = async (): Promise<FinancialRecord[]> => {
  if (isLoaded) {
    return db.getAll() || [];
  }

  try {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .in('sub_type', ['credit_income', 'investment']);

    if (error) {
      console.error('❌ Erro ao carregar créditos:', error);
      return [];
    }

    const records = (data || []).map(fromSupabase);
    db.setAll(records);
    isLoaded = true;

    return records;
  } catch (err) {
    console.error('❌ Erro ao carregar créditos:', err);
    return [];
  }
};

/**
 * Cria um novo crédito
 */
export const create = async (credit: FinancialRecord): Promise<Credit | null> => {
  try {
    const sbRecord = toSupabase(credit);
    
    const { data, error } = await supabase
      .from('loans')
      .insert([sbRecord])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar crédito:', error);
      return null;
    }

    const mapped = fromSupabase(data);
    db.add(mapped);
    
    invalidateDashboardCache();
    invalidateFinancialCache();

    return mapped as Credit;
  } catch (err) {
    console.error('❌ Erro ao criar crédito:', err);
    return null;
  }
};

/**
 * Atualiza um crédito existente
 */
export const update = async (id: string, updates: Partial<FinancialRecord>): Promise<Credit | null> => {
  try {
    const sbUpdates = toSupabase(updates as FinancialRecord);
    
    const { data, error } = await supabase
      .from('loans')
      .update(sbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar crédito:', error);
      return null;
    }

    const mapped = fromSupabase(data);
    const records = db.getAll();
    const updated = records.map(r => r.id === id ? mapped : r);
    db.setAll(updated);

    invalidateDashboardCache();
    invalidateFinancialCache();

    return mapped as Credit;
  } catch (err) {
    console.error('❌ Erro ao atualizar crédito:', err);
    return null;
  }
};

/**
 * Remove um crédito
 */
export const remove = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('loans')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao deletar crédito:', error);
      return false;
    }

    const records = db.getAll();
    db.setAll(records.filter(r => r.id !== id));

    invalidateDashboardCache();
    invalidateFinancialCache();

    return true;
  } catch (err) {
    console.error('❌ Erro ao deletar crédito:', err);
    return false;
  }
};

/**
 * Inscreve-se para atualizações em tempo real
 */
export const subscribe = (callback: (credits: FinancialRecord[]) => void): (() => void) => {
  const channel = supabase
    .channel('credits-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'loans',
        filter: `sub_type=in.(credit_income,investment)`,
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
): number => {
  // Juros simples: Capital × Taxa × Período
  return principal * (interestRate / 100) * monthsElapsed;
};

/**
 * Calcula o valor total incluindo rendimentos
 */
export const calculateTotalValue = (
  principal: number,
  interestRate: number,
  monthsElapsed: number
): number => {
  const earnings = calculateEarnings(principal, interestRate, monthsElapsed);
  return principal + earnings;
};

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
export const groupByMonth = (credits: FinancialRecord[]): Record<string, FinancialRecord[]> => {
  const grouped: Record<string, FinancialRecord[]> = {};
  
  credits.forEach(credit => {
    const date = new Date(credit.issueDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!grouped[monthKey]) {
      grouped[monthKey] = [];
    }
    grouped[monthKey].push(credit);
  });

  return grouped;
};

/**
 * Retorna créditos do mês atual
 */
export const getCurrentMonthCredits = (): FinancialRecord[] => {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const credits = getCredits();
  return credits.filter(credit => {
    const date = new Date(credit.issueDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return monthKey === currentMonth;
  });
};

/**
 * Retorna créditos de outros meses (não é mês atual)
 */
export const getOtherMonthsCredits = (): FinancialRecord[] => {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const credits = getCredits();
  return credits.filter(credit => {
    const date = new Date(credit.issueDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return monthKey !== currentMonth;
  });
};

// ============================================================================
// RELATÓRIOS
// ============================================================================

/**
 * Resumo de créditos (KPIs)
 */
export const getSummary = () => {
  const credits = getCredits();
  
  const activeCredits = credits.filter(c => c.status === 'pending' || c.status === 'partial');
  const totalInvested = activeCredits.reduce((sum, c) => sum + (c.originalValue || 0), 0);
  
  // Calcula rendimentos médios
  const totalEarnings = activeCredits.reduce((sum, c) => {
    const monthsElapsed = Math.max(1, Math.floor(
      (new Date().getTime() - new Date(c.issueDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
    ));
    const earnings = calculateEarnings(c.originalValue || 0, c.paidValue || 0, monthsElapsed);
    return sum + earnings;
  }, 0);

  return {
    activeCount: activeCredits.length,
    totalInvested,
    totalEarnings,
    averageRate: activeCredits.length > 0 
      ? activeCredits.reduce((sum, c) => sum + (c.paidValue || 0), 0) / activeCredits.length
      : 0,
  };
};

export default {
  loadFromSupabase,
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
