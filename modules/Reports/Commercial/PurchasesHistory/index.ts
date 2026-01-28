
import { ShoppingCart } from 'lucide-react';
import { ReportModule } from '../../types';
import { reportsCache } from '../../../../services/reportsCache';
import Template from './Template';
import Filters from './Filters';

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
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // First day of month
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0], // Last day of month
    partnerId: '',
    product: ''
  },
  FilterComponent: Filters,
  fetchData: ({ startDate, endDate, partnerId, product }) => {
    let all = reportsCache.getAllPurchases();
    
    // Apply Filters
    all = all.filter(p => {
      // Date
      if (startDate && endDate) {
        const d = new Date(p.date).getTime();
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        if (d < start || d > end) return false;
      }
      // Partner (using Name as ID for this mock)
      if (partnerId && p.partnerName !== partnerId) return false;
      
      // Product
      if (product) {
        const hasProduct = p.items.some(i => i.productName === product);
        if (!hasProduct) return false;
      }

      return true;
    });

    // Build Report Data
    const rows = all.map(p => ({
      date: p.date,
      number: p.number,
      partnerName: p.partnerName,
      product: p.items[0]?.productName || 'Grãos',
      volume: `${p.items.reduce((a, b) => a + b.quantity, 0)} ${p.items[0]?.unit || 'SC'}`,
      total: p.totalValue
    }));

    const totalVal = all.reduce((acc, r) => acc + r.totalValue, 0);

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
  Template: Template
};

export default purchasesHistoryReport;
