
import { LoanRecord, LoanTransaction } from '../modules/Financial/types';
import { Persistence } from './persistence';
import { logService } from './logService';
import { authService } from './authService';
import { financialActionService } from './financialActionService';

const db = new Persistence<LoanRecord>('loans', []);

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

export const loanService = {
  getAll: () => db.getAll(),
  getById: (id: string) => db.getById(id),

  add: (loan: LoanRecord) => {
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

  addTransaction: (loanId: string, tx: LoanTransaction) => {
    const loan = db.getById(loanId);
    if (!loan) return;

    loan.transactions = [...(loan.transactions || []), tx];
    
    const totalIncreases = loan.transactions.filter(t => t.type === 'increase').reduce((acc, t) => acc + t.value, 0);
    const totalDecreases = loan.transactions.filter(t => t.type === 'decrease').reduce((acc, t) => acc + t.value, 0);
    loan.remainingValue = Math.max(0, totalIncreases - totalDecreases);

    if (loan.remainingValue <= 0.05) loan.status = 'settled';
    else loan.status = 'active';

    db.update(loan);

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

  delete: (id: string) => {
    db.delete(id);
    const { userId, userName } = getLogInfo();
    logService.addLog({ userId, userName, action: 'delete', module: 'Financeiro', description: `Excluiu contrato de empréstimo ID: ${id}` });
  },

  importData: (data: LoanRecord[]) => db.setAll(data)
};
