/**
 * 📈 historyService - Cálculo Retroativo de Meses
 * 
 * Filtra financial_history por data (month/year) para recalcular
 * relatórios de meses anteriores.
 * 
 * Suporta:
 * - Lançamentos atrasados que devem ser de mês anterior
 * - Ajustes/correções que modificam saldo retroativo
 * - Recálculo automático ao filtrar por data
 */

import { financialActionService } from '../../../../services/financialActionService';
import { financialService } from '../../../../services/financialService';
import { transfersService } from '../../../../services/financial/transfersService';
import { loansService } from '../../../../services/financial/loansService';
import { advanceService } from '../../../../modules/Financial/Advances/services/advanceService';
import { shareholderService } from '../../../../services/shareholderService';
import { assetService } from '../../../../services/assetService';
import { LoadingCache } from '../../../../services/loadingCache';
import { FinancialCache } from '../../../../services/financialCache';

import { MonthlyReport, HistoryListItem } from './types';

/**
 * Calcula relatório para um mês específico
 * @param year Ex: 2026
 * @param month Ex: 1 (janeiro)
 * @returns MonthlyReport com dados daquele mês
 */
export const calculateMonthlyReport = (year: number, month: number): MonthlyReport => {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const monthLabel = new Date(year, month - 1).toLocaleDateString('pt-BR', { 
    month: 'long', 
    year: 'numeric' 
  });

  const startOfMonth = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];

  // ============================================================================
  // 1. FILTRA TRANSAÇÕES DO MÊS
  // ============================================================================
  
  const standaloneRecords = financialActionService.getStandaloneRecords();
  const bankAccounts = financialService.getBankAccounts();
  const initialBalances = financialService.getInitialBalances();
  const transfers = transfersService.getAll();
  const allLoadings = LoadingCache.getAll();

  // Mapeamento de movimentações por conta
  const txByAccount: Record<string, any[]> = {};
  const addTx = (accId: string, val: number, date: string, type: 'credit' | 'debit') => {
    if (!txByAccount[accId]) txByAccount[accId] = [];
    txByAccount[accId].push({ val, date, type });
  };

  // Filtra apenas registros do mês (por issueDate)
  standaloneRecords.forEach(r => {
    if (r.status !== 'paid') return;
    if (r.issueDate < startOfMonth || r.issueDate > endOfMonth) return;

    const acc = bankAccounts.find(a => a.id === r.bankAccount || a.bankName === r.bankAccount);
    if (!acc) return;

    const isCredit = ['sales_order', 'receipt', 'loan_taken', 'Venda de Ativo'].includes(
      r.subType || ''
    ) || r.category === 'Venda de Ativo';
    
    addTx(acc.id, r.paidValue, r.issueDate, isCredit ? 'credit' : 'debit');
  });

  // Filtra transferências do mês
  transfers.forEach(t => {
    if (t.transferDate < startOfMonth || t.transferDate > endOfMonth) return;
    if (t.fromAccountId) addTx(t.fromAccountId, t.amount, t.transferDate, 'debit');
    if (t.toAccountId) addTx(t.toAccountId, t.amount, t.transferDate, 'credit');
  });

  // ============================================================================
  // 2. CÁLCULO DE SALDOS (Início e Fim do Mês)
  // ============================================================================

  let totalInitialMonthBalance = 0;
  const initialMonthBalances: any[] = [];

  const bankBalances = bankAccounts.map(account => {
    const initRecord = initialBalances.find(b => b.accountId === account.id);
    const initVal = initRecord ? initRecord.value : 0;
    const initDate = initRecord ? initRecord.date : '2000-01-01';

    const accountTxs = txByAccount[account.id] || [];

    // Saldo do INÍCIO do mês (antes de qualquer transação do mês)
    const monthStartVal = accountTxs.reduce((acc, t) => {
      if (t.date >= initDate && t.date < startOfMonth) {
        return t.type === 'credit' ? acc + t.val : acc - t.val;
      }
      return acc;
    }, initVal);

    totalInitialMonthBalance += monthStartVal;
    initialMonthBalances.push({ 
      id: account.id, 
      bankName: account.bankName, 
      value: monthStartVal 
    });

    // Saldo FINAL do mês (início + transações do mês)
    const monthEndVal = accountTxs.reduce((acc, t) => {
      if (t.date >= startOfMonth && t.date <= endOfMonth) {
        return t.type === 'credit' ? acc + t.val : acc - t.val;
      }
      return acc;
    }, monthStartVal);

    return {
      id: account.id,
      bankName: account.owner ? `${account.bankName} (${account.owner})` : account.bankName,
      balance: monthEndVal
    };
  });

  // ============================================================================
  // 3. ATIVOS E PASSIVOS (mesmo cálculo, mas filtrando por data)
  // ============================================================================

  const totalBankBalance = bankBalances.reduce((acc, b) => acc + b.balance, 0);
  const receivables = FinancialCache.getReceivables();
  const payables = FinancialCache.getPayables();

  // Contas a receber em aberto (até fim do mês)
  const pendingSalesReceipts = receivables
    .filter(r => r.subType === 'sales_order' && r.status !== 'paid' && r.issueDate <= endOfMonth)
    .reduce((acc, r) => acc + (r.originalValue - r.paidValue - (r.discountValue || 0)), 0);

  // Mercadorias em trânsito (carregamentos)
  const merchandiseInTransitValue = allLoadings
    .filter(l => ['loaded', 'in_transit', 'redirected', 'waiting_unload'].includes(l.status))
    .reduce((acc, l) => acc + (l.totalSalesValue || 0), 0);

  // Ativos imobilizados
  const totalFixedAssetsValue = assetService.getAll()
    .filter(a => a.status === 'active')
    .reduce((acc, a) => acc + a.acquisitionValue, 0);

  // Haveres de sócios
  const shareholderReceivables = shareholderService.getAll()
    .filter(s => s.financial.currentBalance < 0)
    .reduce((acc, s) => acc + Math.abs(s.financial.currentBalance), 0);

  // Empréstimos concedidos
  const loansGranted = loansService.getAll()
    .filter(l => l.subType === 'loan_granted' && l.status !== 'paid' && l.issueDate <= endOfMonth)
    .reduce((acc, l) => acc + (l.originalValue - l.paidValue), 0);

  // Adiantamentos dados
  const advancesGiven = advanceService.getSummaries()
    .filter(s => s.netBalance > 0)
    .reduce((acc, s) => acc + s.netBalance, 0);

  const totalAssets = totalBankBalance + pendingSalesReceipts + merchandiseInTransitValue + 
                      loansGranted + shareholderReceivables + advancesGiven + totalFixedAssetsValue;

  // Contas a pagar
  const pendingPurchasePayments = payables
    .filter(r => r.subType === 'purchase_order' && r.status !== 'paid' && r.issueDate <= endOfMonth)
    .reduce((acc, r) => acc + (r.originalValue - r.paidValue - (r.discountValue || 0)), 0);

  const pendingFreightPayments = payables
    .filter(r => r.subType === 'freight' && r.status !== 'paid' && r.issueDate <= endOfMonth)
    .reduce((acc, r) => acc + (r.originalValue - r.paidValue - (r.discountValue || 0)), 0);

  const commissionsToPay = payables
    .filter(r => r.subType === 'commission' && r.status !== 'paid' && r.issueDate <= endOfMonth)
    .reduce((acc, r) => acc + (r.originalValue - r.paidValue - (r.discountValue || 0)), 0);

  // Empréstimos tomados
  const loansTaken = loansService.getAll()
    .filter(l => l.subType === 'loan_taken' && l.status !== 'paid' && l.issueDate <= endOfMonth)
    .reduce((acc, l) => acc + (l.originalValue - l.paidValue), 0);

  // Adiantamentos tomados
  const advancesTaken = advanceService.getSummaries()
    .filter(s => s.netBalance < 0)
    .reduce((acc, s) => acc + Math.abs(s.netBalance), 0);

  // Obrigações com sócios
  const shareholderPayables = shareholderService.getAll()
    .filter(s => s.financial.currentBalance > 0)
    .reduce((acc, s) => acc + s.financial.currentBalance, 0);

  const totalLiabilities = pendingPurchasePayments + pendingFreightPayments + loansTaken + 
                          commissionsToPay + shareholderPayables + advancesTaken;

  // ============================================================================
  // 4. RETORNA RELATÓRIO MENSAL
  // ============================================================================

  const netBalance = totalAssets - totalLiabilities;

  const report: any = {
    id: monthKey,
    monthKey,
    monthLabel,
    referenceDate: endOfMonth + 'T23:59:59Z',
    isClosed: false,
    isSnapshot: false,
    generatedAt: new Date().toISOString(),
    
    bankBalances,
    totalBankBalance,
    totalInitialBalance: initialBalances.reduce((acc, b) => acc + b.value, 0),
    totalInitialMonthBalance,
    initialMonthBalances,
    
    pendingSalesReceipts,
    merchandiseInTransitValue,
    loansGranted,
    advancesGiven,
    totalFixedAssetsValue,
    pendingAssetSalesReceipts: 0,
    shareholderReceivables,
    totalAssets,
    
    pendingPurchasePayments,
    pendingFreightPayments,
    loansTaken,
    commissionsToPay,
    advancesTaken,
    shareholderPayables,
    totalLiabilities,
    
    netBalance
  };

  return report as MonthlyReport;
};

/**
 * Lista todos os meses com histórico disponível
 * @returns Array de HistoryListItem ordenados por data (mais recentes primeiro)
 */
export const getMonthlyHistory = (): HistoryListItem[] => {
  const today = new Date();
  const monthsList: HistoryListItem[] = [];

  // Busca todos os meses até 12 meses atrás (configurável)
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    
    // Pula mês atual
    if (d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
      continue;
    }

    const report = calculateMonthlyReport(d.getFullYear(), d.getMonth() + 1);
    
    monthsList.push({
      monthKey: report.monthKey,
      label: report.monthLabel,
      report,
      hasSnapshot: false, // será atualizado por snapshotService
      finalBalance: (report as any).netBalance,
      transactionCount: 0 // será contado
    });
  }

  return monthsList.sort((a, b) => new Date(b.monthKey).getTime() - new Date(a.monthKey).getTime());
};

/**
 * Obtém relatório de um mês específico
 */
export const getMonthReport = (year: number, month: number): MonthlyReport | null => {
  try {
    return calculateMonthlyReport(year, month);
  } catch (err) {
    console.error(`❌ Erro ao calcular relatório para ${year}-${month}:`, err);
    return null;
  }
};

export const historyService = {
  calculateMonthlyReport,
  getMonthlyHistory,
  getMonthReport
};
