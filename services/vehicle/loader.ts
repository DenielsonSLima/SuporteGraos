import { supabase } from '../supabase';
import { authService } from '../authService';
import { isSqlCanonicalOpsEnabled } from '../sqlCanonicalOps';
import { vehicleStore } from './store';

export let isLoaded = false;

export const vehicleLoader = {
  loadFromSupabase: async () => {
    if (isSqlCanonicalOpsEnabled()) {
      vehicleStore.setAll([]);
      isLoaded = true;
      return;
    }

    try {
      const user = authService.getCurrentUser();
      const companyId = user?.companyId;

      let query = supabase
        .from('vehicles')
        // Egress: apenas campos usados pela UI
        .select('id, plate, model, brand, type, capacity_kg, active, company_id, created_at');

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query.order('plate');

      if (error) throw error;
      vehicleStore.setAll(data || []);

      isLoaded = true;
    } catch (error) {
      console.error('[vehicleService] loadFromSupabase:', error);
    }
  },

  reload: () => {
    isLoaded = false;
    return vehicleLoader.loadFromSupabase();
  },
};
