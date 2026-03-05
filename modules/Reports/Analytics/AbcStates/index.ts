
import { Map } from 'lucide-react';
import { ReportModule } from '../../types';
import { financialIntegrationService } from '../../../../services/financialIntegrationService';
import { partnerService } from '../../../../services/partnerService';
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
    const receivables = financialIntegrationService
      .getReceivables()
      .filter((r) => r.subType === 'sales_order')
      .filter((r) => {
        const referenceDate = r.issueDate || r.dueDate;
        return (!startDate || referenceDate >= startDate) && (!endDate || referenceDate <= endDate);
      });

    const partners = partnerService.getAll();
    const stateByCustomer: Record<string, string> = {};
    partners.forEach((partner) => {
      stateByCustomer[partner.name] = partner.address?.stateUf || 'N/D';
    });

    const map: Record<string, number> = {};
    receivables.forEach((record) => {
      const uf = stateByCustomer[record.entityName] || 'N/D';
      map[uf] = (map[uf] || 0) + record.originalValue;
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
