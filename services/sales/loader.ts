import { supabase } from '../supabase';
import { authService } from '../authService';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../sqlCanonicalOps';
import { SalesOrder } from '../../modules/SalesOrder/types';
import { mapOrderFromOpsRow, mapOrderFromDb } from './mappers';
import { salesStore } from './store';

/**
 * SALES LOADER
 * Responsável por carregar dados do Supabase e enriquecer o estado local.
 */

// ⚡ CACHE DE ENDEREÇOS: Persiste entre chamadas para evitar buscas repetitivas
const partnerAddressCache = new Map<string, { city: string; state: string }>();

export const salesLoader = {
  loadFromSupabase: async (retries = 2, filters?: { statuses?: string[] }): Promise<SalesOrder[]> => {
    const startTime = performance.now();
    
    if (isSqlCanonicalOpsEnabled()) {
      try {
        const user = authService.getCurrentUser();
        let query = supabase
          .from('vw_sales_orders_enriched')
          .select('*');

        if (user?.companyId) {
          query = query.eq('company_id', user.companyId);
        }

        if (filters?.statuses && filters.statuses.length > 0) {
          query = query.in('status', filters.statuses);
        }

        const { data, error } = await query
          .order('order_date', { ascending: false })
          // Egress: limita aos 300 pedidos mais recentes
          .limit(300);
        if (error) throw error;

        const fetchTime = performance.now();
        const mapped = (data || []).map(mapOrderFromOpsRow);

        // Enriquecer pedidos com city/state faltando a partir do parceiro
        await salesLoader.enrichAddresses(mapped);
        
        const enrichTime = performance.now();
        console.log(`[salesLoader] Load (Canônico): ${(fetchTime - startTime).toFixed(1)}ms | Enrich: ${(enrichTime - fetchTime).toFixed(1)}ms | Total: ${(enrichTime - startTime).toFixed(1)}ms`);

        salesStore.setAll(mapped);
        return mapped;
      } catch (error) {
        sqlCanonicalOpsLog('Falha ao carregar ops_sales_orders (modo canônico)', error);
        return salesStore.get();
      }
    }

    // Modo Legado
    try {
      const user = authService.getCurrentUser();
      let query = supabase
        .from('sales_orders')
        .select('*');

      if (user?.companyId) {
        query = query.eq('company_id', user.companyId);
      }

      if (filters?.statuses && filters.statuses.length > 0) {
        query = query.in('status', filters.statuses);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        // Egress: limita aos 300 pedidos mais recentes
        .limit(300);
      if (error) throw error;

      const mapped = (data || []).map(mapOrderFromDb);
      
      const legacyTime = performance.now();
      console.log(`[salesLoader] Load (Legado): ${(legacyTime - startTime).toFixed(1)}ms`);

      salesStore.setAll(mapped);
      return mapped;
    } catch (error) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 1000));
        return salesLoader.loadFromSupabase(retries - 1, filters);
      }
      sqlCanonicalOpsLog('Falha ao carregar sales_orders (modo legado)', error);
      return salesStore.get();
    }
  },

  enrichAddresses: async (orders: SalesOrder[]) => {
    // 1. Filtrar apenas quem precisa de endereço E não está no cache
    const missingInCache = orders.filter(o => 
      o.customerId && 
      (!o.customerCity || !o.customerState) && 
      !partnerAddressCache.has(o.customerId)
    );

    // 2. Aplicar o que já temos no cache primeiro
    for (const order of orders) {
      if (order.customerId && (!order.customerCity || !order.customerState)) {
        const cached = partnerAddressCache.get(order.customerId);
        if (cached) {
          if (!order.customerCity) order.customerCity = cached.city;
          if (!order.customerState) order.customerState = cached.state;
        }
      }
    }

    if (missingInCache.length === 0) return;

    const partnerIds = [...new Set(missingInCache.map(o => o.customerId))];
    try {
      const { data: addrRows } = await supabase
        .from('parceiros_enderecos')
        .select('partner_id, city:cities(name, state:states(uf))')
        .in('partner_id', partnerIds)
        .eq('is_primary', true);

      if (addrRows && addrRows.length > 0) {
        for (const row of addrRows as any) {
          const cityObj = Array.isArray(row.city) ? row.city[0] : row.city;
          const stateObj = cityObj?.state ? (Array.isArray(cityObj.state) ? cityObj.state[0] : cityObj.state) : null;
          
          if (cityObj?.name || stateObj?.uf) {
            const addr = { 
              city: cityObj?.name || '', 
              state: stateObj?.uf || '' 
            };
            
            // Salvar no cache
            partnerAddressCache.set(row.partner_id, addr);

            // Aplicar nos pedidos atuais
            for (const order of orders) {
              if (order.customerId === row.partner_id) {
                if (!order.customerCity) order.customerCity = addr.city;
                if (!order.customerState) order.customerState = addr.state;
              }
            }
          }
        }
      }
    } catch (addrErr) {
      sqlCanonicalOpsLog('Falha ao enriquecer endereço do parceiro em sales orders', addrErr);
    }
  },

  invalidateAddressCache: (partnerId?: string) => {
    if (partnerId) {
      partnerAddressCache.delete(partnerId);
    } else {
      partnerAddressCache.clear();
    }
  }
};

