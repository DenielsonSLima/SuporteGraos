import { Persistence } from '../persistence';
import { supabase } from '../supabase';
import { invalidateDashboardCache } from '../dashboardCache';
import { invalidateFinancialCache } from '../financialCache';
import { FinancialRecord } from '../../modules/Financial/types';
import { logService } from '../logService';
import { auditService } from '../auditService';
import { authService } from '../authService';

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
const fromSupabase = (record: any): FinancialRecord => {
  console.log(`📊 Mapeando loan:`, {
    id: record.id,
    entityName: record.entity_name,
    description: record.description,
    originalValue: record.original_value,
    paidValue: record.paid_value,
    status: record.status,
    subType: record.sub_type
  });

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
    bankAccount: record.bank_account,
    notes: record.notes,
  };
};

/**
 * Converte registro do app para o formato do Supabase
 */
const toSupabase = (record: FinancialRecord): any => ({
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
  try {
    const { limit, beforeDate, startDate, endDate } = options;
    let query = supabase
      .from('standalone_records')
      .select(LOANS_SELECT_FIELDS)
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
    console.error('❌ Erro ao paginar loans:', error);
    return [];
  }
};

// ============================================================================
// CARREGAMENTO INICIAL
// ============================================================================

const loadFromSupabase = async (): Promise<FinancialRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('standalone_records')
      .select('*')
      .in('sub_type', ['loan_taken', 'loan_granted'])
      .order('issue_date', { ascending: false });

    if (error) {
      console.error('❌ Erro SQL ao carregar loans:', error);
      throw error;
    }

    console.log(`📥 Dados brutos recebidos do Supabase (${data?.length || 0} registros):`, data);

    const mapped = (data || []).map(fromSupabase);
    db.clear();
    mapped.forEach(record => db.add(record));
    isLoaded = true;
    console.log(`✅ Empréstimos sincronizados em tempo real (${mapped.length} registros)`);
    return mapped;
  } catch (error) {
    console.error('❌ Erro ao carregar loans:', error);
    return [];
  }
};

// ============================================================================
// REALTIME
// ============================================================================

const startRealtime = () => {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('realtime:standalone_records_loans')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'standalone_records',
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
    
    console.log('🔥 Salvando empréstimo no Supabase:', payload);
    
    const { error } = await supabase
      .from('standalone_records')
      .upsert(payload)
      .select();
    
    if (error) {
      console.error('❌ Erro ao salvar loan no Supabase:', error);
      return;
    }
    await loadFromSupabase();
  } catch (err) {
    console.error('Erro inesperado ao salvar loan', err);
  }
};

const persistDelete = async (id: string) => {
  try {
    const { error } = await supabase
      .from('standalone_records')
      .delete()
      .eq('id', id);
    
    if (error) console.error('Erro ao excluir loan', error);
    else await loadFromSupabase();
  } catch (err) {
    console.error('Erro inesperado ao excluir loan', err);
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

  add: (item: FinancialRecord) => {
    // Criar dois registros: o empréstimo em si + o crédito/débito na conta
    const records: FinancialRecord[] = [item];
    
    // Segundo registro: o impacto no saldo da conta (criar DO ZERO)
    if (item.subType === 'loan_taken') {
      // Empréstimo tomado = crédito na conta (entrada de dinheiro)
      records.push({
        id: `${item.id}-credit`,
        description: `Crédito de Empréstimo: ${item.description}`,
        entityName: item.entityName,
        category: 'Empréstimos',
        issueDate: item.issueDate,
        dueDate: item.issueDate,
        originalValue: item.originalValue,
        paidValue: item.originalValue, // PAGO - entra na conta AGORA
        discountValue: 0,
        status: 'paid' as const,
        subType: 'receipt', // Receipt = entrada/crédito
        bankAccount: item.bankAccount
      });
    } else if (item.subType === 'loan_granted') {
      // Empréstimo cedido = débito na conta (saída de dinheiro)
      records.push({
        id: `${item.id}-debit`,
        description: `Débito de Empréstimo: ${item.description}`,
        entityName: item.entityName,
        category: 'Empréstimos',
        issueDate: item.issueDate,
        dueDate: item.issueDate,
        originalValue: item.originalValue,
        paidValue: item.originalValue, // PAGO - sai da conta AGORA
        discountValue: 0,
        status: 'paid' as const,
        subType: 'admin', // Admin = saída/débito
        bankAccount: item.bankAccount
      });
    }
    
    // Salvar ambos os registros
    records.forEach(rec => {
      db.add(rec);
      void persistUpsert(rec);
    });

    const { userId, userName } = getLogInfo();
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

    // NÃO atualizar saldo manualmente - o sistema já calcula baseado nas transações (receipt/admin)
    // O registro 'receipt' com status='paid' será processado pelo cashierService automaticamente

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

// ============================================================================
// FUNÇÃO AUXILIAR: ATUALIZAR SALDO DA CONTA BANCÁRIA
// ============================================================================

/**
 * Atualiza o saldo de uma conta bancária quando um empréstimo é criado
 */
const updateBankAccountBalance = async (loan: FinancialRecord) => {
  try {
    console.log('🔄 Iniciando atualização de saldo para:', loan.bankAccount);
    const { bankAccountService } = await import('../bankAccountService');
    
    const currentAccount = bankAccountService.getById(loan.bankAccount as string);
    if (!currentAccount) {
      console.warn('⚠️ Conta bancária não encontrada:', loan.bankAccount);
      console.log('📋 Contas disponíveis:', bankAccountService.getAll().map(a => ({ id: a.id, name: a.bankName, balance: a.balance })));
      return;
    }

    console.log(`📊 Conta encontrada: ${currentAccount.bankName}, saldo atual: R$ ${currentAccount.balance}`);

    // Calcular novo saldo
    let newBalance = (currentAccount.balance || 0);
    
    if (loan.subType === 'loan_taken') {
      // Empréstimo tomado = saldo aumenta
      newBalance += loan.originalValue;
      console.log(`✅ Empréstimo TOMADO: Saldo aumentará de R$ ${currentAccount.balance} para R$ ${newBalance}`);
    } else if (loan.subType === 'loan_granted') {
      // Empréstimo cedido = saldo diminui
      newBalance -= loan.originalValue;
      console.log(`✅ Empréstimo CEDIDO: Saldo diminuirá de R$ ${currentAccount.balance} para R$ ${newBalance}`);
    } else {
      console.warn(`⚠️ Tipo de empréstimo desconhecido: ${loan.subType}, não atualizando saldo`);
      return;
    }

    // Atualizar a conta
    const updatedAccount = {
      ...currentAccount,
      balance: newBalance
    };

    console.log(`💾 Atualizando conta com novo saldo: R$ ${newBalance}`);
    await bankAccountService.updateBankAccount(updatedAccount);
    console.log(`✅ Conta atualizada com sucesso!`);
  } catch (err) {
    console.error('❌ Erro ao atualizar saldo da conta bancária:', err);
  }
};
