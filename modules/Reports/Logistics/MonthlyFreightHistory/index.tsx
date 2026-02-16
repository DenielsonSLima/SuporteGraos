
import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { ReportModule } from '../../types';
import { loadingService, mapLoadingFromDb } from '../../../../services/loadingService';
import UniversalReportTemplate from '../../templates/UniversalReportTemplate';
import { supabase } from '../../../../services/supabase';

import DefaultFilters from '../../components/DefaultFilters';

const MonthlyFreightHistoryFilters: React.FC<any> = (props) => {
  // TODO: Em um futuro ideal, buscar carriers via RPC/Query distinct para não depender do loadingService
  const carriers = Array.from(new Set(loadingService.getAll().map(l => l.carrierName).filter(Boolean)));
  return <DefaultFilters {...props} carrierOptions={carriers} />;
};

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
  FilterComponent: MonthlyFreightHistoryFilters,
  fetchData: async ({ startDate, endDate, carrierName }) => {

    // Construir query no Supabase
    let query = supabase
      .from('logistics_loadings')
      .select('*')
      .neq('status', 'canceled');

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    // Adicionei filtro para buscar apenas finalizados se desejado, mas o original trazia tudo exceto cancelado

    // Filtro por transportadora (case insensitive ou exato? O original era exato no ID ou nome?)
    // O original filtrava por carrierName === carrierName.
    // No banco, temos carrier_name.
    if (carrierName) {
      query = query.eq('carrier_name', carrierName);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar dados do relatório:', error);
      throw error;
    }

    // Mapear dados crus snake_case para camelCase (Loading objects)
    const records = (data || []).map(mapLoadingFromDb);

    // Agregação em memória (agora segura pois só temos os dados filtrados)
    const totalTon = records.reduce((acc, l) => acc + ((l.weightKg || 0) / 1000), 0);
    const totalValue = records.reduce((acc, l) => acc + (l.totalFreightValue || 0), 0);

    return {
      title: 'Histórico de Fretes do Mês',
      subtitle: `Movimentação consolidada de ${startDate} a ${endDate}` + (carrierName ? ` • Transportadora: ${carrierName}` : ''),
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
        balance: (l.totalFreightValue || 0) - (l.freightPaid || 0),
        driverName: l.driverName || '-',
        weightType: l.unloadWeightKg ? 'Destino' : 'Origem',
        breakageKg: l.breakageKg || 0,
        weightTon: l.unloadWeightKg ? (l.unloadWeightKg / 1000) : l.weightTon || (l.weightKg / 1000) || 0
      })),
      summary: [
        { label: 'Volume Total (Toneladas)', value: totalTon, format: 'number' },
        { label: 'Custo Logístico Total', value: totalValue, format: 'currency' }
      ]
    };
  },
  Template: UniversalReportTemplate
};

export default monthlyFreightHistoryReport;
