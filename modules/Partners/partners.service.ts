// modules/Partners/partners.service.ts
// ============================================================================
// Service do módulo Parceiros (SKILL §9.4: service dentro do módulo)
// Estende o parceirosService com métodos adicionais do módulo.
// ============================================================================

import { parceirosService } from '../../services/parceirosService';
import { supabase } from '../../services/supabase';

/**
 * Verifica duplicidade de documento no servidor (SKILL §3.6: validação no banco).
 */
async function checkDocumentExists(
  document: string,
  excludeId?: string
): Promise<{ exists: boolean; name?: string }> {
  if (!document || document === 'NÃO INFORMADO') return { exists: false };

  let query = supabase
    .from('parceiros_parceiros')
    .select('id, name')
    .eq('document', document)
    .limit(1);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) return { exists: false };
  return { exists: true, name: data[0].name };
}

/**
 * Busca saldos consolidados via RPC atômica (SKILL §13).
 */
async function getPartnerBalances(companyId: string) {
  const { data, error } = await supabase.rpc('get_partner_balances', {
    p_company_id: companyId
  });
  if (error) throw error;
  return data;
}

/**
 * Salva parceiro completo (Dados + Endereço + Categorias) via RPC atômica (SKILL §3.5).
 */
async function savePartnerComplete(payload: {
  partnerId: string | null;
  companyId: string;
  partnerData: any;
  addressData: any;
  categories: string[];
}) {
  const { data, error } = await supabase.rpc('save_partner_complete', {
    p_partner_id: payload.partnerId,
    p_company_id: payload.companyId,
    p_partner_data: payload.partnerData,
    p_address_data: payload.addressData,
    p_categories: payload.categories
  });
  if (error) throw error;
  return data;
}

export const partnersService = {
  ...parceirosService,
  checkDocumentExists,
  getPartnerBalances,
  savePartnerComplete,
};
