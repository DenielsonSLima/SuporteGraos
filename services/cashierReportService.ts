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

    // Mapeamento direto de 1 para 1 com o SQL modular
    return {
      // Totais Principais
      totalBankBalance: report.totalBankBalance || 0,
      totalLiabilities: report.totalLiabilities || 0,
      totalAssets: report.totalAssets || 0,
      netBalance: report.netBalance || 0,
      
      pendingSalesReceipts: report.pendingSalesReceipts || 0,
      merchandiseInTransitValue: report.merchandiseInTransitValue || 0,
      pendingPurchasePayments: report.pendingPurchasePayments || 0,
      pendingFreightPayments: report.pendingFreightPayments || 0,

      // Detalhamento Bancário e Saldos Iniciais
      bankBalances: report.bankBalances || [],
      initialBalances: report.initialBalances || [],
      totalInitialBalance: report.totalInitialBalance || 0,
      totalInitialMonthBalance: report.totalInitialMonthBalance || 0,
      initialMonthBalances: report.initialMonthBalances || [],
      
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
