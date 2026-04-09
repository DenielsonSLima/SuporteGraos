import { supabase } from '../supabase';
import { db, transformPartnerFromSupabase } from './store';
import { supabaseWithRetry } from '../../utils/fetchWithRetry';
import { locationService } from '../locationService';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../sqlCanonicalOps';
import { parceirosService } from '../parceirosService';

export const loadFromSupabase = async (force: boolean = false): Promise<any[]> => {
  if (force === false && db.getAll().length > 0) return db.getAll();
  try {
    // 🚀 UNIFICADO: Sempre usa o parceirosService que já está configurado para a nova estrutura (parceiros_parceiros)
    const { data } = await parceirosService.getPartners({ page: 1, pageSize: 2000 });
    
    if (data && data.length > 0) {
      db.setAll(data, true);
      sqlCanonicalOpsLog(`partnerLoader: ${data.length} parceiros carregados via parceiros_parceiros`);
      return data;
    } else {
      console.warn('⚠️ partnerLoader: Nenhum parceiro retornado de parceiros_parceiros');
      return [];
    }
  } catch (error) {
    console.error('❌ Erro ao carregar parceiros (loader):', error);
    return db.getAll();
  }
};

export const reload = () => {
  return loadFromSupabase(true);
};
