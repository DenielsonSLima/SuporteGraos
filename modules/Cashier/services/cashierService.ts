
import { CashierReport, BankBalance, AccountInitialBalance } from '../types';
import { financialActionService } from '../../../services/financialActionService';
import { advanceService } from '../../Financial/Advances/services/advanceService';
import { financialService } from '../../../services/financialService';
import { LoadingCache } from '../../../services/loadingCache';
import { shareholderService } from '../../../services/shareholderService';
import { loanService } from '../../../services/loanService';
import { assetService } from '../../../services/assetService';
import { FinancialCache } from '../../../services/financialCache';

export const cashierService = {
  getCurrentMonthReport: (): CashierReport => {
    // Fonte única de movimentações reais: Histórico Financeiro e Transferências
    const standaloneRecords = financialActionService.getStandaloneRecords();
    const bankAccounts = financialService.getBankAccounts();
    const initialBalances = financialService.getInitialBalances();
    const transfers = financialActionService.getTransfers();
    const allLoadings = LoadingCache.getAll();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    // Mapeamento de movimentações por conta (O(n))
    const txByAccount: Record<string, any[]> = {};
    const addTx = (accId: string, val: number, date: string, type: 'credit' | 'debit') => {
        if (!txByAccount[accId]) txByAccount[accId] = [];
        txByAccount[accId].push({ val, date, type });
    };

    // 1. PROCESSA APENAS O HISTÓRICO CONSOLIDADO (Evita duplicar com transações internas de pedidos)
    standaloneRecords.forEach(r => {
        if (r.status !== 'paid') return;
        
        // Encontra a conta (pode estar salva por ID ou por Nome no mock)
        const acc = bankAccounts.find(a => a.id === r.bankAccount || a.bankName === r.bankAccount);
        if (!acc) return;

        // Lógica de crédito/débito baseada no subType ou Categoria
        const isCredit = ['sales_order', 'loan_granted', 'receipt', 'Venda de Ativo'].includes(r.subType || '') || r.category === 'Venda de Ativo';
        addTx(acc.id, r.paidValue, r.issueDate, isCredit ? 'credit' : 'debit');
    });

    // 2. PROCESSA TRANSFERÊNCIAS (Movimentação entre contas)
    transfers.forEach(t => {
        const originAcc = bankAccounts.find(a => a.bankName === t.originAccount);
        const destAcc = bankAccounts.find(a => a.bankName === t.destinationAccount);
        if (originAcc) addTx(originAcc.id, t.value, t.date, 'debit');
        if (destAcc) addTx(destAcc.id, t.value, t.date, 'credit');
    });

    // 3. CÁLCULO DOS SALDOS (Início do Mês e Atual)
    let totalInitialMonthBalance = 0;
    const initialMonthBalances: AccountInitialBalance[] = [];
    
    const bankBalances: BankBalance[] = bankAccounts.map(account => {
      const initRecord = initialBalances.find(b => b.accountId === account.id);
      const initVal = initRecord ? initRecord.value : 0;
      const initDate = initRecord ? initRecord.date : '2000-01-01';
      
      const accountTxs = txByAccount[account.id] || [];
      
      // Saldo Início do Mês (Somente o que ocorreu entre a implantação e o dia 1º)
      const monthStartVal = accountTxs.reduce((acc, t) => {
          if (t.date >= initDate && t.date < startOfMonth) {
              return t.type === 'credit' ? acc + t.val : acc - t.val;
          }
          return acc;
      }, initVal);

      totalInitialMonthBalance += monthStartVal;
      initialMonthBalances.push({ id: account.id, bankName: account.bankName, value: monthStartVal });

      // Saldo Atual (Tudo até hoje)
      const currentVal = accountTxs.reduce((acc, t) => {
          return t.type === 'credit' ? acc + t.val : acc - t.val;
      }, initVal);

      return { 
        id: account.id, 
        bankName: account.owner ? `${account.bankName} (${account.owner})` : account.bankName, 
        balance: currentVal 
      };
    });

    // --- ATIVOS (DIREITOS) ---
    const totalBankBalance = bankBalances.reduce((acc, b) => acc + b.balance, 0);
    const receivables = FinancialCache.getReceivables();
    
    const pendingSalesReceipts = receivables
      .filter(r => r.subType === 'sales_order' && r.status !== 'paid')
      .reduce((acc, r) => acc + (r.originalValue - r.paidValue - (r.discountValue || 0)), 0);

    const merchandiseInTransitValue = allLoadings
      .filter(l => ['loaded', 'in_transit', 'redirected', 'waiting_unload'].includes(l.status))
      .reduce((acc, l) => acc + (l.totalSalesValue || 0), 0);

    const totalFixedAssetsValue = assetService.getAll().filter(a => a.status === 'active').reduce((acc, a) => acc + a.acquisitionValue, 0);
    const shareholderReceivables = shareholderService.getAll()
      .filter(s => s.financial.currentBalance < 0)
      .reduce((acc, s) => acc + Math.abs(s.financial.currentBalance), 0);

    const loansGranted = loanService.getAll().filter(l => l.type === 'granted' && l.status === 'active').reduce((acc, l) => acc + l.remainingValue, 0);
    const advancesGiven = advanceService.getSummaries().filter(s => s.netBalance > 0).reduce((acc, s) => acc + s.netBalance, 0);
    
    const totalAssets = totalBankBalance + pendingSalesReceipts + merchandiseInTransitValue + loansGranted + shareholderReceivables + advancesGiven + totalFixedAssetsValue;

    // --- PASSIVOS (OBRIGAÇÕES) ---
    const payables = FinancialCache.getPayables();
    const pendingPurchasePayments = payables.filter(r => r.subType === 'purchase_order' && r.status !== 'paid').reduce((acc, r) => acc + (r.originalValue - r.paidValue - (r.discountValue || 0)), 0);
    const pendingFreightPayments = payables.filter(r => r.subType === 'freight' && r.status !== 'paid').reduce((acc, r) => acc + (r.originalValue - r.paidValue - (r.discountValue || 0)), 0);
    const commissionsToPay = payables.filter(r => r.subType === 'commission' && r.status !== 'paid').reduce((acc, r) => acc + (r.originalValue - r.paidValue - (r.discountValue || 0)), 0);
    
    const loansTaken = loanService.getAll().filter(l => l.type === 'taken' && l.status === 'active').reduce((acc, l) => acc + l.remainingValue, 0);
    const advancesTaken = advanceService.getSummaries().filter(s => s.netBalance < 0).reduce((acc, s) => acc + Math.abs(s.netBalance), 0);
    
    const shareholderPayables = shareholderService.getAll()
      .filter(s => s.financial.currentBalance > 0)
      .reduce((acc, s) => acc + s.financial.currentBalance, 0);

    const totalLiabilities = pendingPurchasePayments + pendingFreightPayments + loansTaken + commissionsToPay + shareholderPayables + advancesTaken;

    return {
      id: 'current', referenceDate: new Date().toISOString(), isClosed: false, bankBalances, totalBankBalance, 
      totalInitialBalance: initialBalances.reduce((acc, b) => acc + b.value, 0), totalInitialMonthBalance, initialMonthBalances,
      pendingSalesReceipts, merchandiseInTransitValue, loansGranted, advancesGiven, totalFixedAssetsValue, pendingAssetSalesReceipts: 0, 
      shareholderReceivables, totalAssets, pendingPurchasePayments, pendingFreightPayments, loansTaken, commissionsToPay, advancesTaken, 
      shareholderPayables, totalLiabilities, netBalance: totalAssets - totalLiabilities
    };
  },
  getHistory: (): CashierReport[] => []
};
