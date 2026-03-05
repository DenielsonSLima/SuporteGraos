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
}

const getCompanyId = async (): Promise<string> => {
  const { data, error } = await supabase
    .from('app_users')
    .select('company_id')
    .single();

  if (error || !data?.company_id) {
    throw new Error('Empresa não encontrada');
  }

  return data.company_id as string;
};

export const cashierReportService = {
  fetchCurrentMonthReport: async (): Promise<CashierReportPayload> => {
    const companyId = await getCompanyId();

    const { data, error } = await supabase.rpc('rpc_cashier_report', {
      p_company_id: companyId,
    });

    if (error) {
      throw error;
    }

    return (data || {}) as CashierReportPayload;
  }
};
