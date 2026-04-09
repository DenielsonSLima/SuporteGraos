
import { ShoppingCart } from 'lucide-react';
import { ReportModule } from '../../types';
import { reportsCache } from '../../../../services/reportsCache';
import Template from './Template';
import PdfDocument from './PdfDocument';
import Filters from './Filters';

const formatNumber = (val: number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val);

const purchasesHistoryReport: ReportModule = {
  metadata: {
    id: 'purchases_history',
    title: 'Histórico de Compras',
    description: 'Detalhamento de entradas de grãos, volumes e valores por período.',
    category: 'commercial',
    icon: ShoppingCart,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    partnerId: '',
    product: ''
  },
  FilterComponent: Filters,
  fetchData: async ({ startDate, endDate, partnerId, product }) => {
    const { authService } = await import('../../../../services/authService');
    const { reportsService } = await import('../../../../services/reportsService');
    const companyId = authService.getCurrentUser()?.companyId || '';

    // Buscar dados já filtrados e agregados (volumes inclusos) do servidor
    const records = await reportsService.getPurchasesHistory(companyId, {
      startDate,
      endDate,
      partnerId,
      productName: product
    });

    const rows = records.map(p => ({
      date: p.date,
      number: p.number,
      partnerName: p.partnerName,
      product: p.productName,
      volume: p.volumeSc > 0 ? `${formatNumber(p.volumeSc)} SC` : '-',
      total: p.totalValue
    }));

    const totalVal = rows.reduce((acc, r) => acc + (Number(r.total) || 0), 0);

    return {
      title: 'Histórico de Compras',
      subtitle: `Período: ${startDate ? new Date(startDate).toLocaleDateString() : 'Inicio'} até ${endDate ? new Date(endDate).toLocaleDateString() : 'Hoje'}`,
      columns: [
        { header: 'Data', accessor: 'date', format: 'date', width: 'w-24' },
        { header: 'Nº Pedido', accessor: 'number', width: 'w-28' },
        { header: 'Fornecedor', accessor: 'partnerName' },
        { header: 'Produto', accessor: 'product' },
        { header: 'Volume', accessor: 'volume', align: 'right' },
        { header: 'Valor Total', accessor: 'total', format: 'currency', align: 'right' }
      ],
      rows: rows,
      summary: [{ label: 'Total Comprado', value: totalVal, format: 'currency' }]
    };
  },
  Template: Template,
  PdfDocument: PdfDocument
};

export default purchasesHistoryReport;
