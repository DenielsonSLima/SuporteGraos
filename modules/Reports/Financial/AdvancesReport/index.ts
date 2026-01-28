
import { HandCoins } from 'lucide-react';
import { ReportModule } from '../../types';
import { advanceService } from '../../../Financial/Advances/services/advanceService';
import Template from './Template';
import Filters from './Filters';

const advancesReport: ReportModule = {
  metadata: {
    id: 'advances_report',
    title: 'Relatório de Adiantamentos',
    description: 'Extrato de valores antecipados (concedidos a fornecedores ou recebidos de clientes).',
    category: 'financial',
    icon: HandCoins,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
    partnerName: '',
    type: ''
  },
  FilterComponent: Filters,
  fetchData: ({ startDate, endDate, partnerName, type }) => {
    let records = advanceService.getAllTransactions();

    // Filtros
    if (startDate && endDate) {
        records = records.filter(t => t.date >= startDate && t.date <= endDate);
    }
    if (partnerName) {
        const lower = partnerName.toLowerCase();
        records = records.filter(t => t.partnerName.toLowerCase().includes(lower));
    }
    if (type) {
        records = records.filter(t => t.type === type);
    }

    // Totais
    const totalGiven = records.filter(t => t.type === 'given').reduce((acc, t) => acc + t.value, 0);
    const totalTaken = records.filter(t => t.type === 'taken').reduce((acc, t) => acc + t.value, 0);

    return {
      title: 'Relatório Analítico de Adiantamentos',
      subtitle: `Movimentações de ${new Date(startDate).toLocaleDateString()} a ${new Date(endDate).toLocaleDateString()}`,
      columns: [
        { header: 'Data', accessor: 'date', format: 'date', width: 'w-24' },
        { header: 'Parceiro', accessor: 'partnerName', align: 'left' },
        { header: 'Tipo', accessor: 'type', align: 'center' },
        { header: 'Descrição', accessor: 'description', align: 'left' },
        { header: 'Valor', accessor: 'value', format: 'currency', align: 'right' }
      ],
      rows: records,
      summary: [
          { label: 'Total Concedido (Ativo)', value: totalGiven, format: 'currency' },
          { label: 'Total Recebido (Passivo)', value: totalTaken, format: 'currency' }
      ]
    };
  },
  Template: Template
};

export default advancesReport;
