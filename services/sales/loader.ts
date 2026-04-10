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

export interface SalesLoadParams {
  retries?: number;
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
  shareholder?: string;
  statuses?: string[];
}

export interface SalesLoadResult {
  data: SalesOrder[];
  count: number;
}

export const salesLoader = {
  loadFromSupabase: async (params: SalesLoadParams = {}): Promise<SalesLoadResult> => {
    const { 
      retries = 2, 
      page = 1, 
      pageSize = 40, 
      searchTerm, 
      startDate, 
      endDate, 
      shareholder, 
      statuses 
    } = params;
    
    const startTime = performance.now();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    if (isSqlCanonicalOpsEnabled()) {
      try {
        const user = authService.getCurrentUser();
        let query = supabase
          .from('vw_sales_orders_enriched')
          .select('*', { count: 'exact' });

        if (user?.companyId) {
          query = query.eq('company_id', user.companyId);
        }

        if (statuses && statuses.length > 0) {
          query = query.in('status', statuses);
        }

        // --- Filtros Adicionais (Server-side) ---
        if (searchTerm) {
          query = query.or(`number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,customer_nickname.ilike.%${searchTerm}%`);
        }

        if (startDate) {
          query = query.gte('order_date', startDate);
        }

        if (endDate) {
          query = query.lte('order_date', endDate);
        }

        if (shareholder) {
          // Filtra no JSONB metadata se necessário, ou na coluna se existir no view
          query = query.eq('metadata->>consultantName', shareholder);
        }

        const { data, error, count } = await query
          .order('order_date', { ascending: false })
          .range(from, to);
          
        if (error) throw error;

        const fetchTime = performance.now();
        const mapped = (data || []).map(mapOrderFromOpsRow);

        // Enriquecer pedidos com city/state faltando a partir do parceiro
        await salesLoader.enrichAddresses(mapped);
        
        const enrichTime = performance.now();
        console.log(`[salesLoader] Load (Canônico): ${(fetchTime - startTime).toFixed(1)}ms | Page: ${page} | Total: ${count}`);

        salesStore.setAll(mapped);
        return { data: mapped, count: count || 0 };
      } catch (error) {
        sqlCanonicalOpsLog('Falha ao carregar ops_sales_orders (modo canônico)', error);
        return { data: salesStore.get(), count: salesStore.get().length };
      }
    }

    // Modo Legado
    try {
      const user = authService.getCurrentUser();
      let query = supabase
        .from('sales_orders')
        .select('*', { count: 'exact' });

      if (user?.companyId) {
        query = query.eq('company_id', user.companyId);
      }

      if (statuses && statuses.length > 0) {
        query = query.in('status', statuses);
      }

      if (searchTerm) {
        query = query.or(`number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%`);
      }

      if (startDate) query = query.gte('order_date', startDate);
      if (endDate) query = query.lte('order_date', endDate);

      const { data, error, count } = await query
        .order('order_date', { ascending: false })
        .range(from, to);
        
      if (error) throw error;

      const mapped = (data || []).map(mapOrderFromDb);
      
      const legacyTime = performance.now();
      console.log(`[salesLoader] Load (Legado): ${(legacyTime - startTime).toFixed(1)}ms | Page: ${page}`);

      salesStore.setAll(mapped);
      return { data: mapped, count: count || 0 };
    } catch (error) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 1000));
        return salesLoader.loadFromSupabase({ ...params, retries: retries - 1 });
      }
      sqlCanonicalOpsLog('Falha ao carregar sales_orders (modo legado)', error);
      return { data: salesStore.get(), count: salesStore.get().length };
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

