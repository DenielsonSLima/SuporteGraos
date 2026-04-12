/**
 * cashierService.ts
 *
 * REFATORADO: Saldos bancários vêm do SQL (accounts.balance = verdade absoluta).
 * O frontend NÃO recalcula saldos — apenas exibe o que o banco de dados retorna.
 *
 * Fluxo:
 *   1. rpc_cashier_report(company_id) → saldos bancários + saldos iniciais (SQL)
 *   2. Dados complementares (receivables, payables, loadings, etc.) vêm dos
 *      services de persistência enquanto não são migrados para SQL.
 */

import { CashierReport, BankBalance, AccountInitialBalance } from '../types';
import { cashierReportService } from '../../../services/cashierReportService';
import { historyService, snapshotService } from './cashier-history';
import { supabase } from '../../../services/supabase';

export const cashierService = {
  /**
   * Relatório do mês atual — ASYNC.
   * Saldos bancários: SQL (accounts.balance) — verdade absoluta.
   * Ativos/Passivos complementares: persistence (enquanto não migrados).
   */
  getCurrentMonthReport: async (): Promise<CashierReport> => {
    // ═══════════════════════════════════════════════════════════════════
    // 1. DADOS DO SQL (fonte da verdade para saldos e contas)
    // ═══════════════════════════════════════════════════════════════════
    const sqlData = await cashierReportService.fetchCurrentMonthReport();

    // Saldos bancários direto do SQL (accounts.balance = verdade)
    const bankBalances: BankBalance[] = (sqlData?.bankBalances ?? []).map((b: any) => ({
      id: b.id,
      bankName: b.bankName,
      owner: b.owner || undefined,
      balance: Number(b.balance) || 0,
    }));

    const totalBankBalance = Number(sqlData?.totalBankBalance) || 0;
    const totalInitialBalance = Number(sqlData?.totalInitialBalance) || 0;
    const totalInitialMonthBalance = Number(sqlData?.totalInitialMonthBalance) || totalInitialBalance;
    
    // Saldos iniciais do SQL
    const initialMonthBalances: AccountInitialBalance[] = (sqlData?.initialMonthBalances ?? sqlData?.initialBalances ?? []).map((ib: any) => ({
      id: ib.accountId || ib.id,
      bankName: ib.accountName || ib.bankName,
      owner: ib.owner || undefined,
      value: Number(ib.value) || 0,
    }));

    const pendingSalesReceipts = Number(sqlData?.pendingSalesReceipts) || 0;
    const merchandiseInTransitValue = Number(sqlData?.merchandiseInTransitValue) || 0;
    const loanCredits = Number(sqlData?.loanCredits) || 0;
    const advancesCredits = Number(sqlData?.advancesCredits) || 0;
    const totalFixedAssetsValue = Number(sqlData?.totalFixedAssetsValue) || 0;
    const assetSalesReceivable = Number(sqlData?.assetSalesReceivable) || 0;
    const shareholderCredits = Number(sqlData?.shareholderCredits) || 0;

    const pendingPurchasePayments = Number(sqlData?.pendingPurchasePayments) || 0;
    const pendingFreightPayments = Number(sqlData?.pendingFreightPayments) || 0;
    const loanDebts = Number(sqlData?.loanDebts) || 0;
    const commissionsToPay = Number(sqlData?.commissionsToPay) || 0;
    const clientAdvances = Number(sqlData?.clientAdvances) || 0;
    const shareholderDebts = Number(sqlData?.shareholderDebts) || 0;

    const totalAssets = Number(sqlData?.totalAssets) || 0;
    const totalLiabilities = Number(sqlData?.totalLiabilities) || 0;
    const netBalance = Number(sqlData?.netBalance) || (totalAssets - totalLiabilities);

    return {
      id: 'current',
      referenceDate: new Date().toISOString(),
      isClosed: false,
      bankBalances,
      totalBankBalance,
      totalInitialBalance,
      totalInitialMonthBalance,
      initialMonthBalances,
      pendingSalesReceipts,
      merchandiseInTransitValue,
      loanCredits,
      advancesCredits,
      totalFixedAssetsValue,
      assetSalesReceivable,
      shareholderCredits,
      totalAssets,
      pendingPurchasePayments,
      pendingFreightPayments,
      loanDebts,
      commissionsToPay,
      clientAdvances,
      shareholderDebts,
      totalLiabilities,
      netBalance,
      // NOVOS CAMPOS
      monthPurchasedTotal: Number(sqlData?.monthPurchasedTotal) || 0,
      monthSoldTotal: Number(sqlData?.monthSoldTotal) || 0,
      monthPurchasesPaidTotal: Number(sqlData?.monthPurchasesPaidTotal) || 0,
      monthFreightPaidTotal: Number(sqlData?.monthFreightPaidTotal) || 0,
      monthRefusedTotal: Number(sqlData?.monthRefusedTotal) || 0,
      monthExpensesPaidTotal: Number(sqlData?.monthExpensesPaidTotal) || 0,
      monthPaidTotal: Number(sqlData?.monthPaidTotal) || 0,
      monthDirectDiff: Number(sqlData?.monthDirectDiff) || 0,
      monthOperationalSpread: Number(sqlData?.monthOperationalSpread) || 0,
      creditsReceivedDetails: sqlData?.creditsReceivedDetails || { sales_order: 0, loan: 0, others: 0 },
      expenseDistribution: sqlData?.expenseDistribution || { purchases: 0, freight: 0, expenses: 0, others: 0 },
      revenueDistribution: sqlData?.revenueDistribution || { opening_receivables: 0, future_receivables: 0 },
    };
  },

  getHistory: async (): Promise<CashierReport[]> => {
    const monthlyHistoryItems = await historyService.getMonthlyHistory();
    const reports = monthlyHistoryItems.map(item => item.report);

    const snapshots = snapshotService.getAll();
    reports.forEach(report => {
      const snapshot = snapshots.find(s => s.monthKey === report.monthKey);
      if (snapshot) {
        report.isSnapshot = true;
        report.snapshotClosedDate = snapshot.closedDate;
        report.snapshotClosedBy = snapshot.closedBy;
        Object.assign(report, snapshot.report);
      }
    });

    return reports as unknown as CashierReport[];
  },

  // REALTIME — Singleton channel (otimiza WebSocket)
  subscribeRealtime: (() => {
    const listeners = new Set<() => void>();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    return (onAnyChange: () => void): (() => void) => {
      listeners.add(onAnyChange);

      if (!channel) {
        const invalidate = () => {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            listeners.forEach((fn) => fn());
          }, 500);
        };

        channel = supabase
          .channel('realtime:cashier_singleton')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_entries' }, invalidate)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_transactions' }, invalidate)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, invalidate)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_loadings' }, invalidate)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_purchase_orders' }, invalidate)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'ops_sales_orders' }, invalidate)
          .subscribe();
      }

      return () => {
        listeners.delete(onAnyChange);
        if (listeners.size === 0 && channel) {
          supabase.removeChannel(channel);
          channel = null;
          if (debounceTimer) clearTimeout(debounceTimer);
        }
      };
    };
  })(),
};
