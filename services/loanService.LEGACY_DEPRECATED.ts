
import { LoanRecord, LoanTransaction } from '../modules/Financial/types';
import { Persistence } from './persistence';
import { logService } from './logService';
import { authService } from './authService';
import { financialActionService } from './financialActionService';
import { supabase } from './supabase';
import { supabaseWithRetry } from '../utils/fetchWithRetry';
import { getTodayBR } from '../utils/dateUtils';

const db = new Persistence<LoanRecord>('loans', [], { useStorage: false });

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isLoaded = false;

// ============================================================================
// CARREGAMENTO DO SUPABASE
// ============================================================================

const loadFromSupabase = async () => {
  if (isLoaded) return;
  try {
    const user = authService.getCurrentUser();
    const companyId = user?.companyId;

    if (!companyId) {
      return;
    }

    const loans = await supabaseWithRetry(() =>
      supabase
        .from('loans')
        .select('*')
        .eq('company_id', companyId)
        .order('contract_date', { ascending: false })
    );

    const transformed = ((loans as any[]) || []).map((l: any) => ({
      id: l.id,
      type: l.type as 'taken' | 'granted',
      entityName: l.entity_name,
      contractDate: l.contract_date,
      totalValue: l.total_value,
      interestRate: l.interest_rate || 0,
      installments: l.installments || 1,
      remainingValue: l.remaining_value,
      accountId: l.account_id,
      accountName: l.account_name,
      status: l.status as 'active' | 'settled' | 'default',
      nextDueDate: l.next_due_date,
      isHistorical: l.is_historical || false,
      transactions: l.transactions || []
    }));

    db.setAll(transformed);
    isLoaded = true;
  } catch (err) {
    console.error('[loanService] loadFromSupabase:', err);
  }
};

// ============================================================================
// REALTIME SUPABASE
// ============================================================================

const startRealtime = () => {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('loans_realtime')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'loans' },
      async (payload) => {

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const raw = payload.new as any;
          const loan: LoanRecord = {
            id: raw.id,
            type: raw.type,
            entityName: raw.entity_name,
            contractDate: raw.contract_date,
            totalValue: raw.total_value,
            interestRate: raw.interest_rate || 0,
            installments: raw.installments || 1,
            remainingValue: raw.remaining_value,
            accountId: raw.account_id,
            accountName: raw.account_name,
            status: raw.status,
            nextDueDate: raw.next_due_date,
            isHistorical: raw.is_historical || false,
            transactions: raw.transactions || []
          };

          if (payload.eventType === 'INSERT') {
            db.add(loan);
          } else {
            db.update(loan);
          }
        } else if (payload.eventType === 'DELETE') {
          db.delete(payload.old.id);
        }
      }
    )
    .subscribe((status) => {
    });
};

const stopRealtime = () => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
};

// ❌ NÃO inicializar automaticamente - aguardar autenticação via supabaseInitService
// void loadFromSupabase().then(() => startRealtime());

// ============================================================================
// API PÚBLICA
// ============================================================================

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

export const loanService = {
  loadFromSupabase,
  startRealtime,
  stopRealtime,
  getAll: () => db.getAll(),
  getById: (id: string) => db.getById(id),

  add: async (loan: LoanRecord) => {
    // Inicializa a primeira transação como o aporte inicial
    const initTx: LoanTransaction = {
      id: `init-${loan.id}`,
      date: loan.contractDate,
      type: 'increase',
      value: loan.totalValue,
      description: 'Valor Original do Contrato',
      accountId: loan.accountId,
      accountName: loan.accountName,
      isHistorical: loan.isHistorical || !(loan as any).isImmediateCash
    };

    loan.transactions = [initTx];
    db.add(loan);

    // Sincronizar com Supabase
    try {
      await supabase.from('loans').insert({
        id: loan.id,
        type: loan.type,
        entity_name: loan.entityName,
        contract_date: loan.contractDate,
        total_value: loan.totalValue,
        interest_rate: loan.interestRate,
        installments: loan.installments,
        remaining_value: loan.remainingValue,
        account_id: loan.accountId,
        account_name: loan.accountName,
        status: loan.status,
        next_due_date: loan.nextDueDate,
        is_historical: loan.isHistorical,
        transactions: loan.transactions
      });
    } catch (err) {
    }

    // INTEGRAÇÃO FINANCEIRA
    // Se não for histórico, cria o registro no financeiro geral
    if (!loan.isHistorical) {
      const isImmediate = (loan as any).isImmediateCash;

      financialActionService.addAdminExpense({
        id: `loan-record-${loan.id}`,
        description: `Contrato de Empréstimo: ${loan.entityName}`,
        entityName: loan.entityName,
        category: 'Empréstimos',
        dueDate: loan.nextDueDate, // Vencimento da primeira parcela ou do contrato
        issueDate: loan.contractDate,
        originalValue: loan.totalValue,
        paidValue: isImmediate ? loan.totalValue : 0, // Se imediato, já nasce pago
        status: isImmediate ? 'paid' : 'pending',
        subType: loan.type === 'taken' ? 'loan_taken' : 'loan_granted',
        bankAccount: isImmediate ? loan.accountName : undefined,
        notes: `[EMPRÉSTIMO ${loan.type === 'taken' ? 'TOMADO' : 'CONCEDIDO'}] ${isImmediate ? 'Liquidado no ato' : 'Provisão Pendente'}`
      });
    }

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId, userName, action: 'create', module: 'Financeiro',
      description: `Novo contrato de empréstimo: ${loan.entityName} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(loan.totalValue)}`,
      entityId: loan.id
    });
  },

  addTransaction: async (loanId: string, tx: LoanTransaction) => {
    const loan = db.getById(loanId);
    if (!loan) return;

    loan.transactions = [...(loan.transactions || []), tx];

    const totalIncreases = loan.transactions.filter(t => t.type === 'increase').reduce((acc, t) => acc + t.value, 0);
    const totalDecreases = loan.transactions.filter(t => t.type === 'decrease').reduce((acc, t) => acc + t.value, 0);
    loan.remainingValue = Math.max(0, totalIncreases - totalDecreases);

    if (loan.remainingValue <= 0.05) loan.status = 'settled';
    else loan.status = 'active';

    db.update(loan);

    // Sincronizar com Supabase
    try {
      await supabase.from('loans').update({
        transactions: loan.transactions,
        remaining_value: loan.remainingValue,
        status: loan.status
      }).eq('id', loanId);
    } catch (err) {
    }

    if (!tx.isHistorical && tx.accountId) {
      const isEntry = (loan.type === 'taken' && tx.type === 'increase') || (loan.type === 'granted' && tx.type === 'decrease');

      financialActionService.processRecord(`loan-tx-${tx.id}`, {
        date: tx.date,
        amount: tx.value,
        discount: 0,
        accountId: tx.accountId,
        accountName: tx.accountName,
        notes: `[LANÇAMENTO EM CONTRATO] ${tx.description} - ${loan.entityName}`,
        entityName: loan.entityName
      }, isEntry ? 'receipt' : 'admin');
    }

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId, userName, action: 'update', module: 'Financeiro',
      description: `Lançamento em empréstimo ${loan.entityName}: ${tx.description} (${tx.value})`,
      entityId: loanId
    });
  },

  delete: async (id: string) => {
    db.delete(id);

    // Sincronizar com Supabase
    try {
      await supabase.from('loans').delete().eq('id', id);
    } catch (err) {
    }

    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'delete', module: 'Financeiro', description: `Excluiu contrato de empréstimo ID: ${id}` });
  },

  importData: (data: LoanRecord[]) => {
    db.setAll(data);
    const companyId = authService.getCurrentUser()?.companyId;
    if (!companyId) return;

    void (async () => {
      try {
        const payload = data.map(l => ({
          id: l.id,
          type: l.type,
          entity_name: l.entityName,
          contract_date: l.contractDate,
          total_value: l.totalValue,
          interest_rate: l.interestRate || 0,
          installments: l.installments || 1,
          remaining_value: l.remainingValue,
          account_id: l.accountId,
          account_name: l.accountName,
          status: l.status,
          next_due_date: l.nextDueDate,
          is_historical: l.isHistorical,
          transactions: l.transactions,
          company_id: companyId
        }));
        const { error } = await supabase.from('loans').upsert(payload, { onConflict: 'id' });
        if (error) console.error('❌ Erro ao sincronizar empréstimos:', error);
        
      } catch (err) {
      }
    })();
  }
};
