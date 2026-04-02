
import { BarChart3 } from 'lucide-react';
import { ReportModule } from '../../types';
import { supabase } from '../../../../services/supabase';
import UniversalReportTemplate from '../../templates/UniversalReportTemplate';
import DefaultFilters from '../../components/DefaultFilters';

const abcClientsReport: ReportModule = {
  metadata: {
    id: 'abc_clients',
    title: 'Curva ABC de Clientes',
    description: 'Ranking de faturamento por cliente com classificação de relevância (A, B ou C).',
    category: 'analytics',
    icon: BarChart3,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  },
  FilterComponent: DefaultFilters,
  fetchData: async ({ startDate, endDate }) => {
    const { data, error } = await supabase.rpc('rpc_get_abc_report', {
      p_group_by: 'customer',
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) throw error;

    const rows = (data || []).map((item: any) => ({
      rank: item.rank,
      name: item.name,
      total: item.total,
      percent: item.percent.toFixed(2) + '%',
      cumulative: item.cumulative.toFixed(2) + '%',
      class: item.class
    }));

    const grandTotal = rows.reduce((acc, curr) => acc + curr.total, 0);

    return {
      title: 'Relatório Curva ABC de Clientes',
      subtitle: `Análise de relevância baseada em faturamento de ${startDate} a ${endDate}`,
      columns: [
        { header: 'Pos.', accessor: 'rank', align: 'center', width: 'w-16' },
        { header: 'Cliente', accessor: 'name', align: 'left' },
        { header: 'Total (R$)', accessor: 'total', format: 'currency', align: 'right' },
        { header: '% Partic.', accessor: 'percent', align: 'right' },
        { header: '% Acum.', accessor: 'cumulative', align: 'right' },
        { header: 'Classe', accessor: 'class', align: 'center', width: 'w-20' }
      ],
      rows,
      summary: [{ label: 'Faturamento Total do Grupo', value: grandTotal, format: 'currency' }]
    };
  },
  Template: UniversalReportTemplate
};

export default abcClientsReport;
