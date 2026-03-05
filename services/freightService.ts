/**
 * freightService.ts
 *
 * Serviço para buscar freights da VIEW v_logistics_freights.
 * Os cálculos (balance, financial_status, breakage) são feitos no banco.
 *
 * Regra 5.4: "Frontend NÃO faz cálculos — banco é a fonte da verdade."
 */

import { supabase } from './supabase';
import { Freight, FreightStatus, FreightFinancialStatus } from '../modules/Logistics/types';

/**
 * Busca todos os freights computados pela VIEW do banco.
 * Retorna dados já com balance, financial_status e breakage calculados.
 */
export async function fetchFreights(): Promise<Freight[]> {
  const { data, error } = await supabase
    .from('v_logistics_freights')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('[freightService] Erro ao buscar freights:', error.message);
    throw error;
  }

  return (data || []).map(mapViewToFreight);
}

/**
 * Mapeia uma row da VIEW v_logistics_freights para o tipo Freight do frontend.
 */
function mapViewToFreight(row: any): Freight {
  return {
    id: row.id,
    orderNumber: row.order_number ?? '',
    date: row.date ?? '',
    carrierName: row.carrier_name ?? '',
    driverName: row.driver_name ?? '',
    vehiclePlate: row.vehicle_plate ?? '',
    supplierName: row.supplier_name ?? '',
    originCity: '',
    originState: '',
    destinationCity: row.destination_city ?? '',
    destinationState: '',
    product: row.product ?? '',
    weight: Number(row.weight ?? 0),
    unit: (row.unit ?? 'SC') as 'KG' | 'TON' | 'SC',
    unloadWeightKg: row.unload_weight_kg != null ? Number(row.unload_weight_kg) : undefined,
    breakageKg: row.breakage_kg != null ? Number(row.breakage_kg) : undefined,
    freightBase: row.freight_base,
    pricePerUnit: Number(row.price_per_unit ?? 0),
    totalFreight: Number(row.total_freight ?? 0),
    paidValue: Number(row.paid_value ?? 0),
    advanceValue: Number(row.advance_value ?? 0),
    balanceValue: Number(row.balance_value ?? 0),
    merchandiseValue: Number(row.merchandise_value ?? 0),
    status: (row.status ?? 'in_transit') as FreightStatus,
    financialStatus: (row.financial_status ?? 'pending') as FreightFinancialStatus,
  };
}
