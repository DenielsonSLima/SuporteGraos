import { supabase } from '../supabase';

export const advancesRealtime = {
  /**
   * Assina mudanças em tempo real na tabela advances.
   */
  subscribeRealtime: (() => {
    const listeners = new Set<() => void>();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    return (onAnyChange: () => void): (() => void) => {
      listeners.add(onAnyChange);
      if (!channel) {
        channel = supabase
          .channel('realtime:advances')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'advances' }, () => listeners.forEach(fn => fn()))
          .subscribe();
      }
      return () => {
        listeners.delete(onAnyChange);
        if (listeners.size === 0 && channel) { 
          supabase.removeChannel(channel); 
          channel = null; 
        }
      };
    };
  })(),
};
