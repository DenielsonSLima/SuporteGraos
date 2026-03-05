/**
 * logisticsKpiService.ts
 *
 * Serviço para buscar KPIs agregados de Logística via RPC.
 * SKIL §5.4: Agregações financeiras (SUM) sempre no banco — não no frontend.
 *
 * RPC: rpc_logistics_kpi_totals (definida em 20260304_logistics_sql_canonical.sql)
 */

import { supabase } from './supabase';

export interface LogisticsKPIs {
  totalFreightValue: number;
  totalPaid: number;
  totalPending: number;
  totalVolumeTon: number;
  activeCount: number;
  totalCount: number;
}

export interface LogisticsKPIFilters {
  carrierName?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}

/**
 * Busca KPIs agregados da VIEW v_logistics_freights via RPC.
 * Todos os SUM/COUNT são computados no PostgreSQL.
 */
export async function fetchLogisticsKPIs(filters: LogisticsKPIFilters = {}): Promise<LogisticsKPIs> {
  const { data, error } = await supabase.rpc('rpc_logistics_kpi_totals', {
    p_carrier_name: filters.carrierName || null,
    p_start_date: filters.startDate || null,
    p_end_date: filters.endDate || null,
    p_search: filters.searchTerm || null,
  });

  if (error) {
    console.error('[logisticsKpiService] Erro ao buscar KPIs:', error.message);
    throw error;
  }

  // RPC retorna array com 1 row
  const row = Array.isArray(data) ? data[0] : data;

  return {
    totalFreightValue: Number(row?.total_freight_value ?? 0),
    totalPaid: Number(row?.total_paid ?? 0),
    totalPending: Number(row?.total_pending ?? 0),
    totalVolumeTon: Number(row?.total_volume_ton ?? 0),
    activeCount: Number(row?.active_count ?? 0),
    totalCount: Number(row?.total_count ?? 0),
  };
}
