
import { HandCoins } from 'lucide-react';
import { ReportModule } from '../../types';
import { reportsCache } from '../../../../services/reportsCache';
import Template from './Template';
import PdfDocument from './PdfDocument';
import DefaultFilters from '../../components/DefaultFilters';

const receivablesReport: ReportModule = {
  metadata: {
    id: 'receivables_report',
    title: 'Contas a Receber',
    description: 'Títulos a receber, clientes e empréstimos concedidos.',
    category: 'financial',
    icon: HandCoins,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0).toISOString().split('T')[0],
  },
  FilterComponent: DefaultFilters,
  fetchData: ({ startDate, endDate }) => {
    const all = reportsCache.getReceivables();
    const records = all.filter(r => {
      // Empréstimos concedidos ativos sempre aparecem (são contratos de longo prazo)
      const isActiveLoan = r.subType === 'loan_granted' && r.status !== 'paid';
      if (isActiveLoan) return true;
      
      if (!startDate && !endDate) return true;
      const d = new Date(r.dueDate).getTime();
      const start = startDate ? new Date(startDate).getTime() : 0;
      const end = endDate ? new Date(endDate).getTime() : Infinity;
      return d >= start && d <= end;
    });

    const pendingTotal = records.reduce((acc, r) => acc + (r.originalValue - r.paidValue), 0);

    return {
      title: 'Relatório de Contas a Receber',
      subtitle: `Vencimentos de ${startDate} até ${endDate}`,
      columns: [
        { header: 'Vencimento', accessor: 'dueDate', format: 'date' },
        { header: 'Cliente / Devedor', accessor: 'entityName' },
        { header: 'Descrição', accessor: 'description' },
        { header: 'Categoria', accessor: 'category' },
        { header: 'Valor Original', accessor: 'originalValue', format: 'currency', align: 'right' },
        { header: 'Saldo a Receber', accessor: 'balance', format: 'currency', align: 'right' }
      ],
      rows: records.map(r => ({ ...r, balance: r.originalValue - r.paidValue })),
      summary: [{ label: 'Total a Receber', value: pendingTotal, format: 'currency' }]
    };
  },
  Template: Template,
  PdfDocument: PdfDocument
};

export default receivablesReport;
