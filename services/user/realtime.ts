import { supabase } from '../supabase';

export const userRealtime = {
  /**
   * Assina mudanças em tempo real na tabela app_users.
   */
  subscribeRealtime: (() => {
    const listeners = new Set<() => void>();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    return (onAnyChange: () => void): (() => void) => {
      listeners.add(onAnyChange);
      if (!channel) {
        channel = supabase
          .channel('realtime:app_users')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'app_users' },
            () => listeners.forEach(fn => fn()),
          )
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
