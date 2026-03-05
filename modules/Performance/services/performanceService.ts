import { supabase } from '../../../services/supabase';
import { PerformanceReport } from '../types';

async function getCompanyId(): Promise<string> {
  const { data, error } = await supabase
    .from('app_users')
    .select('company_id')
    .single();

  if (error || !data?.company_id) {
    throw new Error('Empresa não encontrada para o usuário logado.');
  }

  return data.company_id as string;
}

function emptyReport(): PerformanceReport {
  return {
    totalRevenue: 0,
    totalDebits: 0,
    balance: 0,
    avgProfitPerSc: 0,
    globalMarginPercent: 0,
    totalVolumeTon: 0,
    totalVolumeSc: 0,
    avgPurchasePrice: 0,
    avgSalesPrice: 0,
    avgFreightPriceTon: 0,
    avgTotalCostPerSc: 0,
    avgFreightCostSc: 0,
    avgPureOpCostSc: 0,
    avgOtherExpensesMonthly: 0,
    totalRedirectCosts: 0,
    monthlyHistory: [],
    priceTrendHistory: [],
    harvests: [],
    expenseBreakdown: [],
    topProfitOrders: [],
    topLossOrders: [],
    bestMonths: [],
    worstMonths: [],
  };
}

export const performanceService = {
  getReport: async (monthsBack: number | null): Promise<PerformanceReport> => {
    const companyId = await getCompanyId();

    const { data, error } = await supabase.rpc('rpc_performance_report', {
      p_company_id: companyId,
      p_months_back: monthsBack,
    });

    if (error) throw error;

    return {
      ...emptyReport(),
      ...(data ?? {}),
    } as PerformanceReport;
  },
};
