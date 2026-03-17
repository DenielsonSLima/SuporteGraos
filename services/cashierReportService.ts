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
      // Fallback para RPC antiga se der erro no dashboard
      const { data: legacyData } = await supabase.rpc('rpc_cashier_report', { p_company_id: companyId });
      if (legacyData) return legacyData as CashierReportPayload;
      throw dashError;
    }

    const financial = dashData?.financial || {};

    // 2. Buscas Diretas para Detalhamento (O que o rpc_dashboard_data não retorna quebrado)
    const [
      loansResult,
      assetsResult,
      shareholdersResult,
      advancesResult,
      accountsResult,
      operationalDetailsResult,
      creditDetailsResult
    ] = await Promise.all([
      supabase.from('loans').select('remaining_amount, type').eq('company_id', companyId).neq('status', 'paid'),
      supabase.from('assets').select('acquisition_value').eq('company_id', companyId).eq('status', 'active'),
      supabase.from('shareholders').select('current_balance').eq('company_id', companyId),
      supabase.from('advances').select('remaining_amount, recipient_type').eq('company_id', companyId).not('status', 'in', '("settled", "cancelled", "canceled")'),
      supabase.from('accounts').select('id, account_name, balance').eq('company_id', companyId).eq('is_active', true),
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
      balance: acc.balance || 0
    }));

    // RPC Details (Fallbacks)
    const opDetails = operationalDetailsResult.data || {};
    const credDetails = creditDetailsResult.data || {};

    // 3. Cálculos Manuais para Garantir Precisão (Excluindo Transferências e Corrigindo Compras)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

    // Buscar transações do mês com join para origin_type
    const { data: txsRaw, error: txsError } = await supabase
      .from('financial_transactions')
      .select('amount, type, transfer_id, entry_id, financial_entries!entry_id(origin_type)')
      .eq('company_id', companyId)
      .gte('transaction_date', startOfMonthStr);

    if (txsError) {
      console.error('Erro ao buscar transações brutas para cálculo manual:', txsError);
    } else {
      console.log(`📊 [DEBUG CAIXA] Encontradas ${txsRaw?.length || 0} transações para cálculo manual.`);
    }

    const debits = (txsRaw || []).filter(t => 
      ['debit', 'OUT', 'out', 'DEBIT'].includes(t.type) && 
      !t.transfer_id // Exclui transferências (que possuem transfer_id)
    );

    const manualPurchasesPaid = debits
      .filter(t => (t.financial_entries as any)?.origin_type === 'purchase_order')
      .reduce((acc, t) => acc + Number(t.amount), 0);

    const manualFreightPaid = debits
      .filter(t => (t.financial_entries as any)?.origin_type === 'freight')
      .reduce((acc, t) => acc + Number(t.amount), 0);

    const manualExpensesPaid = debits
      .filter(t => (t.financial_entries as any)?.origin_type === 'expense')
      .reduce((acc, t) => acc + Number(t.amount), 0);

    const manualTotalPaid = debits.reduce((acc, t) => acc + Number(t.amount), 0);
    const creditsData = credDetails.creditsReceivedDetails || { sales_order: 0, loan: 0, others: 0 };
    const totalReceived = Number(creditsData.sales_order || 0) + Number(creditsData.loan || 0) + Number(creditsData.others || 0);

    // 4. Merge Final
    return {
      // Principais (Vêm do Dashboard)
      totalBankBalance: financial.totalBankBalance || 0,
      totalLiabilities: financial.totalLiabilities || 0,
      pendingSalesReceipts: financial.pendingSalesReceipts || 0,
      merchandiseInTransitValue: financial.merchandiseInTransitValue || 0,
      totalAssets: financial.totalAssets || 0,
      netWorth: financial.netWorth || 0,
      
      // Detalhamento (Calculado via tabelas)
      bankBalances,
      loansTaken,
      loansGranted,
      totalFixedAssetsValue,
      shareholderReceivables,
      shareholderPayables,
      advancesGiven,
      advancesTaken,
      
      // Detalhamento Operacional (Prioriza cálculos manuais se houver dados)
      ...opDetails,
      ...credDetails,

      // Sobrescreve com cálculos manuais para garantir que transferências foram excluídas
      monthPaidTotal: manualTotalPaid > 0 ? manualTotalPaid : (opDetails.monthPaidTotal || 0),
      monthPurchasesPaidTotal: manualPurchasesPaid, // Agora garantido pelo loop manual
      monthFreightPaidTotal: manualFreightPaid > 0 ? manualFreightPaid : (opDetails.monthFreightPaidTotal || 0),
      monthExpensesPaidTotal: manualExpensesPaid > 0 ? manualExpensesPaid : (opDetails.monthExpensesPaidTotal || 0),

      // Outros campos de paridade
      monthSoldTotal: opDetails.monthSoldTotal || 0,
      monthPurchasedTotal: opDetails.monthPurchasedTotal || 0,
      monthOperationalSpread: opDetails.monthOperationalSpread || 0,
      monthDirectDiff: totalReceived - (manualTotalPaid || opDetails.monthPaidTotal || 0), // GAP: Recebido - Pago

      // Fallback para campos não presentes no Dashboard mas no type
      ...dashData?.operational,
      expenseDistribution: {
        purchases: manualPurchasesPaid,
        freight: manualFreightPaid,
        expenses: manualExpensesPaid,
        others: (manualTotalPaid || 0) - (manualPurchasesPaid + manualFreightPaid + manualExpensesPaid)
      },
      revenueDistribution: credDetails.revenueDistribution || {}
    } as CashierReportPayload;

  }



};
