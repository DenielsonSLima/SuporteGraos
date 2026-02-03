
import { TrendingUp } from 'lucide-react';
import { ReportModule } from '../../types';
import { reportsCache } from '../../../../services/reportsCache';
import Template from './Template';
import PdfDocument from './PdfDocument';
import DefaultFilters from '../../components/DefaultFilters';

const salesHistoryReport: ReportModule = {
  metadata: {
    id: 'sales_history',
    title: 'Histórico de Vendas',
    description: 'Relatório de saídas, faturamento e clientes atendidos.',
    category: 'commercial',
    icon: TrendingUp,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
  },
  FilterComponent: DefaultFilters, // Use the default date range filter
  fetchData: ({ startDate, endDate }) => {
    const all = reportsCache.getAllSales();
    const records = all.filter(s => {
      if (!startDate && !endDate) return true;
      const d = new Date(s.date).getTime();
      const start = startDate ? new Date(startDate).getTime() : 0;
      const end = endDate ? new Date(endDate).getTime() : Infinity;
      return d >= start && d <= end;
    });

    const totalVal = records.reduce((acc, r) => acc + r.totalValue, 0);

    return {
      title: 'Histórico de Vendas',
      subtitle: `Período: ${startDate} a ${endDate}`,
      columns: [
        { header: 'Data', accessor: 'date', format: 'date', width: 'w-24' },
        { header: 'Nº Pedido', accessor: 'number', width: 'w-28' },
        { header: 'Cliente', accessor: 'customerName' },
        { header: 'Produto', accessor: 'productName' },
        { header: 'Quantidade', accessor: 'qty', align: 'right' },
        { header: 'Valor Total', accessor: 'total', format: 'currency', align: 'right' }
      ],
      rows: records.map(s => ({
        ...s,
        qty: s.quantity ? `${s.quantity} SC` : '-',
        total: s.totalValue
      })),
      summary: [{ label: 'Total Vendido', value: totalVal, format: 'currency' }]
    };
  },
  Template: Template,
  PdfDocument: PdfDocument
};

export default salesHistoryReport;
