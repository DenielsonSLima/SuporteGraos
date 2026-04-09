/**
 * useCarrierPartners.ts
 *
 * Hook TanStack Query para transportadoras como Partner[] (objetos completos).
 * Diferente de useCarriers (que retorna string[] de nomes para dropdown de filtro),
 * este hook retorna objetos Partner[] com id, name, etc. — necessário nos formulários
 * de Loadings para vincular carrierId + carrierName.
 *
 * ✅ TanStack Query com cache REFERENCE (5min)
 * ✅ Realtime via parceirosService.subscribeRealtime
 * ✅ Reutiliza parceirosService.getPartners com filtro CARRIER
 * ✅ Elimina parceirosService.getPartners() direto em LoadingManagement + LoadingForm
 */

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { QUERY_KEYS, STALE_TIMES } from './queryKeys';
import { parceirosService } from '../services/parceirosService';
import { PARTNER_CATEGORY_IDS } from '../constants';
import { Partner } from '../modules/Partners/types';

// Query key dedicada (sufixo 'objects' para não colidir com CARRIERS que retorna string[])
const CARRIER_PARTNERS_KEY = [...QUERY_KEYS.CARRIERS, 'objects'] as const;

/**
 * Retorna a lista completa de transportadoras como Partner[].
 * Usado nos formulários de carregamento para selecionar transportadora (id + nome).
 */
export function useCarrierPartners() {
  const queryClient = useQueryClient();

  // Realtime: invalida quando parceiros mudam
  useEffect(() => {
    const unsub = parceirosService.subscribeRealtime(() => {
      queryClient.invalidateQueries({ queryKey: CARRIER_PARTNERS_KEY });
    });
    return unsub;
  }, [queryClient]);

    const query = useQuery<Partner[]>({
    queryKey: CARRIER_PARTNERS_KEY,
    queryFn: async () => {
      const result = await parceirosService.getPartners({
        page: 1,
        pageSize: 1000,
        category: PARTNER_CATEGORY_IDS.CARRIER,
        active: true,
      });

      const filtered = (result.data || []).filter((p: Partner) =>
        Array.isArray(p.categories)
          ? p.categories.includes(PARTNER_CATEGORY_IDS.CARRIER)
          : (p as any).partnerTypeId === PARTNER_CATEGORY_IDS.CARRIER
      );
      
      console.log(`[useCarrierPartners] Encontradas ${filtered.length} transportadoras filtradas de ${result.data?.length || 0} retornadas.`);
      
      return filtered;
    },
    staleTime: STALE_TIMES.REFERENCE,
    placeholderData: keepPreviousData,
  });

  return query;
}
