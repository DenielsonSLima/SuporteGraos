import { FinancialRecord } from '../../../modules/Financial/types';
import { creditMathService } from './creditMathService';

export interface CreditSummary {
  activeCount: number;
  totalInvested: number;
  totalEarnings: number;
  averageRate: number;
}

export const creditReportsService = {
  getCurrentMonthKey(referenceDate = new Date()): string {
    return `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, '0')}`;
  },

  getCurrentMonthCredits(credits: FinancialRecord[], referenceDate = new Date()): FinancialRecord[] {
    return creditMathService.getCreditsByMonth(credits, this.getCurrentMonthKey(referenceDate));
  },

  getOtherMonthsCredits(credits: FinancialRecord[], referenceDate = new Date()): FinancialRecord[] {
    const currentMonth = this.getCurrentMonthKey(referenceDate);
    return credits.filter(credit => {
      const date = new Date(credit.issueDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return monthKey !== currentMonth;
    });
  },

  getSummary(credits: FinancialRecord[]): CreditSummary {
    const activeCredits = credits.filter(c => c.status === 'pending' || c.status === 'partial');
    const totalInvested = activeCredits.reduce((sum, c) => sum + (c.originalValue || 0), 0);

    const totalEarnings = activeCredits.reduce((sum, c) => {
      const monthsElapsed = Math.max(1, Math.floor(
        (new Date().getTime() - new Date(c.issueDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
      ));
      const earnings = creditMathService.calculateEarnings(c.originalValue || 0, c.paidValue || 0, monthsElapsed);
      return sum + earnings;
    }, 0);

    return {
      activeCount: activeCredits.length,
      totalInvested,
      totalEarnings,
      averageRate: activeCredits.length > 0
        ? activeCredits.reduce((sum, c) => sum + (c.paidValue || 0), 0) / activeCredits.length
        : 0,
    };
  },
};
