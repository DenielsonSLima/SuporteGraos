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
  fetchCurrentMonthReport: async (): Promise<CashierReportPayload> => {
    const companyId = await getCompanyId();

    // 1. Chamada para rpc_dashboard_data para obter os KPIs principais (Paridade com Início)
    const { data: dashData, error: dashError } = await supabase.rpc('rpc_dashboard_data', { 
      p_company_id: companyId 
    });

    if (dashError) {
      console.error('Erro ao buscar dados do Dashboard para o Caixa:', dashError);
    }

    // Chamada para rpc_cashier_report para obter saldos dinâmicos (ABERTURA DO MÊS)
    const { data: cashierData, error: cashierError } = await supabase.rpc('rpc_cashier_report', { 
      p_company_id: companyId 
    });

    if (cashierError) {
      console.error('Erro ao buscar rpc_cashier_report:', cashierError);
    }

    const financial = dashData?.financial || cashierData || {};

    // 2. Buscas Diretas para Detalhamento
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

    const [
      loansResult,
      assetsResult,
      shareholdersResult,
      advancesResult,
      accountsResult,
      initialBalancesResult,
      operationalDetailsResult,
      creditDetailsResult
    ] = await Promise.all([
      supabase.from('loans').select('remaining_amount, type').eq('company_id', companyId).neq('status', 'paid'),
      supabase.from('assets').select('acquisition_value').eq('company_id', companyId).eq('status', 'active'),
      supabase.from('shareholders').select('current_balance').eq('company_id', companyId),
      supabase.from('advances').select('remaining_amount, recipient_type').eq('company_id', companyId).not('status', 'in', '("settled", "cancelled", "canceled")'),
      supabase.from('accounts').select('id, account_name, owner, balance').eq('company_id', companyId).eq('is_active', true),
      // Buscar saldos iniciais (pega o mais recente para cada conta ou o último global)
      supabase.from('initial_balances')
        .select(`
          id, 
          account_id, 
          account_name, 
          value, 
          date,
          bank_accounts!account_id(owner)
        `)
        .eq('company_id', companyId)
        .order('date', { ascending: false }),
      supabase.rpc('rpc_get_cashier_operational_details', { p_company_id: companyId }),
      supabase.rpc('rpc_get_cashier_credit_details', { p_company_id: companyId })
    ]);

    // Cálculos dos Detalhes
    const loansTaken = loansResult.data?.filter(l => l.type === 'taken').reduce((acc, l) => acc + (l.remaining_amount || 0), 0) || 0;
    const loansGranted = loansResult.data?.filter(l => l.type === 'granted').reduce((acc, l) => acc + (l.remaining_amount || 0), 0) || 0;
    const totalFixedAssetsValue = assetsResult.data?.reduce((acc, a) => acc + (a.acquisition_value || 0), 0) || 0;
    const shareholderReceivables = shareholdersResult.data?.filter(s => s.current_balance < 0).reduce((acc, s) => acc + Math.abs(s.current_balance), 0) || 0;
    const shareholderPayables = shareholdersResult.data?.filter(s => s.current_balance > 0).reduce((acc, s) => acc + s.current_balance, 0) || 0;
    const advancesGiven = advancesResult.data?.filter(a => ['supplier', 'shareholder'].includes(a.recipient_type)).reduce((acc, a) => acc + (a.remaining_amount || 0), 0) || 0;
    const advancesTaken = advancesResult.data?.filter(a => a.recipient_type === 'client').reduce((acc, a) => acc + (a.remaining_amount || 0), 0) || 0;

    // Bancos Formatados
    const bankBalances = (accountsResult.data || []).map(acc => ({
      id: acc.id,
      bankName: acc.account_name,
      owner: acc.owner,
      balance: acc.balance || 0
    }));

    // Saldos Iniciais Formatados
    const initialBalances = (initialBalancesResult.data || []).map(ib => ({
      id: ib.id,
      accountId: ib.account_id,
      accountName: ib.account_name,
      value: ib.value || 0,
      date: ib.date,
      owner: (ib.accounts as any)?.owner
    }));

    // 3. Resultado Consolidado via RPCs (SQL-First)
    const opDetails = operationalDetailsResult.data || {};
    const credDetails = creditDetailsResult.data || {};
    
    const creditsData = credDetails.creditsReceivedDetails || { sales_order: 0, loan: 0, others: 0 };
    const totalReceived = Number(creditsData.sales_order || 0) + Number(creditsData.loan || 0) + Number(creditsData.others || 0);

    // 4. Merge Final
    return {
      // Principais (Vêm do Dashboard)
      totalBankBalance: financial.totalBankBalance || 0,
      totalLiabilities: financial.totalLiabilities || 0,
      pendingSalesReceipts: financial.pendingSalesReceipts || 0,
      merchandiseInTransitValue: financial.merchandiseInTransitValue || 0,
      pendingPurchasePayments: financial.pendingPurchasePayments || 0,
      pendingFreightPayments: financial.pendingFreightPayments || 0,
      totalAssets: financial.totalAssets || 0,
      netWorth: financial.netWorth || 0,
      
      // Detalhamento (Calculado via tabelas ou vindo da RPC)
      bankBalances: cashierData?.bankBalances || bankBalances,
      initialBalances: cashierData?.initialMonthBalances || initialBalances,
      totalInitialMonthBalance: cashierData?.totalInitialMonthBalance || financial.totalInitialBalance || 0,
      initialMonthBalances: cashierData?.initialMonthBalances || initialBalances,
      loansTaken,
      loansGranted,
      totalFixedAssetsValue,
      shareholderReceivables,
      shareholderPayables,
      advancesGiven,
      advancesTaken,
      
      // Detalhamento Operacional (Vindo das RPCs Precisas)
      ...opDetails,
      ...credDetails,
      ...(cashierData || {}),

      // Diferença direta (GAP): Recebido - Pago
      monthDirectDiff: totalReceived - (opDetails.monthPaidTotal || 0),

      // Distribuição de Despesas (Breakdown vindo da RPC)
      expenseDistribution: cashierData?.expenseDistribution || {
        purchases: opDetails.monthPurchasesPaidTotal || 0,
        freight: opDetails.monthFreightPaidTotal || 0,
        expenses: opDetails.monthExpensesPaidTotal || 0,
        others: (opDetails.monthPaidTotal || 0) - (
          (opDetails.monthPurchasesPaidTotal || 0) + 
          (opDetails.monthFreightPaidTotal || 0) + 
          (opDetails.monthExpensesPaidTotal || 0)
        )
      },
      revenueDistribution: cashierData?.revenueDistribution || credDetails.revenueDistribution || {}
    } as CashierReportPayload;

  }



};
