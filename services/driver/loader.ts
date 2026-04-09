import { supabase } from '../supabase';
import { authService } from '../authService';
import { isSqlCanonicalOpsEnabled } from '../sqlCanonicalOps';
import { driverStore } from './store';

export let isLoaded = false;

export const driverLoader = {
  loadFromSupabase: async () => {
    if (isSqlCanonicalOpsEnabled()) {
      driverStore.setAll([]);
      isLoaded = true;
      return;
    }

    try {
      const user = authService.getCurrentUser();
      const companyId = user?.companyId;

      let query = supabase
        .from('drivers')
        // Egress: apenas campos usados pela UI (evita blob de dados pesados)
        .select('id, name, document, phone, license_number, license_category, active, company_id, created_at');

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      driverStore.setAll(data || []);
      isLoaded = true;
    } catch (error) {
      console.error('❌ Erro ao carregar motoristas:', error);
    }
  },

  reload: () => {
    isLoaded = false;
    return driverLoader.loadFromSupabase();
  },
};
