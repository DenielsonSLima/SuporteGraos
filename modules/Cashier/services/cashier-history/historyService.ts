/**
 * 📈 historyService - Balanço Retroativo via RPC
 *
 * REFATORADO: Todos os cálculos agora rodam no PostgreSQL via
 * rpc_monthly_balance_sheet(). O frontend apenas consome o JSON retornado.
 *
 * Regra 5.4: "Não fazer cálculo crítico no front-end"
 * Regra 7.2: "Toda regra financeira deve estar no banco"
 *
 * Antes: ~20 .reduce() no browser + 9 imports de services
 * Agora: 1 RPC atômica que retorna tudo
 */

import { supabase } from '../../../../services/supabase';
import { authService } from '../../../../services/authService';

import type { MonthlyReport, HistoryListItem } from './types';

// ─── helpers ────────────────────────────────────────────────────────────────
const getCompanyId = (): string => {
  const user = authService.getCurrentUser();
  return user?.companyId ?? '';
};

/**
 * Converte o JSON da RPC em MonthlyReport compatível com o tipo existente
 */
const rpcToMonthlyReport = (rpc: any, year: number, month: number): MonthlyReport => {
  const monthKey = rpc.monthKey ?? `${year}-${String(month).padStart(2, '0')}`;
  const endOfMonth = rpc.referenceDate ?? new Date(year, month, 0).toISOString().split('T')[0];

  const bankBalances = (rpc.bankBalances ?? []).map((b: any) => ({
    id: b.id,
    bankName: b.bankName,
    owner: b.owner ?? undefined,
    balance: Number(b.balance) || 0,
  }));

  const totalBankBalance = Number(rpc.totalBankBalance) || 0;

  return {
    id: monthKey,
    monthKey,
    monthLabel: rpc.monthLabel ?? '',
    referenceDate: endOfMonth + 'T23:59:59Z',
    isClosed: false,
    isSnapshot: false,
    generatedAt: new Date().toISOString(),

    bankBalances,
    totalBankBalance,
    totalInitialBalance: Number(rpc.totalInitialBalance) || 0,
    totalInitialMonthBalance: Number(rpc.totalInitialMonthBalance) || bankBalances.reduce(
      (acc: number, b: any) => acc + (Number(b.startBalance) || 0), 0
    ),
    initialMonthBalances: bankBalances.map((b: any) => ({
      id: b.id,
      bankName: b.bankName,
      value: Number(b.startBalance) || 0,
    })),

    pendingSalesReceipts: Number(rpc.pendingSalesReceipts) || 0,
    merchandiseInTransitValue: Number(rpc.merchandiseInTransitValue) || 0,
    loansGranted: Number(rpc.loansGranted) || 0,
    advancesGiven: Number(rpc.advancesGiven) || 0,
    totalFixedAssetsValue: Number(rpc.totalFixedAssetsValue) || 0,
    pendingAssetSalesReceipts: 0,
    shareholderReceivables: Number(rpc.shareholderReceivables) || 0,
    totalAssets: Number(rpc.totalAssets) || 0,

    pendingPurchasePayments: Number(rpc.pendingPurchasePayments) || 0,
    pendingFreightPayments: Number(rpc.pendingFreightPayments) || 0,
    loansTaken: Number(rpc.loansTaken) || 0,
    commissionsToPay: Number(rpc.commissionsToPay) || 0,
    advancesTaken: Number(rpc.advancesTaken) || 0,
    shareholderPayables: Number(rpc.shareholderPayables) || 0,
    totalLiabilities: Number(rpc.totalLiabilities) || 0,

    netBalance: Number(rpc.netBalance) || 0,
  } as MonthlyReport;
};

// ─── RPC call ───────────────────────────────────────────────────────────────
const fetchBalanceSheet = async (
  companyId: string,
  year: number,
  month: number,
): Promise<any | null> => {
  const { data, error } = await supabase.rpc('rpc_monthly_balance_sheet', {
    p_company_id: companyId,
    p_year: year,
    p_month: month,
  });

  if (error) {
    console.error('[historyService] rpc_monthly_balance_sheet error:', error.message);
    return null;
  }

  return data;
};

// ─── public API ─────────────────────────────────────────────────────────────

/**
 * Calcula relatório para um mês específico (via RPC)
 */
export const calculateMonthlyReport = async (
  year: number,
  month: number,
): Promise<MonthlyReport> => {
  const companyId = getCompanyId();
  const rpc = await fetchBalanceSheet(companyId, year, month);

  if (!rpc) {
    // Retorna relatório vazio em caso de erro
    return rpcToMonthlyReport({}, year, month);
  }

  return rpcToMonthlyReport(rpc, year, month);
};

/**
 * Conta movimentações de um mês via SQL (count de financial_transactions + transfers)
 */
const getMonthlyMovementCount = async (
  companyId: string,
  year: number,
  month: number,
): Promise<number> => {
  const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
  const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];

  const [txRes, trRes] = await Promise.all([
    supabase
      .from('financial_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('transaction_date', startOfMonth)
      .lte('transaction_date', endOfMonth),
    supabase
      .from('transfers')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('transfer_date', startOfMonth)
      .lte('transfer_date', endOfMonth),
  ]);

  return (txRes.count ?? 0) + (trRes.count ?? 0);
};

/**
 * Lista todos os meses com histórico disponível (últimos 12 meses)
 * @returns Array de HistoryListItem ordenados por data (mais recentes primeiro)
 */
export const getMonthlyHistory = async (): Promise<HistoryListItem[]> => {
  const companyId = getCompanyId();
  if (!companyId) return [];

  const today = new Date();
  const months: { year: number; month: number }[] = [];

  for (let i = 1; i <= 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  // Busca contagens em paralelo
  const counts = await Promise.all(
    months.map(m => getMonthlyMovementCount(companyId, m.year, m.month)),
  );

  // Filtra meses com movimentação
  const activeMonths = months.filter((_, i) => counts[i] > 0);

  // Busca balanços em paralelo
  const reports = await Promise.all(
    activeMonths.map(m => calculateMonthlyReport(m.year, m.month)),
  );

  return reports
    .map((report, i) => ({
      monthKey: report.monthKey,
      label: report.monthLabel,
      report,
      hasSnapshot: false,
      finalBalance: report.netBalance,
      transactionCount: counts[months.indexOf(activeMonths[i])],
    }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
};

/**
 * Obtém relatório de um mês específico
 */
export const getMonthReport = async (
  year: number,
  month: number,
): Promise<MonthlyReport | null> => {
  try {
    return await calculateMonthlyReport(year, month);
  } catch {
    return null;
  }
};

export const historyService = {
  calculateMonthlyReport,
  getMonthlyHistory,
  getMonthReport,
};
