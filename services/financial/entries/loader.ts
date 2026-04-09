import { supabase } from '../../supabase';
import { 
  FinancialEntry, EnrichedPayableEntry, EnrichedReceivableEntry, 
  OriginType, FinancialEntryType, EntryStatus 
} from './types';

/**
 * FINANCIAL ENTRIES LOADER
 * Responsável por carregar dados das VIEWs enriquecidas e mapear para o frontend.
 */

export const PAYABLES_VIEW_SELECT = `
  id, company_id, type, origin_type, origin_id, partner_id, 
  total_amount, paid_amount, remaining_amount, deductions_amount, net_amount,
  status, due_date, created_date, created_at, updated_at,
  partner_name, order_number, order_partner_name, load_count,
  total_weight_kg, total_weight_ton, total_weight_sc, agg_purchase_value, unit_price_sc,
  freight_vehicle_plate, freight_driver_name, freight_weight_kg,
  freight_weight_ton, freight_total_value, freight_price_per_ton
`.replace(/\s+/g, ' ').trim();

export const RECEIVABLES_VIEW_SELECT = `
  id, company_id, type, origin_type, origin_id, partner_id,
  total_amount, paid_amount, remaining_amount, deductions_amount, net_amount,
  status, due_date, created_date, created_at, updated_at,
  partner_name, sales_order_number, sales_order_id,
  loading_weight_kg, loading_weight_ton, loading_weight_sc,
  loading_sales_value, unit_price_sc
`.replace(/\s+/g, ' ').trim();

export interface FinancialFilterParams {
  startDate?: string;
  endDate?: string;
  partnerId?: string;
  page?: number;
  pageSize?: number;
  search?: string;
}


// Mapeador: snake_case (DB) → camelCase (Frontend)
export function mapRow(row: any): FinancialEntry {
  const origin = row.origin_type as OriginType | undefined;
  return {
    id: row.id,
    company_id: row.company_id,
    type: row.type,
    origin_type: origin,
    origin_id: row.origin_id,
    partner_id: row.partner_id,
    total_amount: parseFloat(row.total_amount ?? '0'),
    paid_amount: parseFloat(row.paid_amount ?? '0'),
    remaining_amount: parseFloat(row.remaining_amount ?? '0'),
    deductions_amount: parseFloat(row.deductions_amount ?? '0'),
    net_amount: parseFloat(row.net_amount ?? '0'),
    status: row.status as EntryStatus,
    created_date: row.created_date,
    due_date: row.due_date,
    paid_date: row.paid_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Mapeador: VIEW vw_payables_enriched → EnrichedPayableEntry
export function mapPayableRow(row: any): EnrichedPayableEntry {
  return {
    ...mapRow(row),
    partner_name: row.partner_name ?? 'Parceiro',
    order_number: row.order_number ?? undefined,
    order_partner_name: row.order_partner_name ?? undefined,
    load_count: parseInt(row.load_count ?? '0', 10),
    total_weight_kg: parseFloat(row.total_weight_kg ?? '0'),
    total_weight_ton: parseFloat(row.total_weight_ton ?? '0'),
    total_weight_sc: parseFloat(row.total_weight_sc ?? '0'),
    agg_purchase_value: parseFloat(row.agg_purchase_value ?? '0'),
    unit_price_sc: parseFloat(row.unit_price_sc ?? '0'),
    freight_vehicle_plate: row.freight_vehicle_plate ?? undefined,
    freight_driver_name: row.freight_driver_name ?? undefined,
    freight_weight_kg: row.freight_weight_kg != null ? parseFloat(row.freight_weight_kg) : undefined,
    freight_weight_ton: row.freight_weight_ton != null ? parseFloat(row.freight_weight_ton) : undefined,
    freight_total_value: row.freight_total_value != null ? parseFloat(row.freight_total_value) : undefined,
    freight_price_per_ton: row.freight_price_per_ton != null ? parseFloat(row.freight_price_per_ton) : undefined,
  };
}

// Mapeador: VIEW vw_receivables_enriched → EnrichedReceivableEntry
export function mapReceivableRow(row: any): EnrichedReceivableEntry {
  return {
    ...mapRow(row),
    partner_name: row.partner_name ?? 'Cliente',
    sales_order_number: row.sales_order_number ?? undefined,
    sales_order_id: row.sales_order_id ?? undefined,
    loading_weight_kg: row.loading_weight_kg != null ? parseFloat(row.loading_weight_kg) : undefined,
    loading_weight_ton: row.loading_weight_ton != null ? parseFloat(row.loading_weight_ton) : undefined,
    loading_weight_sc: row.loading_weight_sc != null ? parseFloat(row.loading_weight_sc) : undefined,
    loading_sales_value: row.loading_sales_value != null ? parseFloat(row.loading_sales_value) : undefined,
    unit_price_sc: row.unit_price_sc != null ? parseFloat(row.unit_price_sc) : undefined,
  };
}

export const financialEntriesLoader = {
  getPayables: async (params?: FinancialFilterParams): Promise<EnrichedPayableEntry[]> => {
    let query = supabase
      .from('vw_payables_enriched')
      .select(PAYABLES_VIEW_SELECT);

    // Filtros de Servidor (EGRESS SAVER)
    if (params?.startDate) query = query.gte('due_date', params.startDate);
    if (params?.endDate) query = query.lte('due_date', params.endDate);
    if (params?.partnerId) query = query.eq('partner_id', params.partnerId);
    
    // Paginação
    const page = params?.page ?? 0;
    const pageSize = params?.pageSize ?? 100; // Aumentado para 100 por ser financeiro
    const from = page * pageSize;
    const to = from + pageSize - 1;

    console.group(`[getPayables] Fetching records`);
    console.log('Params:', params);
    
    const { data, error } = await query
      .order('due_date', { ascending: true })
      .range(from, to);

    if (error) {
      console.error(`[getPayables] Error fetching from view: ${error.message}`, error);
        console.warn('[getPayables] Falling back to financial_entries table');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('financial_entries')
          .select('*')
          .eq('type', 'payable')
          .not('status', 'in', '("cancelled","reversed")')
          .order('due_date', { ascending: true })
          .range(from, to);
        
        if (fallbackError) {
          console.error('[getPayables] Fallback also failed:', fallbackError);
          console.groupEnd();
          throw new Error(`Erro ao buscar contas a pagar (fallback): ${fallbackError.message}`);
        }
        
        // No fallback, tentamos buscar o nome do parceiro via partners para não mostrar UUID
        const partnerIds = [...new Set((fallbackData ?? []).map(r => r.partner_id).filter(Boolean))];
        let partnerMap: Record<string, string> = {};
        
        if (partnerIds.length > 0) {
          const { data: partners } = await supabase
            .from('parceiros_parceiros')
            .select('id, name')
            .in('id', partnerIds);
          
          partnerMap = (partners ?? []).reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {});
        }

        const mappedFallback = (fallbackData ?? []).map(r => ({ 
          ...mapRow(r), 
          partner_name: partnerMap[r.partner_id] || r.partner_id?.substring(0, 8) || 'Parceiro', 
          load_count: 0, 
          total_weight_kg: 0, 
          total_weight_ton: 0, 
          total_weight_sc: 0, 
          agg_purchase_value: 0, 
          unit_price_sc: 0 
        }));
        
        console.log(`[getPayables] Fallback returned ${mappedFallback.length} records`);
        console.groupEnd();
        return mappedFallback as EnrichedPayableEntry[];
    }

    const mappedData = (data ?? []).map(mapPayableRow);
    console.log(`[getPayables] View returned ${mappedData.length} records:`, mappedData);
    console.groupEnd();
    return mappedData;
  },

  getReceivables: async (params?: FinancialFilterParams): Promise<EnrichedReceivableEntry[]> => {
    let query = supabase
      .from('vw_receivables_enriched')
      .select(RECEIVABLES_VIEW_SELECT);

    // Filtros de Servidor
    if (params?.startDate) query = query.gte('due_date', params.startDate);
    if (params?.endDate) query = query.lte('due_date', params.endDate);
    if (params?.partnerId) query = query.eq('partner_id', params.partnerId);

    // Paginação
    const page = params?.page ?? 0;
    const pageSize = params?.pageSize ?? 100;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await query
      .order('due_date', { ascending: true })
      .range(from, to);

    if (error) {
      console.error(`[getReceivables] Error fetching from view: ${error.message}`);
      if (error.message?.includes('vw_receivables_enriched')) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('financial_entries')
          .select('*')
          .eq('type', 'receivable')
          .order('due_date', { ascending: true })
          .range(from, to);
        if (fallbackError) throw new Error(`Erro ao buscar contas a receber (fallback): ${fallbackError.message}`);
        return (fallbackData ?? []).map(r => ({ ...mapRow(r), partner_name: r.partner_id?.substring(0, 8) || 'Cliente' }));
      }
      throw new Error(`Erro ao buscar contas a receber: ${error.message}`);
    }
    console.info(`[getReceivables] Successfully fetched ${data?.length || 0} records from view.`);
    return (data ?? []).map(mapReceivableRow);
  },

  getById: async (id: string): Promise<FinancialEntry | null> => {
    const { data, error } = await supabase
      .from('financial_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar entry: ${error.message}`);
    }
    return data ? mapRow(data) : null;
  },

  getByOrigin: async (originType: OriginType, originId: string): Promise<FinancialEntry[]> => {
    const { data, error } = await supabase
      .from('financial_entries')
      .select('*')
      .eq('origin_type', originType)
      .eq('origin_id', originId);

    if (error) throw new Error(`Erro ao buscar entries por origem: ${error.message}`);
    return (data ?? []).map(mapRow);
  }
};
