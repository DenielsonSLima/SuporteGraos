import { supabase } from '../supabase';
import { isSqlCanonicalOpsEnabled } from '../sqlCanonicalOps';
import { authService } from '../authService';
import { mapOrderFromDb, mapOrderFromOpsRow } from './mappers';
import { PurchaseOrder } from '../../modules/PurchaseOrder/types';

export interface PurchaseLoadParams {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
  shareholder?: string;
  statuses?: string[];
  companyId?: string;
}

export interface PurchaseLoadResult {
  data: PurchaseOrder[];
  count: number;
}

export const loadFromSupabase = async (params: PurchaseLoadParams = {}): Promise<PurchaseLoadResult> => {
  const {
    page = 1,
    pageSize = 40,
    searchTerm,
    startDate,
    endDate,
    shareholder,
    statuses,
    companyId: manualCompanyId
  } = params;

  // ✅ Auto-resolve companyId if not provided (fixes hook call gap)
  let resolvedCompanyId = manualCompanyId;
  if (!resolvedCompanyId) {
    resolvedCompanyId = authService.getCurrentUser()?.companyId;
  }

  if (!resolvedCompanyId) return { data: [], count: 0 };

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const isCanonical = isSqlCanonicalOpsEnabled();

  if (isCanonical) {
    let query = supabase
      .from('vw_purchase_orders_enriched')
      .select('*', { count: 'exact' })
      .eq('company_id', resolvedCompanyId);

    if (statuses && statuses.length > 0) {
      query = query.in('row_status', statuses);
    }

    if (searchTerm) {
      query = query.or(`number.ilike.%${searchTerm}%,partner_name.ilike.%${searchTerm}%`);
    }

    if (startDate) query = query.gte('order_date', startDate);
    if (endDate) query = query.lte('order_date', endDate);

    if (shareholder) {
      query = query.eq('metadata->>consultantName', shareholder);
    }

    const { data: opsRows, error: opsError, count } = await query
      .order('partner_name', { ascending: true })
      .range(from, to);

    if (!opsError && opsRows) {
      const canonicalOrders = opsRows.map(mapOrderFromOpsRow);
      
      // ✅ Address Enrichment Logic (Canonical Mode)
      try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const partnerIds = [...new Set(canonicalOrders.map(o => o.partnerId))].filter(id => typeof id === 'string' && uuidRegex.test(id));
        if (partnerIds.length > 0) {
          const { data: partners, error: pError } = await supabase
            .from('parceiros_parceiros')
            .select(`
              id,
              address:parceiros_enderecos(
                city:cities(
                  name,
                  state:states(uf)
                )
              )
            `)
            .in('id', partnerIds);

          if (!pError && partners) {
            canonicalOrders.forEach(o => {
              const p = partners.find(ptr => ptr.id === o.partnerId);
              if (p && p.address && p.address.length > 0) {
                const addr = p.address[0] as any;
                const cityName = addr.city?.name || '';
                const stateUf = addr.city?.state?.uf || '';

                o.partnerCity = cityName;
                o.partnerState = stateUf;
                if (!o.loadingCity || !o.loadingState) {
                  o.loadingCity = cityName;
                  o.loadingState = stateUf;
                }
              }
            });
          }
        }
      } catch (enrichError) {
        console.warn('⚠️ Partner enrichment failed:', enrichError);
      }
      
      return { data: canonicalOrders, count: count || 0 };
    }
  }

  // Legacy Fallback
  let query = supabase
    .from('ops_purchase_orders')
    .select('*', { count: 'exact' })
    .eq('company_id', resolvedCompanyId);

  if (statuses && statuses.length > 0) {
    query = query.in('status', statuses);
  }

  if (searchTerm) {
    query = query.or(`number.ilike.%${searchTerm}%,partner_name.ilike.%${searchTerm}%`);
  }

  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);

  const { data, error, count } = await query
    .order('partner_name', { ascending: true })
    .range(from, to);

  if (error) return { data: [], count: 0 };

  const orders = (data || []).map(mapOrderFromDb);
  return { data: orders, count: count || 0 };
};
