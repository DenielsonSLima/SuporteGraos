
import { Wallet } from 'lucide-react';
import { ReportModule } from '../../types';
import { financialService } from '../../../../services/financialService';
import { purchaseService } from '../../../../services/purchaseService';
import { salesService } from '../../../../services/salesService';
import { loadingService } from '../../../../services/loadingService';
import { financialActionService } from '../../../../services/financialActionService';
import Template from './Template';
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
  fetchData: ({ year }) => {
    const selectedYear = parseInt(year);
    const accounts = financialService.getBankAccounts();
    const initialBalances = financialService.getInitialBalances();
    
    // Coleta todas as transações do sistema
    const allTxs: any[] = [];
    purchaseService.getAll().forEach(p => p.transactions.forEach(t => allTxs.push({ ...t, type: 'debit' })));
    salesService.getAll().forEach(s => s.transactions.forEach(t => allTxs.push({ ...t, type: 'credit' })));
    loadingService.getAll().forEach(l => (l.transactions || []).forEach(t => allTxs.push({ ...t, type: 'debit' })));
    financialActionService.getStandaloneRecords().forEach(r => {
        if (r.paidValue > 0) {
            const isCredit = ['sales_order', 'loan_granted', 'receipt'].includes(r.subType || '');
            const acc = accounts.find(a => a.bankName === r.bankAccount || a.id === r.bankAccount);
            if (acc) {
                allTxs.push({ date: r.issueDate, value: r.paidValue, accountId: acc.id, type: isCredit ? 'credit' : 'debit' });
            }
        }
    });
    financialActionService.getTransfers().forEach(t => {
        const origin = accounts.find(a => a.bankName === t.originAccount);
        const dest = accounts.find(a => a.bankName === t.destinationAccount);
        if (origin) allTxs.push({ date: t.date, value: t.value, accountId: origin.id, type: 'debit' });
        if (dest) allTxs.push({ date: t.date, value: t.value, accountId: dest.id, type: 'credit' });
    });

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    
    const rows = monthNames.map((monthName, monthIdx) => {
        const firstDayOfMonth = new Date(selectedYear, monthIdx, 1).toISOString().split('T')[0];
        
        const balancesByAccount: Record<string, number> = {};
        
        accounts.forEach(acc => {
            const init = initialBalances.find(b => b.accountId === acc.id);
            let running = init ? init.value : 0;
            const initDate = init ? init.date : '2000-01-01';

            // Soma movimentações ANTERIORES ao primeiro dia deste mês
            allTxs.forEach(tx => {
                if (tx.accountId === acc.id && tx.date >= initDate && tx.date < firstDayOfMonth) {
                    if (tx.type === 'credit') running += tx.value;
                    else running -= tx.value;
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
            header: acc.bankName, 
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
  Template: Template
};

export default accountBalancesMonthlyReport;
