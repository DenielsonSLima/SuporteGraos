
import { BarChart2 } from 'lucide-react';
import { ReportModule } from '../../types';
import { financialIntegrationService } from '../../../../services/financialIntegrationService';
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
    const filterByDate = (dateStr: string) => {
      if (!startDate && !endDate) return true;
      const d = new Date(dateStr).getTime();
      const start = startDate ? new Date(startDate).getTime() : 0;
      const end = endDate ? new Date(endDate).getTime() : Infinity;
      return d >= start && d <= end;
    };

    const purchaseFinancial = financialIntegrationService
      .getPayables()
      .filter((r) => r.subType === 'purchase_order')
      .filter((r) => filterByDate(r.issueDate || r.dueDate));

    const salesFinancial = financialIntegrationService
      .getReceivables()
      .filter((r) => r.subType === 'sales_order')
      .filter((r) => filterByDate(r.issueDate || r.dueDate));

    // Grouping
    const partnerMap: Record<string, { name: string, type: string, volume: number, total: number, count: number }> = {};

    purchaseFinancial.forEach((record) => {
      const key = `SUP-${record.entityName}`;
      if (!partnerMap[key]) {
        partnerMap[key] = { name: record.entityName, type: 'Fornecedor', volume: 0, total: 0, count: 0 };
      }
      partnerMap[key].volume += record.totalSc || record.weightSc || 0;
      partnerMap[key].total += record.originalValue;
      partnerMap[key].count += 1;
    });

    salesFinancial.forEach((record) => {
      const key = `CUST-${record.entityName}`;
      if (!partnerMap[key]) {
        partnerMap[key] = { name: record.entityName, type: 'Cliente', volume: 0, total: 0, count: 0 };
      }
      partnerMap[key].volume += record.totalSc || record.weightSc || 0;
      partnerMap[key].total += record.originalValue;
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
