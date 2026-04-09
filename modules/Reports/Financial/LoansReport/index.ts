
import { Landmark } from 'lucide-react';
import { ReportModule } from '../../types';
import { reportsCache } from '../../../../services/reportsCache';
import Template from './Template';
import PdfDocument from './PdfDocument';

// No complex filters needed for now, listing all active/history
const loansReport: ReportModule = {
  metadata: {
    id: 'loans_status',
    title: 'Extrato de Empréstimos',
    description: 'Acompanhamento de contratos, juros e saldos devedores.',
    category: 'financial',
    icon: Landmark,
    needsDateFilter: false
  },
  initialFilters: {},
  FilterComponent: undefined, 
  fetchData: async () => {
    const loans = await reportsCache.getAllLoans();
    const activeLoans = loans.filter(l => l.status === 'open');
    
    // Totals
    const totalTaken = activeLoans.filter(l => l.type === 'taken').reduce((acc, l) => acc + (l.remaining_amount || 0), 0);
    const totalGranted = activeLoans.filter(l => l.type === 'granted').reduce((acc, l) => acc + (l.remaining_amount || 0), 0);

    return {
      title: 'Posição de Empréstimos e Financiamentos',
      subtitle: `Contratos Ativos: ${activeLoans.length}`,
      columns: [
        { header: 'Entidade', accessor: 'entityName', align: 'left' },
        { header: 'Tipo', accessor: 'typeLabel', align: 'center' },
        { header: 'Início', accessor: 'start_date', format: 'date' },
        { header: 'Vencimento', accessor: 'nextDueDate', format: 'date' },
        { header: 'Valor Original', accessor: 'principal_amount', format: 'currency', align: 'right' },
        { header: 'Taxa', accessor: 'rateLabel', align: 'right' },
        { header: 'Saldo Atual', accessor: 'remaining_amount', format: 'currency', align: 'right' }
      ],
      rows: loans.map(l => ({
        ...l,
        typeLabel: l.type === 'taken' ? 'Tomado (Passivo)' : 'Concedido (Ativo)',
        rateLabel: `${l.interest_rate}% a.m.`
      })),
      summary: [
          { label: 'Total a Pagar (Passivo)', value: totalTaken, format: 'currency' },
          { label: 'Total a Receber (Ativo)', value: totalGranted, format: 'currency' }
      ]
    };
  },
  Template: Template,
  PdfDocument: PdfDocument
};

export default loansReport;
