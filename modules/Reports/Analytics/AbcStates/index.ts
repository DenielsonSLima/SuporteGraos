
import { Map } from 'lucide-react';
import { ReportModule } from '../../types';
import { supabase } from '../../../../services/supabase';
import UniversalReportTemplate from '../../templates/UniversalReportTemplate';
import DefaultFilters from '../../components/DefaultFilters';

const abcStatesReport: ReportModule = {
  metadata: {
    id: 'abc_states',
    title: 'Curva ABC por Estado (UF)',
    description: 'Distribuição geográfica do faturamento por estado de destino.',
    category: 'analytics',
    icon: Map,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  },
  FilterComponent: DefaultFilters,
  fetchData: async ({ startDate, endDate }) => {
    const { data, error } = await supabase.rpc('rpc_get_abc_report', {
      p_group_by: 'state',
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) throw error;

    const rows = (data || []).map((item: any) => ({
      rank: item.rank,
      uf: item.name,
      total: item.total,
      percent: item.percent.toFixed(2) + '%',
      cumulative: item.cumulative.toFixed(2) + '%',
      class: item.class
    }));

    const grandTotal = rows.reduce((acc, curr) => acc + curr.total, 0);

    return {
      title: 'Curva ABC Geográfica (Destino)',
      subtitle: `Concentração de vendas por Estado de ${startDate} a ${endDate}`,
      columns: [
        { header: 'Pos.', accessor: 'rank', align: 'center', width: 'w-16' },
        { header: 'Estado (UF)', accessor: 'uf', align: 'center' },
        { header: 'Total (R$)', accessor: 'total', format: 'currency', align: 'right' },
        { header: '% Partic.', accessor: 'percent', align: 'right' },
        { header: '% Acum.', accessor: 'cumulative', align: 'right' },
        { header: 'Classe', accessor: 'class', align: 'center' }
      ],
      rows,
      summary: [{ label: 'Receita Total', value: grandTotal, format: 'currency' }]
    };
  },
  Template: UniversalReportTemplate
};

export default abcStatesReport;
