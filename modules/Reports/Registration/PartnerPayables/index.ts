
import { TrendingDown } from 'lucide-react';
import { ReportModule } from '../../types';
import { financialIntegrationService } from '../../../../services/financialIntegrationService';
import { advanceService } from '../../../Financial/Advances/services/advanceService';
import UniversalReportTemplate from '../../templates/UniversalReportTemplate';
import Filters from '../PartnerReceivables/Filters'; // Reusing Filters as they are identical
import PdfDocument from './PdfDocument';

const partnerPayablesReport: ReportModule = {
  metadata: {
    id: 'partner_payables',
    title: 'Débitos em Aberto (Parceiros)',
    description: 'Obrigações financeiras com fornecedores, fretes e clientes.',
    category: 'registration',
    icon: TrendingDown,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
    partnerName: ''
  },
  FilterComponent: Filters,
  fetchData: ({ startDate, endDate, partnerName }) => {
    // 1. Get Payables from Integration (Purchase, Freight, Commissions)
    const payables = financialIntegrationService.getPayables()
      .filter(r => r.status !== 'paid' && ['purchase_order', 'freight', 'commission'].includes(r.subType || ''));

    // 2. Get Advances TAKEN (Liabilities)
    const advances = advanceService.getAllTransactions()
      .filter(t => t.type === 'taken' && t.status === 'active');

    // Combine
    let rows = [
      ...payables.map(r => ({
        date: r.dueDate,
        partner: r.entityName,
        type: r.subType === 'purchase_order' ? 'Compra de Grãos' : r.subType === 'freight' ? 'Frete' : 'Comissão',
        description: r.description,
        value: r.originalValue - r.paidValue
      })),
      ...advances.map(a => ({
        date: a.date,
        partner: a.partnerName,
        type: 'Adiantamento Recebido',
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
      title: 'Relatório de Débitos e Obrigações',
      subtitle: `Valores a pagar a parceiros até ${new Date(endDate).toLocaleDateString()}`,
      columns: [
        { header: 'Vencimento / Data', accessor: 'date', format: 'date', width: 'w-24' },
        { header: 'Parceiro', accessor: 'partner', align: 'left' },
        { header: 'Origem', accessor: 'type', align: 'left', width: 'w-40' },
        { header: 'Descrição', accessor: 'description', align: 'left' },
        { header: 'Valor a Pagar', accessor: 'value', format: 'currency', align: 'right' }
      ],
      rows,
      summary: [{ label: 'Total a Pagar', value: total, format: 'currency' }]
    };
  },
  Template: UniversalReportTemplate,
  PdfDocument: PdfDocument
};

export default partnerPayablesReport;
