
import { FileText } from 'lucide-react';
import { ReportModule } from '../../types';
import { financialIntegrationService } from '../../../../services/financialIntegrationService';
import UniversalReportTemplate from '../../templates/UniversalReportTemplate';
import DefaultFilters from '../../components/DefaultFilters';

const revenueReport: ReportModule = {
  metadata: {
    id: 'revenue_detailed',
    title: 'Relatório de Faturamento',
    description: 'Detalhamento de receita por nota fiscal, cliente e produto.',
    category: 'commercial',
    icon: FileText,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
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

    const totalRevenue = receivables.reduce((acc, r) => acc + r.originalValue, 0);
    const totalVolume = receivables.reduce((acc, r) => acc + (r.weightKg || 0), 0) / 1000;

    return {
      title: 'Relatório de Faturamento Detalhado',
      subtitle: `Período de Realização: ${startDate} a ${endDate}`,
      columns: [
        { header: 'Data', accessor: 'date', format: 'date', width: 'w-24' },
        { header: 'NF', accessor: 'invoice', width: 'w-20', align: 'center' },
        { header: 'Cliente', accessor: 'customer' },
        { header: 'Produto', accessor: 'product' },
        { header: 'Peso (Ton)', accessor: 'weight', format: 'number', align: 'right' },
        { header: 'Preço SC', accessor: 'price', format: 'currency', align: 'right' },
        { header: 'Valor Total', accessor: 'total', format: 'currency', align: 'right' }
      ],
      rows: receivables.map(r => ({
        date: r.issueDate || r.dueDate,
        invoice: 'S/N',
        customer: r.entityName,
        product: r.description || 'Grãos',
        weight: (r.weightKg || 0) / 1000,
        price: r.unitPriceSc || 0,
        total: r.originalValue
      })),
      summary: [
          { label: 'Volume Total (TON)', value: totalVolume, format: 'number' },
          { label: 'Faturamento Bruto', value: totalRevenue, format: 'currency' }
      ]
    };
  },
  Template: UniversalReportTemplate
};

export default revenueReport;
