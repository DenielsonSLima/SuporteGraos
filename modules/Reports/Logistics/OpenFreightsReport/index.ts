
import { Truck } from 'lucide-react';
import { ReportModule } from '../../types';
import { reportsCache } from '../../../../services/reportsCache';
import UniversalReportTemplate from '../../templates/UniversalReportTemplate';
import DefaultFilters from '../../components/DefaultFilters';

const openFreightsReport: ReportModule = {
  metadata: {
    id: 'freight_open_report',
    title: 'Fretes em Aberto (Pendentes)',
    description: 'Cargas com saldo financeiro a pagar ou ainda em trânsito/descarregamento.',
    category: 'logistics',
    icon: Truck,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  },
  FilterComponent: DefaultFilters,
  fetchData: async ({ startDate, endDate }) => {
    const all = await reportsCache.getAllLoadings();
    const records = all.filter(l => {
      const isPending = l.status !== 'completed' || (l.totalFreightValue - l.freightPaid) > 0.05;
      const matchesDate = (!startDate || l.date >= startDate) && (!endDate || l.date <= endDate);
      return isPending && matchesDate;
    });

    const totalFreight = records.reduce((acc, l) => acc + l.totalFreightValue, 0);
    const totalPaid = records.reduce((acc, l) => acc + l.freightPaid, 0);

    return {
      title: 'Relatório de Fretes Pendentes',
      subtitle: `Posição de cargas não quitadas entre ${startDate} e ${endDate}`,
      columns: [
        { header: 'Data', accessor: 'date', format: 'date' },
        { header: 'Transportadora', accessor: 'carrierName' },
        { header: 'Motorista', accessor: 'driverName', align: 'left' },
        { header: 'Peso (ton)', accessor: 'weightTon', format: 'number', align: 'right' },
        { header: 'Obs. Peso', accessor: 'weightType', align: 'center' },
        { header: 'Quebra', accessor: 'breakageKg', format: 'number', align: 'right' },
        { header: 'Valor/ton', accessor: 'freightPricePerTon', format: 'currency', align: 'right' },
        { header: 'V. Frete Total', accessor: 'totalFreightValue', format: 'currency', align: 'right' },
        { header: 'Pago', accessor: 'freightPaid', format: 'currency', align: 'right' },
        { header: 'Em Aberto', accessor: 'balance', format: 'currency', align: 'right' }
      ],
      rows: records.map(l => ({
        ...l,
        balance: l.totalFreightValue - l.freightPaid,
        driverName: l.driverName || '-',
        weightType: l.unloadWeightKg ? 'Destino' : 'Origem',
        breakageKg: l.breakageKg || 0,
        weightTon: l.unloadWeightKg ? (l.unloadWeightKg / 1000) : l.weightTon || (l.weightKg / 1000) || 0
      })),
      summary: [
        { label: 'Valor Total Contratado', value: totalFreight, format: 'currency' },
        { label: 'Total Já Pago', value: totalPaid, format: 'currency' },
        { label: 'Saldo Devedor Total', value: totalFreight - totalPaid, format: 'currency' }
      ]
    };
  },
  Template: UniversalReportTemplate
};

export default openFreightsReport;
