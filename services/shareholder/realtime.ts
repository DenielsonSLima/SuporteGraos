import { supabase } from '../supabase';
import { loadFromSupabase } from './loader';
import { invalidateDashboardCache } from '../dashboardCache';

let realtimeSubscription: any = null;

export const startRealtime = () => {
  if (realtimeSubscription) return;
  realtimeSubscription = supabase
    .channel('shareholder_all_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shareholders' }, () => {
      loadFromSupabase();
      invalidateDashboardCache();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shareholder_transactions' }, () => {
      loadFromSupabase();
      invalidateDashboardCache();
    })
    .subscribe();
};

export const stopRealtime = () => {
  if (realtimeSubscription) {
    supabase.removeChannel(realtimeSubscription);
    realtimeSubscription = null;
  }
};
