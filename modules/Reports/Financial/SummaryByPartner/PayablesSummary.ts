
import { TrendingDown } from 'lucide-react';
import { ReportModule } from '../../types';
import { financialIntegrationService } from '../../../../services/financialIntegrationService';
import { advanceService } from '../../../Financial/Advances/services/advanceService';
import PartnerSummaryTemplate from './PartnerSummaryTemplate';
import Filters from './Filters';

const payablesSummaryPartner: ReportModule = {
  metadata: {
    id: 'payables_summary_partner',
    title: 'Resumo de Débitos por Parceiro',
    description: 'Consolida dívidas de compras, fretes e comissões agrupadas por fornecedor.',
    category: 'financial',
    icon: TrendingDown,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    partnerId: ''
  },
  FilterComponent: Filters,
  fetchData: ({ startDate, endDate, partnerId }) => {
    const payables = financialIntegrationService.getPayables()
      .filter(r => r.status !== 'paid');

    const advances = advanceService.getAllTransactions()
      .filter(t => t.type === 'taken' && t.status === 'active');

    const map: Record<string, any> = {};

    const add = (name: string, desc: string, val: number, date: string) => {
      if (startDate && date < startDate) return;
      if (endDate && date > endDate) return;
      if (partnerId && name !== partnerId) return;

      if (!map[name]) map[name] = { partnerName: name, total: 0, items: [] };
      map[name].items.push({ date, description: desc, value: val });
      map[name].total += val;
    };

    payables.forEach(p => add(p.entityName, p.description, p.originalValue - p.paidValue, p.dueDate));
    advances.forEach(a => add(a.partnerName, a.description, a.value, a.date));

    const groupedRows = Object.values(map).sort((a, b) => b.total - a.total);
    const grandTotal = groupedRows.reduce((acc, r) => acc + r.total, 0);

    return {
      title: 'Resumo Geral de Débitos e Obrigações',
      subtitle: `Saldos pendentes por fornecedor no período de ${startDate} a ${endDate}`,
      columns: [],
      rows: groupedRows,
      summary: [{ label: 'Total Geral a Pagar', value: grandTotal, format: 'currency' }]
    };
  },
  Template: PartnerSummaryTemplate
};

export default payablesSummaryPartner;
