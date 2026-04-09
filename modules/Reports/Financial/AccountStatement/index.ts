
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

    // SQL-FIRST: Busca tudo calculado pelo banco (Saldo Anterior + Transações do Período)
    const { data: result, error } = await supabase.rpc('rpc_report_account_statement_v1', {
      p_account_id: accountId,
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) {
      console.error('Erro ao gerar extrato via RPC:', error);
      throw error;
    }

    const { opening_balance, transactions = [] } = result;
    
    // Processar o saldo acumulado (Running Balance) apenas para o período retornado
    let runningBalance = opening_balance;
    const rows = (transactions as any[]).map(t => {
      if (t.type === 'IN' || t.type === 'credit' || t.type === 'receipt') {
        runningBalance += t.value;
      } else {
        runningBalance -= t.value;
      }
      return { 
        ...t, 
        balanceAfter: runningBalance,
        credit: (t.type === 'IN' || t.type === 'credit' || t.type === 'receipt') ? t.value : null,
        debit: (t.type === 'OUT' || t.type === 'debit' || t.type === 'payment') ? t.value : null
      };
    });

    return {
      title: `Extrato Analítico`, 
      subtitle: `Período: ${dateStr(startDate)} a ${dateStr(endDate)}`,
      columns: [
        { header: 'Data', accessor: 'date', format: 'date' },
        { header: 'Histórico / Parceiro', accessor: 'description' },
        { header: 'Natureza', accessor: 'category' },
        { header: 'Crédito (+)', accessor: 'credit', format: 'currency', align: 'right' },
        { header: 'Débito (-)', accessor: 'debit', format: 'currency', align: 'right' },
        { header: 'Saldo Atualizado', accessor: 'balanceAfter', format: 'currency', align: 'right' }
      ],
      rows,
      summary: [
          { label: 'Saldo Anterior', value: opening_balance, format: 'currency' },
          { label: 'Total Entradas', value: rows.reduce((acc, r) => acc + (r.credit || 0), 0), format: 'currency' },
          { label: 'Total Saídas', value: rows.reduce((acc, r) => acc + (r.debit || 0), 0), format: 'currency' },
          { label: 'Saldo Final', value: runningBalance, format: 'currency' }
      ]
    };
  },
  Template: Template,
  PdfDocument: PdfDocument
};

const dateStr = (v: string) => new Date(v).toLocaleDateString('pt-BR');

export default accountStatementReport;
