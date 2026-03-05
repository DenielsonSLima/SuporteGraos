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

    // Saldos iniciais do SQL
    const sqlInitialBalances: AccountInitialBalance[] = (sqlData?.initialBalances ?? []).map((ib: any) => ({
      id: ib.accountId,
      bankName: ib.accountName,
      value: Number(ib.value) || 0,
    }));

    // Para saldo de abertura do mês, por enquanto usa o saldo inicial
    const totalInitialMonthBalance = totalInitialBalance;
    const initialMonthBalances = sqlInitialBalances;

    const pendingSalesReceipts = Number(sqlData?.pendingSalesReceipts) || 0;
    const merchandiseInTransitValue = Number(sqlData?.merchandiseInTransitValue) || 0;
    const loansGranted = Number(sqlData?.loansGranted) || 0;
    const advancesGiven = Number(sqlData?.advancesGiven) || 0;
    const totalFixedAssetsValue = Number(sqlData?.totalFixedAssetsValue) || 0;
    const pendingAssetSalesReceipts = Number(sqlData?.pendingAssetSalesReceipts) || 0;
    const shareholderReceivables = Number(sqlData?.shareholderReceivables) || 0;

    const pendingPurchasePayments = Number(sqlData?.pendingPurchasePayments) || 0;
    const pendingFreightPayments = Number(sqlData?.pendingFreightPayments) || 0;
    const loansTaken = Number(sqlData?.loansTaken) || 0;
    const commissionsToPay = Number(sqlData?.commissionsToPay) || 0;
    const advancesTaken = Number(sqlData?.advancesTaken) || 0;
    const shareholderPayables = Number(sqlData?.shareholderPayables) || 0;

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
      loansGranted,
      advancesGiven,
      totalFixedAssetsValue,
      pendingAssetSalesReceipts,
      shareholderReceivables,
      totalAssets,
      pendingPurchasePayments,
      pendingFreightPayments,
      loansTaken,
      commissionsToPay,
      advancesTaken,
      shareholderPayables,
      totalLiabilities,
      netBalance,
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
};
