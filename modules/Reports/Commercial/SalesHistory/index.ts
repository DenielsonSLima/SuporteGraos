
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
  fetchData: async ({ startDate, endDate }) => {
    const { authService } = await import('../../../../services/authService');
    const { reportsService } = await import('../../../../services/reportsService');
    const companyId = authService.getCurrentUser()?.companyId || '';
    
    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v);
    
    // Agora busca dados já filtrados e agregados (volumes inclusos) do servidor
    const records = await reportsService.getSalesHistory(companyId, startDate, endDate);

    const rows = records.map(s => ({
      ...s,
      qty: s.quantity ? `${fmt(s.quantity)} SC` : '-',
      loaded: s.deliveredQtySc > 0 ? `${fmt(s.deliveredQtySc)} SC` : '-',
      total: s.realizedValue || s.totalValue
    }));

    const totalVal = rows.reduce((acc, r) => acc + (Number(r.total) || 0), 0);

    return {
      title: 'Histórico de Vendas',
      subtitle: `Período: ${startDate} a ${endDate}`,
      columns: [
        { header: 'Data', accessor: 'date', format: 'date', width: 'w-24' },
        { header: 'Nº Pedido', accessor: 'number', width: 'w-28' },
        { header: 'Cliente', accessor: 'customerName' },
        { header: 'Produto', accessor: 'productName' },
        { header: 'Quantidade', accessor: 'qty', align: 'right' },
        { header: 'Carregado', accessor: 'loaded', align: 'right' },
        { header: 'Valor Total', accessor: 'total', format: 'currency', align: 'right' }
      ],
      rows: rows,
      summary: [{ label: 'Total Vendido', value: totalVal, format: 'currency' }]
    };
  },
  Template: Template,
  PdfDocument: PdfDocument
};

export default salesHistoryReport;
