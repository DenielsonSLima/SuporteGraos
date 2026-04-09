import { TrendingUp } from 'lucide-react';
import { ReportModule } from '../../types';
import { supabase } from '../../../../services/supabase';
import Template from './Template';
import PdfDocument from './PdfDocument';
import Filters from './Filters';

const netWorthEvolutionReport: ReportModule = {
  metadata: {
    id: 'net_worth_evolution',
    title: 'Dinamica do Patrimônio Líquido',
    description: 'Evolução cronológica do saldo consolidado, integrando transações realizadas e títulos pendentes.',
    category: 'financial',
    icon: TrendingUp,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()).toISOString().split('T')[0],
  },
  FilterComponent: Filters,
  fetchData: async ({ startDate, endDate }) => {
    const { data, error } = await supabase.rpc('rpc_report_net_worth_evolution', {
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) {
      console.error('Erro ao buscar Evolução Patrimonial:', error);
      throw error;
    }

    const { initialBalance, rows = [] } = data;

    // Processamento da evolução do saldo no frontend para garantir precisão e facilidade de manipulação
    let currentBalance = initialBalance;
    const processedRows = rows.map((row: any) => {
      const type = row.type;
      const value = row.value;
      
      if (type === 'IN') {
        currentBalance += value;
      } else {
        currentBalance -= value;
      }

      return {
        ...row,
        balanceAfter: currentBalance
      };
    });

    return {
      title: 'Dinâmica do Patrimônio Líquido',
      subtitle: `Período: ${startDate} a ${endDate}`,
      columns: [
        { header: 'Data', accessor: 'date', format: 'date' },
        { header: 'Histórico', accessor: 'description' },
        { header: 'Tipo', accessor: 'type' },
        { header: 'Status', accessor: 'status' },
        { header: 'Valor', accessor: 'value', format: 'currency' },
        { header: 'Saldo Evolutivo', accessor: 'balanceAfter', format: 'currency' }
      ],
      rows: processedRows,
      summary: [
        { label: 'Saldo Inicial', value: initialBalance, format: 'currency' },
        { label: 'Saldo Final Projetado', value: currentBalance, format: 'currency' },
        { label: 'Variação no Período', value: currentBalance - initialBalance, format: 'currency' }
      ]
    };
  },
  Template: Template,
  PdfDocument: PdfDocument
};

export default netWorthEvolutionReport;
