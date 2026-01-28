
import { TrendingUp } from 'lucide-react';
import { ReportModule } from '../../types';
import { financialIntegrationService } from '../../../../services/financialIntegrationService';
import { advanceService } from '../../../Financial/Advances/services/advanceService';
import UniversalReportTemplate from '../../templates/UniversalReportTemplate'; // Reusing Universal Template
import Filters from './Filters';

const partnerReceivablesReport: ReportModule = {
  metadata: {
    id: 'partner_receivables',
    title: 'Recebimentos em Aberto (Parceiros)',
    description: 'Valores a receber de clientes e parceiros (Vendas e Adiantamentos).',
    category: 'registration',
    icon: TrendingUp,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
    partnerName: ''
  },
  FilterComponent: Filters,
  fetchData: ({ startDate, endDate, partnerName }) => {
    // 1. Get Receivables from Integration (Sales)
    const receivables = financialIntegrationService.getReceivables()
      .filter(r => r.status !== 'paid' && r.subType === 'sales_order');

    // 2. Get Advances GIVEN (Assets)
    const advances = advanceService.getAllTransactions()
      .filter(t => t.type === 'given' && t.status === 'active');

    // Combine
    let rows = [
      ...receivables.map(r => ({
        date: r.dueDate,
        partner: r.entityName,
        type: 'Venda de Grãos',
        description: r.description,
        value: r.originalValue - r.paidValue
      })),
      ...advances.map(a => ({
        date: a.date,
        partner: a.partnerName,
        type: 'Adiantamento Concedido',
        description: a.description,
        value: a.value
      }))
    ];

    // Filter
    if (startDate && endDate) {
      rows = rows.filter(r => r.date >= startDate && r.date <= endDate);
    }
    if (partnerName) {
      rows = rows.filter(r => r.partner.toLowerCase().includes(partnerName.toLowerCase()));
    }

    const total = rows.reduce((acc, r) => acc + r.value, 0);

    return {
      title: 'Relatório de Recebimentos em Aberto',
      subtitle: `Posição de créditos com parceiros até ${new Date(endDate).toLocaleDateString()}`,
      columns: [
        { header: 'Vencimento / Data', accessor: 'date', format: 'date', width: 'w-24' },
        { header: 'Parceiro', accessor: 'partner', align: 'left' },
        { header: 'Origem', accessor: 'type', align: 'left', width: 'w-40' },
        { header: 'Descrição', accessor: 'description', align: 'left' },
        { header: 'Valor a Receber', accessor: 'value', format: 'currency', align: 'right' }
      ],
      rows,
      summary: [{ label: 'Total a Receber', value: total, format: 'currency' }]
    };
  },
  Template: UniversalReportTemplate
};

export default partnerReceivablesReport;
