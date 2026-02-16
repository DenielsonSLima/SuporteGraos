
import { LoanRecord, LoanTransaction } from '../modules/Financial/types';
import { Persistence } from './persistence';
import { logService } from './logService';
import { authService } from './authService';
import { financialActionService } from './financialActionService';
import { supabase } from './supabase';
import { supabaseWithRetry } from '../utils/fetchWithRetry';

const db = new Persistence<LoanRecord>('loans', [], { useStorage: false });

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isLoaded = false;

// ============================================================================
// CARREGAMENTO DO SUPABASE
// ============================================================================

const loadFromSupabase = async () => {
  if (isLoaded) return;
  try {
    const loans = await supabaseWithRetry(() =>
      supabase
        .from('loans')
        .select('*')
        .order('contract_date', { ascending: false })
    );

    const transformed = (loans || []).map((l: any) => ({
      id: l.id,
      type: l.type as 'taken' | 'granted',
      entityName: l.entity_name,
      contractDate: l.contract_date,
      totalValue: l.total_value,
      remainingValue: l.remaining_value,
      accountId: l.account_id,
      accountName: l.account_name,
      status: l.status as 'active' | 'settled' | 'cancelled',
      nextDueDate: l.next_due_date,
      isHistorical: l.is_historical || false,
      transactions: l.transactions || []
    }));

    db.setAll(transformed);
    isLoaded = true;
    console.log(`[LoanService] ✅ ${transformed.length} empréstimos carregados do Supabase`);
  } catch (err) {
    console.error('[LoanService] ❌ Erro ao carregar:', err);
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
        console.log('[LoanService Realtime]', payload.eventType, payload);

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const raw = payload.new as any;
          const loan: LoanRecord = {
            id: raw.id,
            type: raw.type,
            entityName: raw.entity_name,
            contractDate: raw.contract_date,
            totalValue: raw.total_value,
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
      console.log('[LoanService Realtime] Status:', status);
    });
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
        remaining_value: loan.remainingValue,
        account_id: loan.accountId,
        account_name: loan.accountName,
        status: loan.status,
        next_due_date: loan.nextDueDate,
        is_historical: loan.isHistorical,
        transactions: loan.transactions
      });
    } catch (err) {
      console.error('[LoanService] Erro ao inserir no Supabase:', err);
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
      console.error('[LoanService] Erro ao atualizar transação no Supabase:', err);
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
      console.error('[LoanService] Erro ao deletar no Supabase:', err);
    }

    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'delete', module: 'Financeiro', description: `Excluiu contrato de empréstimo ID: ${id}` });
  },

  importData: (data: LoanRecord[]) => db.setAll(data)
};
