
import { FileText } from 'lucide-react';
import { ReportModule } from '../../types';
import { loadingService } from '../../../../services/loadingService';
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
    const loadings = loadingService.getAll().filter(l => 
        l.status === 'completed' && 
        (!startDate || l.date >= startDate) && 
        (!endDate || l.date <= endDate)
    );

    const totalRevenue = loadings.reduce((acc, l) => acc + (l.totalSalesValue || 0), 0);
    const totalVolume = loadings.reduce((acc, l) => acc + (l.weightKg || 0), 0) / 1000;

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
      rows: loadings.map(l => ({
        date: l.date,
        invoice: l.invoiceNumber || 'S/N',
        customer: l.customerName,
        product: l.product,
        weight: l.weightKg / 1000,
        price: l.salesPrice,
        total: l.totalSalesValue
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
