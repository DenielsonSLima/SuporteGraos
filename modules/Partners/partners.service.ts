// modules/Partners/partners.service.ts
// ============================================================================
// Service do módulo Parceiros (SKILL §9.4: service dentro do módulo)
// Estende o parceirosService com métodos adicionais do módulo.
// ============================================================================

import { parceirosService } from '../../services/parceirosService';
import { supabase } from '../../services/supabase';

/**
 * Verifica duplicidade de documento no servidor (SKILL §3.6: validação no banco).
 * Substitui a abordagem anterior de buscar 1000 registros no client-side.
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

export const partnersService = {
  ...parceirosService,
  checkDocumentExists,
};
