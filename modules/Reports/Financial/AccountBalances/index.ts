
import { Wallet } from 'lucide-react';
import { ReportModule } from '../../types';
import { accountsService } from '../../../../services/accountsService';
import { initialBalanceService } from '../../../../services/initialBalanceService';
import { financialTransactionsService } from '../../../../services/financialTransactionsService';
import Template from './Template';
import PdfDocument from './PdfDocument';
import Filters from './Filters';

const accountBalancesMonthlyReport: ReportModule = {
  metadata: {
    id: 'account_balances_monthly',
    title: 'Saldos Iniciais por Mês',
    description: 'Relatório de conferência de saldo de abertura de todas as contas para cada mês.',
    category: 'financial',
    icon: Wallet,
    needsDateFilter: false
  },
  initialFilters: {
    year: new Date().getFullYear().toString()
  },
  FilterComponent: Filters,
  fetchData: async ({ year }) => {
    const accounts = await accountsService.getAll();
    const initialBalances = await initialBalanceService.getAll();

    const selectedYear = parseInt(year);
    const transactionsByAccountEntries = await Promise.all(
      accounts.map(async (account) => {
        const transactions = await financialTransactionsService.getByAccount(account.id);
        return [account.id, transactions] as const;
      })
    );

    const transactionsByAccount = new Map<string, any[]>(transactionsByAccountEntries);

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    
    const rows = monthNames.map((monthName, monthIdx) => {
        const firstDayOfMonth = new Date(selectedYear, monthIdx, 1).toISOString().split('T')[0];
        
        const balancesByAccount: Record<string, number> = {};
        
        accounts.forEach(acc => {
            const init = initialBalances.find(b => b.accountId === acc.id);
            let running = init ? init.value : 0;
            const initDate = init ? init.date : '2000-01-01';
          const accountTransactions = transactionsByAccount.get(acc.id) || [];

            // Soma movimentações ANTERIORES ao primeiro dia deste mês
          accountTransactions.forEach((tx: any) => {
            const txDate = tx.transaction_date;
            if (txDate >= initDate && txDate < firstDayOfMonth) {
              if (tx.type === 'credit') running += tx.amount;
              else running -= tx.amount;
                }
            });
            balancesByAccount[acc.id] = running;
        });

        return {
            month: monthName,
            year: selectedYear,
            balances: balancesByAccount
        };
    });

    return {
      title: `Saldos Iniciais de Conta - Exercício ${selectedYear}`,
      subtitle: `Posição de abertura no 1º dia de cada mês`,
      columns: [
        { header: 'Mês Referência', accessor: 'month' },
        ...accounts.map(acc => ({ 
            header: acc.account_name, 
            accessor: `balance_${acc.id}`, 
            format: 'currency' as const, 
            align: 'right' as const 
        }))
      ],
      rows: rows.map(r => {
          const flatRow: any = { month: r.month };
          accounts.forEach(acc => {
              flatRow[`balance_${acc.id}`] = r.balances[acc.id];
          });
          return flatRow;
      }),
      summary: [{ label: 'Ano Base', value: selectedYear, format: 'number' }]
    };
  },
  Template: Template,
  PdfDocument: PdfDocument
};

export default accountBalancesMonthlyReport;
