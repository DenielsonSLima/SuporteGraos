
import { DollarSign } from 'lucide-react';
import { ReportModule } from '../../types';
import { reportsCache } from '../../../../services/reportsCache';
import Template from './Template';
import DefaultFilters from '../../components/DefaultFilters';

const payablesReport: ReportModule = {
  metadata: {
    id: 'payables_open',
    title: 'Contas a Pagar',
    description: 'Títulos em aberto, vencimentos e fornecedores pendentes.',
    category: 'financial',
    icon: DollarSign,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0).toISOString().split('T')[0], // +2 months for payables
  },
  FilterComponent: DefaultFilters,
  fetchData: ({ startDate, endDate }) => {
    const all = reportsCache.getPayables();
    const records = all.filter(r => {
      if (!startDate && !endDate) return true;
      const d = new Date(r.dueDate).getTime();
      const start = startDate ? new Date(startDate).getTime() : 0;
      const end = endDate ? new Date(endDate).getTime() : Infinity;
      return d >= start && d <= end;
    });

    const pendingTotal = records.reduce((acc, r) => acc + (r.originalValue - r.paidValue), 0);

    return {
      title: 'Relatório de Contas a Pagar',
      subtitle: `Vencimentos de ${startDate} até ${endDate}`,
      columns: [
        { header: 'Vencimento', accessor: 'dueDate', format: 'date' },
        { header: 'Beneficiário', accessor: 'entityName' },
        { header: 'Descrição', accessor: 'description' },
        { header: 'Categoria', accessor: 'category' },
        { header: 'Valor Original', accessor: 'originalValue', format: 'currency', align: 'right' },
        { header: 'Saldo Devedor', accessor: 'balance', format: 'currency', align: 'right' }
      ],
      rows: records.map(r => ({ ...r, balance: r.originalValue - r.paidValue })),
      summary: [{ label: 'Total a Pagar', value: pendingTotal, format: 'currency' }]
    };
  },
  Template: Template
};

export default payablesReport;
