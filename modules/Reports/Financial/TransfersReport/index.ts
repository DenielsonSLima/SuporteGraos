
import { ArrowRightLeft } from 'lucide-react';
import { ReportModule } from '../../types';
import { financialActionService } from '../../../../services/financialActionService';
import Template from './Template';
import DefaultFilters from '../../components/DefaultFilters';

const transfersReport: ReportModule = {
  metadata: {
    id: 'transfers_history',
    title: 'Transferências entre Contas',
    description: 'Histórico de movimentação financeira interna.',
    category: 'financial',
    icon: ArrowRightLeft,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  },
  FilterComponent: DefaultFilters,
  fetchData: ({ startDate, endDate }) => {
    let transfers = financialActionService.getTransfers();
    
    if (startDate && endDate) {
      transfers = transfers.filter(t => t.date >= startDate && t.date <= endDate);
    }

    const total = transfers.reduce((acc, t) => acc + t.value, 0);

    return {
      title: 'Relatório de Transferências Internas',
      subtitle: `Período: ${startDate} a ${endDate}`,
      columns: [
        { header: 'Data', accessor: 'date', format: 'date', width: 'w-24' },
        { header: 'Origem (Saiu)', accessor: 'originAccount', align: 'left' },
        { header: 'Destino (Entrou)', accessor: 'destinationAccount', align: 'left' },
        { header: 'Motivo', accessor: 'description', align: 'left' },
        { header: 'Valor', accessor: 'value', format: 'currency', align: 'right' }
      ],
      rows: transfers,
      summary: [{ label: 'Volume Transferido', value: total, format: 'currency' }]
    };
  },
  Template: Template
};

export default transfersReport;
