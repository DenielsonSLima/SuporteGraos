
import { Truck } from 'lucide-react';
import { ReportModule } from '../../types';
import { loadingService } from '../../../../services/loadingService';
import Template from './Template';
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
    const all = loadingService.getAll();
    const records = all.filter(l => {
      // Date Filter
      if (startDate && endDate) {
        const d = new Date(l.date).getTime();
        const start = startDate ? new Date(startDate).getTime() : 0;
        const end = endDate ? new Date(endDate).getTime() : Infinity;
        if (d < start || d > end) return false;
      }
      
      // Carrier Filter
      if (carrierName && l.carrierName !== carrierName) {
        return false;
      }

      return true;
    });

    return {
      title: 'Relatório de Logística e Fretes',
      subtitle: `Movimentações de ${startDate} a ${endDate} ${carrierName ? ` - ${carrierName}` : ''}`,
      columns: [
        { header: 'Data', accessor: 'date', format: 'date', width: 'w-20' },
        { header: 'Placa', accessor: 'plate', width: 'w-24' },
        { header: 'Transportadora', accessor: 'carrier' },
        { header: 'Origem -> Destino', accessor: 'route' },
        { header: 'Peso Origem (Kg)', accessor: 'weightOrigin', format: 'number', align: 'right' },
        { header: 'Peso Destino (Kg)', accessor: 'weightDest', format: 'number', align: 'right' },
        { header: 'Quebra (Kg)', accessor: 'breakage', format: 'number', align: 'right' },
        { header: 'Valor Frete', accessor: 'value', format: 'currency', align: 'right' }
      ],
      rows: records.map(l => ({
        date: l.date,
        plate: l.vehiclePlate,
        carrier: l.carrierName,
        route: `${l.supplierName.split(' ')[0]} -> ${l.customerName.split(' ')[0]}`,
        weightOrigin: l.weightKg,
        weightDest: l.unloadWeightKg || 0,
        breakage: l.breakageKg || 0,
        value: l.totalFreightValue
      })),
      summary: [
        { label: 'Total Fretes (R$)', value: records.reduce((a,b) => a + b.totalFreightValue, 0), format: 'currency' },
        { label: 'Total Volume Origem (Ton)', value: records.reduce((a,b) => a + b.weightKg, 0) / 1000, format: 'number' },
        { label: 'Total Quebra (Kg)', value: records.reduce((a,b) => a + (b.breakageKg || 0), 0), format: 'number' }
      ]
    };
  },
  Template: Template
};

export default freightReport;
