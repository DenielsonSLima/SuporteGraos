import React from 'react';
import { Calendar } from 'lucide-react';
import { ReportModule } from '../../types';
import UniversalReportTemplate from '../../templates/UniversalReportTemplate';
import { supabase } from '../../../../services/supabase';
import DefaultFilters from '../../components/DefaultFilters';

const monthlyFreightHistoryReport: ReportModule = {
  metadata: {
    id: 'freight_monthly_history',
    title: 'Histórico de Fretes do Mês',
    description: 'Relatório completo de todas as cargas do mês com volumes e quebras (Server-Side).',
    category: 'logistics',
    icon: Calendar,
    needsDateFilter: true
  },
  initialFilters: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  },
  FilterComponent: DefaultFilters,
  fetchData: async ({ startDate, endDate, carrierName }) => {
    const { data, error } = await supabase.rpc('rpc_get_freight_history_report', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_carrier_name: carrierName || null
    });

    if (error) throw error;

    const result = data as { rows: any[], summary: any[] };

    return {
      title: 'Histórico de Fretes do Mês',
      subtitle: `Movimentação consolidada de ${startDate} a ${endDate}` + (carrierName ? ` • Transportadora: ${carrierName}` : ''),
      columns: [
        { header: 'Data', accessor: 'date', format: 'date' },
        { header: 'Transportadora', accessor: 'carrier_name' },
        { header: 'Motorista', accessor: 'driver_name', align: 'left' },
        { header: 'Placa', accessor: 'vehicle_plate', align: 'center' },
        { header: 'Peso (ton)', accessor: 'weight_ton', format: 'number', align: 'right' },
        { header: 'Obs. Peso', accessor: 'weight_type', align: 'center' },
        { header: 'Quebra', accessor: 'breakage_kg', format: 'number', align: 'right' },
        { header: 'V. Frete Total', accessor: 'total_freight_value', format: 'currency', align: 'right' },
        { header: 'Pago', accessor: 'freight_paid', format: 'currency', align: 'right' },
        { header: 'Em Aberto', accessor: 'balance', format: 'currency', align: 'right' }
      ],
      rows: result.rows,
      summary: result.summary
    };
  },
  Template: UniversalReportTemplate
};

export default monthlyFreightHistoryReport;
