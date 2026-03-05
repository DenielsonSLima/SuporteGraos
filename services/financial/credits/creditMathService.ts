import { FinancialRecord } from '../../../modules/Financial/types';

export const creditMathService = {
  calculateEarnings(principal: number, interestRate: number, monthsElapsed: number): number {
    return principal * (interestRate / 100) * monthsElapsed;
  },

  calculateTotalValue(principal: number, interestRate: number, monthsElapsed: number): number {
    const earnings = this.calculateEarnings(principal, interestRate, monthsElapsed);
    return principal + earnings;
  },

  groupByMonth(credits: FinancialRecord[]): Record<string, FinancialRecord[]> {
    const grouped: Record<string, FinancialRecord[]> = {};

    credits.forEach(credit => {
      const date = new Date(credit.issueDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }

      grouped[monthKey].push(credit);
    });

    return grouped;
  },

  getCreditsByMonth(credits: FinancialRecord[], monthKey: string): FinancialRecord[] {
    return credits.filter(credit => {
      const date = new Date(credit.issueDate);
      const creditMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return creditMonthKey === monthKey;
    });
  },
};
