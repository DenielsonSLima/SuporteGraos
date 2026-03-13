
import { Landmark } from 'lucide-react';
import { ReportModule } from '../../types';
import { accountsService } from '../../../../services/accountsService';
import { initialBalanceService } from '../../../../services/initialBalanceService';
import { financialTransactionsService } from '../../../../services/financialTransactionsService';
import Template from './Template';
import PdfDocument from './PdfDocument';
import Filters from './Filters';

const accountStatementReport: ReportModule = {
  metadata: {
    id: 'financial_account_statement',
    title: 'Extrato Analítico Evolutivo',
    description: 'Movimentação detalhada por conta com cálculo de saldo anterior e acumulado.',
    category: 'financial',
    icon: Landmark,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    accountId: ''
  },
  FilterComponent: Filters,
  fetchData: async ({ startDate, endDate, accountId }) => {
    if (!accountId) {
        return { title: 'Extrato de Conta', subtitle: 'Selecione uma conta nos filtros', columns: [], rows: [] };
    }

    const accounts = await accountsService.getAll();
    const account = accounts.find(a => a.id === accountId);
    if (!account) return { title: 'Erro', subtitle: 'Conta não encontrada', columns: [], rows: [] };

    // 1. Get Initial Balance for this Account from Database
    const initialBalances = await initialBalanceService.getAll();
    const initialBalanceRecord = initialBalances.find(b => b.accountId === accountId);
    const startBalanceVal = initialBalanceRecord ? initialBalanceRecord.value : 0;
    const startBalanceDate = initialBalanceRecord ? initialBalanceRecord.date : '2000-01-01';

    // 2. Gather ALL canonical account transactions from ledger
    const accountTransactions = await financialTransactionsService.getByAccount(accountId);
    const allTransactions: any[] = accountTransactions.map((tx) => ({
      date: tx.transaction_date,
      description: tx.description || (tx.type === 'credit' ? 'Entrada' : 'Saída'),
      entity: '',
      type: tx.type,
      value: tx.amount,
      category: tx.type === 'credit' ? 'Crédito' : 'Débito'
    }));

    // Sort by Date
    allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 3. Calculate Balance up to Start Date (Retroativo)
    let runningBalance = startBalanceVal;
    allTransactions.forEach(t => {
        if (t.date < startDate && t.date >= startBalanceDate) {
            if (t.type === 'credit') runningBalance += t.value;
            else runningBalance -= t.value;
        }
    });

    const previousBalance = runningBalance;

    // 4. Process Range
    const rows = allTransactions
      .filter(t => t.date >= startDate && t.date <= endDate)
      .map(t => {
        if (t.type === 'credit') runningBalance += t.value;
        else runningBalance -= t.value;
        return { ...t, balanceAfter: runningBalance };
      });

    return {
      title: `Extrato Analítico: ${account?.account_name || 'Conta'}`,
      subtitle: `Movimentação de ${dateStr(startDate)} a ${dateStr(endDate)}`,
      columns: [
        { header: 'Data', accessor: 'date', format: 'date' },
        { header: 'Histórico / Parceiro', accessor: 'description' },
        { header: 'Natureza', accessor: 'category' },
        { header: 'Crédito (+)', accessor: 'credit', format: 'currency', align: 'right' },
        { header: 'Débito (-)', accessor: 'debit', format: 'currency', align: 'right' },
        { header: 'Saldo Atualizado', accessor: 'balanceAfter', format: 'currency', align: 'right' }
      ],
      rows: rows.map(r => ({
          ...r,
          credit: r.type === 'credit' ? r.value : null,
          debit: r.type === 'debit' ? r.value : null
      })),
      summary: [
          { label: 'Saldo Anterior', value: previousBalance, format: 'currency' },
          { label: 'Total Entradas', value: rows.filter(r => r.type === 'credit').reduce((a,b) => a+b.value, 0), format: 'currency' },
          { label: 'Total Saídas', value: rows.filter(r => r.type === 'debit').reduce((a,b) => a+b.value, 0), format: 'currency' },
          { label: 'Saldo Final', value: runningBalance, format: 'currency' }
      ]
    };
  },
  Template: Template,
  PdfDocument: PdfDocument
};

const dateStr = (v: string) => new Date(v).toLocaleDateString('pt-BR');

export default accountStatementReport;
