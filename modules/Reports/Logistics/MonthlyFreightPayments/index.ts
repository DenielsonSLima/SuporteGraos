
import { DollarSign } from 'lucide-react';
import { ReportModule } from '../../types';
import { loadingService } from '../../../../services/loadingService';
import UniversalReportTemplate from '../../templates/UniversalReportTemplate';
import DefaultFilters from '../../components/DefaultFilters';

const monthlyFreightPaymentsReport: ReportModule = {
  metadata: {
    id: 'freight_payments_report',
    title: 'Pagamentos de Frete (Mês)',
    description: 'Lista de adiantamentos e pagamentos de saldo realizados no período.',
    category: 'logistics',
    icon: DollarSign,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  },
  FilterComponent: DefaultFilters,
  fetchData: ({ startDate, endDate }) => {
    const allLoadings = loadingService.getAll();
    const paymentRows: any[] = [];

    allLoadings.forEach(l => {
      (l.transactions || []).forEach(t => {
        const matchesDate = (!startDate || t.date >= startDate) && (!endDate || t.date <= endDate);
        if (matchesDate && (t.type === 'payment' || t.type === 'advance')) {
          paymentRows.push({
            date: t.date,
            carrier: l.carrierName,
            plate: l.vehiclePlate,
            type: t.type === 'advance' ? 'Adiantamento' : 'Saldo',
            account: t.accountName,
            value: t.value,
            notes: t.notes
          });
        }
      });
    });

    const totalPaid = paymentRows.reduce((acc, p) => acc + p.value, 0);

    return {
      title: 'Relatório de Pagamentos de Logística',
      subtitle: `Saídas de caixa vinculadas a fretes de ${startDate} a ${endDate}`,
      columns: [
        { header: 'Data Pgto.', accessor: 'date', format: 'date' },
        { header: 'Transportadora', accessor: 'carrier' },
        { header: 'Placa', accessor: 'plate', align: 'center' },
        { header: 'Tipo', accessor: 'type', align: 'center' },
        { header: 'Conta Bancária', accessor: 'account' },
        { header: 'Valor Pago', accessor: 'value', format: 'currency', align: 'right' }
      ],
      rows: paymentRows.sort((a, b) => b.date.localeCompare(a.date)),
      summary: [
        { label: 'Total Desembolsado (Frete)', value: totalPaid, format: 'currency' }
      ]
    };
  },
  Template: UniversalReportTemplate
};

export default monthlyFreightPaymentsReport;
