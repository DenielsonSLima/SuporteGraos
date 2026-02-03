
import { BarChart2 } from 'lucide-react';
import { ReportModule } from '../../types';
import { purchaseService } from '../../../../services/purchaseService';
import { salesService } from '../../../../services/salesService';
import Template from './Template';
import PdfDocument from './PdfDocument';
import DefaultFilters from '../../components/DefaultFilters';

const partnerPerformanceReport: ReportModule = {
  metadata: {
    id: 'commercial_partner_performance',
    title: 'Performance por Parceiro',
    description: 'Ranking de volumes negociados e valores financeiros por fornecedor e cliente.',
    category: 'commercial',
    icon: BarChart2,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Inicio do ano
    endDate: new Date().toISOString().split('T')[0],
  },
  FilterComponent: DefaultFilters,
  fetchData: ({ startDate, endDate }) => {
    // 1. Purchases
    const purchases = purchaseService.getAll().filter(p => {
        if (p.status === 'canceled') return false;
        if (!startDate || !endDate) return true;
        return p.date >= startDate && p.date <= endDate;
    });

    // 2. Sales
    const sales = salesService.getAll().filter(s => {
        if (s.status === 'canceled') return false;
        if (!startDate || !endDate) return true;
        return s.date >= startDate && s.date <= endDate;
    });

    // Grouping
    const partnerMap: Record<string, { name: string, type: string, volume: number, total: number, count: number }> = {};

    // Process Purchases (Suppliers)
    purchases.forEach(p => {
        const key = `SUP-${p.partnerId}`;
        if (!partnerMap[key]) partnerMap[key] = { name: p.partnerName, type: 'Fornecedor', volume: 0, total: 0, count: 0 };
        
        // Sum items volume (SC)
        const vol = p.items.reduce((acc, i) => acc + i.quantity, 0);
        partnerMap[key].volume += vol;
        partnerMap[key].total += p.totalValue;
        partnerMap[key].count += 1;
    });

    // Process Sales (Customers)
    sales.forEach(s => {
        const key = `CUST-${s.customerId}`;
        if (!partnerMap[key]) partnerMap[key] = { name: s.customerName, type: 'Cliente', volume: 0, total: 0, count: 0 };
        
        partnerMap[key].volume += (s.quantity || 0);
        partnerMap[key].total += s.totalValue;
        partnerMap[key].count += 1;
    });

    const rows = Object.values(partnerMap).sort((a, b) => b.total - a.total);
    const totalMovimentado = rows.reduce((acc, r) => acc + r.total, 0);

    return {
      title: 'Performance Comercial por Parceiro',
      subtitle: `Período: ${startDate} a ${endDate}`,
      columns: [
        { header: 'Parceiro', accessor: 'name', align: 'left' },
        { header: 'Tipo', accessor: 'type', align: 'center', width: 'w-24' },
        { header: 'Pedidos', accessor: 'count', align: 'center', width: 'w-20' },
        { header: 'Volume (SC)', accessor: 'volume', format: 'number', align: 'right' },
        { header: 'Valor Total', accessor: 'total', format: 'currency', align: 'right' }
      ],
      rows,
      summary: [{ label: 'Volume Financeiro Total', value: totalMovimentado, format: 'currency' }]
    };
  },
  Template: Template,
  PdfDocument: PdfDocument
};

export default partnerPerformanceReport;
