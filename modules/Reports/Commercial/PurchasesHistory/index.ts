
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
  fetchData: ({ startDate, endDate, partnerId, product }) => {
    // Buscar pedidos e carregamentos
    let allOrders = reportsCache.getAllPurchases();
    const allLoadings = reportsCache.getAllLoadings();

    // Filtrar pedidos por data
    allOrders = allOrders.filter(p => {
      if (startDate && endDate) {
        const d = new Date(p.date).getTime();
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        if (d < start || d > end) return false;
      }
      if (partnerId && p.partnerName !== partnerId) return false;
      if (product) {
        const hasProduct = (p.items || []).some((i: any) => i.productName === product);
        if (!hasProduct) return false;
      }
      return true;
    });

    // Para cada pedido, calcular totais a partir dos carregamentos (loadings)
    const rows = allOrders.map(p => {
      const orderLoadings = allLoadings.filter(
        (l: any) => l.purchaseOrderId === p.id && l.status !== 'canceled'
      );

      // Somar valores dos carregamentos (mesma lógica que usePurchaseOrderLogic)
      const totalPurchaseValue = orderLoadings.reduce((acc: number, l: any) => acc + (l.totalPurchaseValue || 0), 0);
      const totalSc = orderLoadings.reduce((acc: number, l: any) => acc + (l.weightSc || 0), 0);

      // Produto: pegar do item do pedido ou do loading
      const primaryProduct = (p.items && p.items[0]?.productName)
        || (orderLoadings[0] as any)?.productName
        || 'Grãos';

      return {
        date: p.date,
        number: p.number,
        partnerName: p.partnerName,
        product: primaryProduct,
        volume: totalSc > 0 ? `${formatNumber(totalSc)} SC` : '-',
        total: totalPurchaseValue
      };
    });

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
