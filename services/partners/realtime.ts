import { supabase } from '../supabase';
import { db, transformPartnerFromSupabase } from './store';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../sqlCanonicalOps';

let realtimeChannel: any = null;

export const startRealtime = () => {
  if (realtimeChannel) return;

  if (isSqlCanonicalOpsEnabled()) {
    sqlCanonicalOpsLog('partnerService.startRealtime legado ignorado (modo canônico)');
    return;
  }

  realtimeChannel = supabase
    .channel('realtime:partners')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'partners' }, (payload) => {
      const rec = payload.new || payload.old;
      if (!rec) return;

      const transformed = transformPartnerFromSupabase(rec);

      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const existing = db.getById(transformed.id);
        if (existing) db.update(transformed);
        else db.add(transformed);
      } else if (payload.eventType === 'DELETE') {
        db.delete(transformed.id);
      }
    })
    .subscribe();
};

export const stopRealtime = () => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
};
