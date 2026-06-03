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
   *
   * ╔══════════════════════════════════════════════════════════╗
   * ║  REGRA DE OURO: FRONTEND NÃO CALCULA — APENAS EXIBE     ║
   * ║  Todo filtro, dedução e cálculo de totais ocorre         ║
   * ║  exclusivamente na RPC rpc_get_caixa_consolidated_report ║
   * ║  O frontend apenas mapeia os campos e os passa adiante.  ║
   * ╚══════════════════════════════════════════════════════════╝
   */
  fetchCurrentMonthReport: async (): Promise<CashierReportPayload> => {
    const companyId = await getCompanyId();

    const { data: report, error } = await supabase.rpc('rpc_get_caixa_consolidated_report', {
      p_company_id: companyId,
    });

    if (error) {
      console.error('Erro ao buscar rpc_get_caixa_consolidated_report:', error);
      throw error;
    }

    // PASSTHROUGH PURO — nenhum cálculo aqui
    return {
      // Saldos bancários
      totalBankBalance:         Number(report.totalBankBalance)         || 0,
      bankBalances:             report.bankBalances                     || [],

      // Saldos de abertura do período
      totalInitialBalance:      Number(report.totalInitialBalance)      || 0,
      totalInitialMonthBalance: Number(report.totalInitialMonthBalance) || 0,
      initialBalances:          report.initialBalances                  || [],
      initialMonthBalances:     report.initialMonthBalances             || [],

      // Ativos
      totalAssets:              Number(report.totalAssets)              || 0,
      pendingSalesReceipts:     Number(report.pendingSalesReceipts)     || 0,
      merchandiseInTransitValue: Number(report.merchandiseInTransitValue) || 0,
      totalFixedAssetsValue:    Number(report.totalFixedAssetsValue)    || 0,
      pendingAssetSalesReceipts: Number(report.pendingAssetSalesReceipts) || 0,
      shareholderCredits:       Number(report.shareholderReceivables)   || 0,
      loanCredits:              Number(report.loansGranted)             || 0,
      advancesCredits:          Number(report.advancesGiven)            || 0,

      // Passivos
      totalLiabilities:         Number(report.totalLiabilities)        || 0,
      pendingPurchasePayments:  Number(report.pendingPurchasePayments)  || 0,
      pendingFreightPayments:   Number(report.pendingFreightPayments)   || 0,
      commissionsToPay:         Number(report.commissionsToPay)        || 0,
      shareholderDebts:         Number(report.shareholderPayables)      || 0,
      loanDebts:                Number(report.loansTaken)              || 0,
      clientAdvances:           Number(report.advancesTaken)           || 0,

      // Patrimônio líquido
      netBalance:               Number(report.netBalance)              || 0,

      // Resumo operacional do mês
      monthPurchasedTotal:      Number(report.monthPurchasedTotal)     || 0,
      monthSoldTotal:           Number(report.monthSoldTotal)          || 0,
      monthPaidTotal:           Number(report.monthPaidTotal)          || 0,
      monthFreightPaidTotal:    Number(report.monthFreightPaidTotal)   || 0,
      monthExpensesPaidTotal:   Number(report.monthExpensesPaidTotal)  || 0,
      monthPurchasesPaidTotal:  Number(report.monthPurchasesPaidTotal) || 0,
      monthRefusedTotal:        Number(report.monthRefusedTotal)       || 0,
      monthDirectDiff:          Number(report.monthDirectDiff)         || 0,
      monthOperationalSpread:   Number(report.monthOperationalSpread)  || 0,
      monthFreightPendingTotal: Number(report.monthFreightPendingTotal) || 0,

      // Distribuições
      expenseDistribution:      report.expenseDistribution    || { purchases: 0, freight: 0, expenses: 0, others: 0 },
      revenueDistribution:      report.revenueDistribution    || { opening_receivables: 0, future_receivables: 0 },
      creditsReceivedDetails:   report.creditsReceivedDetails || { sales_order: 0, loan: 0, others: 0 },
    } as CashierReportPayload;
  },
};
