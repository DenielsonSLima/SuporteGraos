
import { Map } from 'lucide-react';
import { ReportModule } from '../../types';
import { salesService } from '../../../../services/salesService';
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
  fetchData: ({ startDate, endDate }) => {
    const sales = salesService.getAll().filter(s => s.status !== 'canceled');
    const filteredSales = sales.filter(s => (!startDate || s.date >= startDate) && (!endDate || s.date <= endDate));

    const map: Record<string, number> = {};
    filteredSales.forEach(s => {
      const uf = s.customerState || 'N/D';
      map[uf] = (map[uf] || 0) + s.totalValue;
    });

    const sorted = Object.entries(map)
      .map(([uf, total]) => ({ uf, total }))
      .sort((a, b) => b.total - a.total);

    const grandTotal = sorted.reduce((acc, curr) => acc + curr.total, 0);
    let cumulative = 0;

    const rows = sorted.map((item, index) => {
      cumulative += item.total;
      const percent = grandTotal > 0 ? (item.total / grandTotal) * 100 : 0;
      const cumulativePercent = grandTotal > 0 ? (cumulative / grandTotal) * 100 : 0;
      
      let classification = 'C';
      if (cumulativePercent <= 80) classification = 'A';
      else if (cumulativePercent <= 95) classification = 'B';

      return {
        rank: index + 1,
        uf: item.uf,
        total: item.total,
        percent: percent.toFixed(2) + '%',
        cumulative: cumulativePercent.toFixed(2) + '%',
        class: classification
      };
    });

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
