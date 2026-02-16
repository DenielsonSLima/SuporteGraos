
import { Truck } from 'lucide-react';
import { ReportModule } from '../../types';
import { loadingService } from '../../../../services/loadingService';
import Template from './Template';
import PdfDocument from './PdfDocument';
import Filters from './Filters';

const freightReport: ReportModule = {
  metadata: {
    id: 'freight_general',
    title: 'Relatório de Fretes e Transportes',
    description: 'Controle de transportes, pesagens, quebras e custos logísticos.',
    category: 'logistics',
    icon: Truck,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    carrierName: ''
  },
  FilterComponent: Filters,
  fetchData: ({ startDate, endDate, carrierName }) => {
    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v);
    const fmtInt = (v: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(v);
    const all = loadingService.getAll();
    const records = all.filter(l => {
      if (startDate && endDate) {
        const d = new Date(l.date).getTime();
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        if (d < start || d > end) return false;
      }
      if (carrierName && l.carrierName !== carrierName) return false;
      return true;
    });

    return {
      title: 'Relatório de Logística e Fretes',
      subtitle: `Movimentações de ${startDate} a ${endDate}${carrierName ? ` - ${carrierName}` : ''}`,
      landscape: true,
      columns: [
        { header: 'Data', accessor: 'date', format: 'date', width: 'w-20' },
        { header: 'Transportadora', accessor: 'carrier' },
        { header: 'Motorista', accessor: 'driver' },
        { header: 'Origem', accessor: 'origin' },
        { header: 'Destino', accessor: 'destination' },
        { header: 'Frete/Ton', accessor: 'freightPerTon', format: 'currency', align: 'right' },
        { header: 'Peso Origem (Kg)', accessor: 'weightOrigin', format: 'number', align: 'right' },
        { header: 'Peso Destino (Kg)', accessor: 'weightDest', format: 'number', align: 'right' },
        { header: 'Base Cálculo', accessor: 'weightBase', align: 'center' },
        { header: 'Valor Frete', accessor: 'value', format: 'currency', align: 'right' }
      ],
      rows: records.map(l => {
        const usaDestino = l.unloadWeightKg && l.unloadWeightKg > 0;
        return {
          date: l.date,
          carrier: l.carrierName,
          driver: l.driverName,
          origin: l.supplierName,
          destination: l.customerName,
          freightPerTon: l.freightPricePerTon || 0,
          weightOrigin: l.weightKg,
          weightDest: l.unloadWeightKg || 0,
          weightBase: usaDestino ? 'Destino' : 'Origem',
          value: l.totalFreightValue
        };
      }),
      summary: [
        { label: 'Total Fretes (R$)', value: records.reduce((a,b) => a + b.totalFreightValue, 0), format: 'currency' },
        { label: 'Total Volume Origem (Ton)', value: records.reduce((a,b) => a + b.weightKg, 0) / 1000, format: 'number' },
        { label: 'Total Quebra (Kg)', value: records.reduce((a,b) => a + (b.breakageKg || 0), 0), format: 'number' }
      ]
    };
  },
  Template: Template,
  PdfDocument: PdfDocument
};

export default freightReport;
