import { supabase } from '../supabase';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../sqlCanonicalOps';
import { driverStore } from './store';

export let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

export const driverRealtime = {
  startRealtime: () => {
    if (isSqlCanonicalOpsEnabled()) {
      sqlCanonicalOpsLog('driverService.startRealtime legado ignorado (modo canônico)');
      return;
    }

    if (realtimeChannel) return;

    realtimeChannel = supabase
      .channel('realtime:drivers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, (payload) => {
        const rec = payload.new || payload.old;
        if (!rec) return;

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const existing = driverStore.getById(rec.id);
          if (existing) driverStore.update(rec);
          else driverStore.add(rec);
        } else if (payload.eventType === 'DELETE') {
          driverStore.delete(rec.id);
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
