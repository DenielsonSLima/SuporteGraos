import { supabase } from './supabase';

export interface CashierReportPayload {
  bankBalances?: any[];
  totalBankBalance?: number;
  totalInitialBalance?: number;
  initialBalances?: any[];
  pendingSalesReceipts?: number;
  merchandiseInTransitValue?: number;
  loansGranted?: number;
  advancesGiven?: number;
  totalFixedAssetsValue?: number;
  pendingAssetSalesReceipts?: number;
  shareholderReceivables?: number;
  pendingPurchasePayments?: number;
  pendingFreightPayments?: number;
  loansTaken?: number;
  commissionsToPay?: number;
  advancesTaken?: number;
  shareholderPayables?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  netBalance?: number;
  totalInitialMonthBalance?: number;
  initialMonthBalances?: any[];
  // NOVOS CAMPOS
  monthPurchasedTotal?: number;
  monthSoldTotal?: number;
  monthPurchasesPaidTotal?: number;
  monthFreightPaidTotal?: number;
  monthRefusedTotal?: number;
  monthExpensesPaidTotal?: number;
  monthPaidTotal?: number;
  monthDirectDiff?: number;
  monthOperationalSpread?: number;
  monthFreightPendingTotal?: number;
  creditsReceivedDetails?: any;
  expenseDistribution?: any;
  revenueDistribution?: any;
}

const getCompanyId = async (): Promise<string> => {
  const { authService } = await import('./authService');
  const user = authService.getCurrentUser();
  const companyId = user?.companyId;

  if (!companyId) {
    throw new Error('Empresa não encontrada');
  }

  return companyId;
};

export const cashierReportService = {
  /**
   * Busca o relatório consolidado do mês atual.
   * IMPORTANTE: O cálculo é feito INTEGRALMENTE no banco (SQL/RPC).
   * O frontend apenas recebe e exibe (Modo TV).
   */
  fetchCurrentMonthReport: async (): Promise<CashierReportPayload> => {
    const companyId = await getCompanyId();

    // Chamada para a nova RPC Mestre Consolidadora (Ultra-Modular)
    const { data: report, error } = await supabase.rpc('rpc_get_caixa_consolidated_report', { 
      p_company_id: companyId 
    });

    if (error) {
      console.error('Erro ao buscar rpc_get_caixa_consolidated_report:', error);
      throw error;
    }

    // ═══════════════════════════════════════════════════════════════════
    // REGRA DE OURO: CONTAS VIRTUAIS/INTERNAS NUNCA DEVEM IR PARA O CAIXA
    // ═══════════════════════════════════════════════════════════════════
    const VIRTUAL_ACCOUNT_ID = '97e8bd30-3ba1-4658-a51e-5df6ce184845';
    
    // Identifica se uma conta é virtual/uso interno (pelo ID fixo ou tags no nome/titular)
    const isVirtualAccount = (acc: any): boolean => {
      const accId = acc.id || acc.accountId;
      const accName = (acc.bankName || acc.accountName || '').toLowerCase();
      const accOwner = (acc.owner || '').toLowerCase();
      
      return accId === VIRTUAL_ACCOUNT_ID || 
             accName.includes('virtual') || 
             accOwner.includes('virtual');
    };

    const rawBankBalances = report.bankBalances || [];
    const rawInitialMonthBalances = report.initialMonthBalances || [];
    const rawInitialBalances = report.initialBalances || [];

    // Filtra as contas virtuais para ocultá-las da listagem de bancos e abertura
    const bankBalances = rawBankBalances.filter((acc: any) => !isVirtualAccount(acc));
    const initialMonthBalances = rawInitialMonthBalances.filter((acc: any) => !isVirtualAccount(acc));
    const initialBalances = rawInitialBalances.filter((acc: any) => !isVirtualAccount(acc));

    // Soma os saldos virtuais para deduzir dos totais consolidados e evitar divergências matemáticas visuais
    const virtualBankBalanceSum = rawBankBalances
      .filter(isVirtualAccount)
      .reduce((sum: number, acc: any) => sum + (Number(acc.balance) || 0), 0);

    const virtualInitialMonthSum = rawInitialMonthBalances
      .filter(isVirtualAccount)
      .reduce((sum: number, acc: any) => sum + (Number(acc.value || acc.balance) || 0), 0);

    const virtualInitialSum = rawInitialBalances
      .filter(isVirtualAccount)
      .reduce((sum: number, acc: any) => sum + (Number(acc.value || acc.balance) || 0), 0);

    // Ajusta os totais e recalcula o patrimônio líquido real (netBalance) sem as contas de uso interno
    const totalBankBalance = Math.max(0, (Number(report.totalBankBalance) || 0) - virtualBankBalanceSum);
    const totalInitialMonthBalance = Math.max(0, (Number(report.totalInitialMonthBalance) || 0) - virtualInitialMonthSum);
    const totalInitialBalance = Math.max(0, (Number(report.totalInitialBalance) || 0) - virtualInitialSum);
    
    const totalAssets = Math.max(0, (Number(report.totalAssets) || 0) - virtualBankBalanceSum);
    const totalLiabilities = Number(report.totalLiabilities) || 0;
    const netBalance = totalAssets - totalLiabilities;

    return {
      // Totais Principais
      totalBankBalance,
      totalLiabilities,
      totalAssets,
      netBalance,
      
      pendingSalesReceipts: report.pendingSalesReceipts || 0,
      merchandiseInTransitValue: report.merchandiseInTransitValue || 0,
      pendingPurchasePayments: report.pendingPurchasePayments || 0,
      pendingFreightPayments: report.pendingFreightPayments || 0,

      // Detalhamento Bancário e Saldos Iniciais (Filtrados)
      bankBalances,
      initialBalances,
      totalInitialBalance,
      totalInitialMonthBalance,
      initialMonthBalances,
      
      // Ativos e Passivos (Calculados individualmente no SQL)
      loanDebts: report.loansTaken || 0,
      loanCredits: report.loansGranted || 0,
      totalFixedAssetsValue: report.totalFixedAssetsValue || 0,
      shareholderCredits: report.shareholderReceivables || 0,
      shareholderDebts: report.shareholderPayables || 0,
      advancesCredits: report.advancesGiven || 0,
      clientAdvances: report.advancesTaken || 0,
      pendingAssetSalesReceipts: report.pendingAssetSalesReceipts || 0,
      commissionsToPay: report.commissionsToPay || 0,
      
      // Resumo Operacional do Mês
      monthPurchasedTotal: report.monthPurchasedTotal || 0,
      monthSoldTotal: report.monthSoldTotal || 0,
      monthPaidTotal: report.monthPaidTotal || 0,
      monthFreightPaidTotal: report.monthFreightPaidTotal || 0,
      monthExpensesPaidTotal: report.monthExpensesPaidTotal || 0,
      monthPurchasesPaidTotal: report.monthPurchasesPaidTotal || 0,
      monthRefusedTotal: report.monthRefusedTotal || 0,
      monthDirectDiff: report.monthDirectDiff || 0,
      monthOperationalSpread: report.monthOperationalSpread || 0,
      monthFreightPendingTotal: report.monthFreightPendingTotal || 0,
      
      // Distribuições e Detalhes
      expenseDistribution: report.expenseDistribution || { purchases: 0, freight: 0, expenses: 0, others: 0 },
      revenueDistribution: report.revenueDistribution || { opening_receivables: 0, future_receivables: 0 },
      creditsReceivedDetails: report.creditsReceivedDetails || { sales_order: 0, loan: 0, others: 0 },
    } as CashierReportPayload;
  }
};
