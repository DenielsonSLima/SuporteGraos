import { supabase } from '../supabase';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../sqlCanonicalOps';
import { vehicleStore } from './store';

export let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

export const vehicleRealtime = {
  startRealtime: () => {
    if (isSqlCanonicalOpsEnabled()) {
      sqlCanonicalOpsLog('vehicleService.startRealtime legado ignorado (modo canônico)');
      return;
    }

    if (realtimeChannel) return;

    realtimeChannel = supabase
      .channel('realtime:vehicles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, (payload) => {
        const rec = payload.new || payload.old;
        if (!rec) return;

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const existing = vehicleStore.getById(rec.id);
          if (existing) vehicleStore.update(rec);
          else vehicleStore.add(rec);
        } else if (payload.eventType === 'DELETE') {
          vehicleStore.delete(rec.id);
        }
      })
      .subscribe();
  },

  stopRealtime: () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  },
};
