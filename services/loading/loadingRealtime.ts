import { supabase } from '../supabase';
import { mapLoadingFromDb } from './loadingMapper';
import { Persistence } from '../persistence';
import { Loading } from '../../modules/Loadings/types';

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
const listeners = new Set<() => void>();

export const loadingRealtime = {
  subscribe: (callback: () => void) => {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },

  start: async (companyId: string | undefined, db: Persistence<Loading>) => {
    if (realtimeChannel) return;

    const tableName = 'ops_loadings';

    realtimeChannel = supabase
      .channel(`realtime:${tableName}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: tableName,
        ...(companyId ? { filter: `company_id=eq.${companyId}` } : {})
      }, (payload) => {
        const rec = payload.new || payload.old;
        if (!rec) return;
        
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const mapped = mapLoadingFromDb(rec);
          const existing = db.getById(mapped.id);
          if (existing) db.update(mapped);
          else db.add(mapped);
        } else if (payload.eventType === 'DELETE') {
          const mappedId = rec.legacy_id || rec.id;
          if (mappedId) db.delete(mappedId);
          if (rec.id && rec.id !== mappedId) db.delete(rec.id);
        }

        // ✅ Notificar todos os hooks (TanStack Query, etc)
        listeners.forEach(callback => callback());
      })
      .subscribe();
  },

  stop: () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    listeners.clear();
  }
};
