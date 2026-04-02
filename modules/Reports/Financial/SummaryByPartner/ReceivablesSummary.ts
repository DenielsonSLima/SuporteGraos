
import { TrendingUp } from 'lucide-react';
import { ReportModule } from '../../types';
import { financialIntegrationService } from '../../../../services/financialIntegrationService';
import { advanceService } from '../../../Financial/Advances/services/advanceService';
import PartnerSummaryTemplate from './PartnerSummaryTemplate';
import Filters from './Filters';

const receivablesSummaryPartner: ReportModule = {
  metadata: {
    id: 'receivables_summary_partner',
    title: 'Resumo de Recebíveis por Parceiro',
    description: 'Visão consolidada de saldos de vendas e adiantamentos a receber de cada cliente.',
    category: 'financial',
    icon: TrendingUp,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    partnerId: ''
  },
  FilterComponent: Filters,
  fetchData: async ({ startDate, endDate, partnerId }) => {
    // 1. Recebíveis de Vendas
    const receivables = (await financialIntegrationService.getReceivables())
      .filter(r => r.status !== 'paid' && r.subType === 'sales_order');

    // 2. Adiantamentos Concedidos (Ativos)
    const advances = advanceService.getAllTransactions()
      .filter(t => t.type === 'given' && t.status === 'active');

    // Combine e agrupe por parceiro
    const map: Record<string, any> = {};

    const add = (name: string, desc: string, val: number, date: string) => {
      if (startDate && date < startDate) return;
      if (endDate && date > endDate) return;
      if (partnerId && name !== partnerId) return;

      if (!map[name]) map[name] = { partnerName: name, total: 0, items: [] };
      map[name].items.push({ date, description: desc, value: val });
      map[name].total += val;
    };

    receivables.forEach(r => add(r.entityName, r.description, r.originalValue - r.paidValue, r.dueDate));
    advances.forEach(a => add(a.partnerName, a.description, a.value, a.date));

    const groupedRows = Object.values(map).sort((a, b) => b.total - a.total);
    const grandTotal = groupedRows.reduce((acc, r) => acc + r.total, 0);

    return {
      title: 'Resumo Geral de Recebíveis',
      subtitle: `Saldos pendentes por parceiro no período de ${startDate} a ${endDate}`,
      columns: [], // Template usa estrutura customizada
      rows: groupedRows,
      summary: [{ label: 'Total Geral a Receber', value: grandTotal, format: 'currency' }]
    };
  },
  Template: PartnerSummaryTemplate
};

export default receivablesSummaryPartner;
