import { supabase } from '../supabase';
import { isSqlCanonicalOpsEnabled } from '../sqlCanonicalOps';
import { authService } from '../authService';
import { mapOrderFromDb, mapOrderFromOpsRow } from './mappers';
import { PurchaseOrder } from '../../modules/PurchaseOrder/types';

export const loadFromSupabase = async (companyId?: string): Promise<PurchaseOrder[]> => {
  // ✅ Auto-resolve companyId if not provided (fixes hook call gap)
  let resolvedCompanyId = companyId;
  if (!resolvedCompanyId) {
    resolvedCompanyId = authService.getCurrentUser()?.companyId;
  }

  if (!resolvedCompanyId) return [];

  const isCanonical = isSqlCanonicalOpsEnabled();

  if (isCanonical) {
    const { data: opsRows, error: opsError } = await supabase
      .from('vw_purchase_orders_enriched')
      // Egress: limita aos 300 pedidos mais recentes (histórico via filtro de período)
      .select('*')
      .eq('company_id', resolvedCompanyId)
      .order('created_at', { ascending: false })
      .limit(300);

    if (!opsError && opsRows) {
      const canonicalOrders = opsRows.map(mapOrderFromOpsRow);
      
      // ✅ Address Enrichment Logic (Canonical Mode)
      try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const partnerIds = [...new Set(canonicalOrders.map(o => o.partnerId))].filter(id => typeof id === 'string' && uuidRegex.test(id));
        if (partnerIds.length > 0) {
          // 🚀 Usando a nova estrutura de tabelas diretamente
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
                const addr = p.address[0] as any; // Pega o primeiro endereço encontrado
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
        console.warn('⚠️ Partner enrichment failed, continuing with basic order data:', enrichError);
      }
      
      return canonicalOrders;
    }
  }

  // Legacy Fallback
  const { data, error } = await supabase
    .from('ops_purchase_orders')
    // Egress: limita a 300 pedidos mais recentes
    .select('*')
    .eq('company_id', resolvedCompanyId)
    .order('number', { ascending: false })
    .limit(300);

  if (error) return [];

  const orders = (data || []).map(mapOrderFromDb);
  return orders;
};
