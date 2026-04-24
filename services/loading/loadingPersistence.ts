import { Loading } from '../../modules/Loadings/types';
import { supabase } from '../supabase';
import { supabaseWithRetry } from '../../utils/fetchWithRetry';
import { mapLoadingFromDb, generateUUID } from './loadingMapper';
import { getTodayBR } from '../../utils/dateUtils';
import { sqlCanonicalOpsLog } from '../sqlCanonicalOps';

let isLoaded = false;

export const loadingPersistence = {
  isLoaded: () => isLoaded,
  setLoaded: (val: boolean) => { isLoaded = val; },

  loadFromSupabase: async (companyId?: string): Promise<Loading[]> => {
    try {
      let query = supabase
        .from('ops_loadings')
        .select(`
          *,
          purchase_order:ops_purchase_orders(id, legacy_id, number, partner_id, partner_name)
        `);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const data = await supabaseWithRetry(() =>
        query.order('loading_date', { ascending: false })
      );

      const mapped = (data as any[] || []).map(mapLoadingFromDb);
      isLoaded = true;
      return mapped;
    } catch (error) {
      sqlCanonicalOpsLog('Falha ao carregar carregamentos do Supabase', error);
      isLoaded = false;
      return [];
    }
  },

  persistLoading: async (loading: Loading, companyId?: string): Promise<boolean> => {
    // 1. Tentar via RPC (procedimento ideal — SQL-first)
    try {
      const { error } = await supabase.rpc('rpc_ops_loading_upsert_v2', {
        p_payload: loading as any
      });
      if (!error) return true;
    } catch (err) {}

    // 2. Fallback: INSERT/UPSERT direto em ops_loadings
    try {
      const row: Record<string, any> = {
        company_id: companyId,
        legacy_id: loading.id,
        loading_date: loading.date || getTodayBR(),
        purchase_order_id: null,
        weight_kg: loading.weightKg || 0,
        total_purchase_value: loading.totalPurchaseValue || 0,
        total_freight_value: loading.totalFreightValue || 0,
        total_sales_value: loading.totalSalesValue || 0,
        freight_paid: loading.freightPaid || 0,
        product_paid: loading.productPaid || 0,
        freight_advances: loading.freightAdvances || 0,
        status: loading.status || 'in_transit',
        vehicle_plate: loading.vehiclePlate || '',
        driver_name: loading.driverName || '',
        raw_payload: loading,
        metadata: loading,
      };

      if (loading.purchaseOrderId) {
        const { data: poRow } = await supabase
          .from('ops_purchase_orders')
          .select('id')
          .or(`legacy_id.eq.${loading.purchaseOrderId},id.eq.${loading.purchaseOrderId}`)
          .limit(1)
          .maybeSingle();
        if (poRow?.id) row.purchase_order_id = poRow.id;
      }

      const { error } = await supabase.from('ops_loadings').upsert(row, { onConflict: 'company_id,legacy_id' });
      return !error;
    } catch (err) {
      return false;
    }
  },

  deleteLoading: async (loadingId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('rpc_ops_loading_delete_v1', {
        p_legacy_id: loadingId
      });
      if (!error) return true;
    } catch (err) {}

    try {
      const { error } = await supabase
        .from('ops_loadings')
        .delete()
        .or(`legacy_id.eq.${loadingId},id.eq.${loadingId}`);
      return !error;
    } catch (err) {
      return false;
    }
  }
};
