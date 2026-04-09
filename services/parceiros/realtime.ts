import { supabase } from '../supabase';

/**
 * PARTNERS REALTIME
 * Gerencia as inscrições em tempo real para o módulo de parceiros.
 */

export const partnersRealtime = {
  subscribe: (() => {
    const listeners = new Set<() => void>();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    return (callback: () => void) => {
      listeners.add(callback);
      if (!channel) {
        channel = supabase
          .channel('realtime:parceiros')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'parceiros_parceiros' }, () => listeners.forEach(fn => fn()))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'parceiros_categorias' }, () => listeners.forEach(fn => fn()))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'parceiros_enderecos' }, () => listeners.forEach(fn => fn()))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'parceiros_motoristas' }, () => listeners.forEach(fn => fn()))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'parceiros_veiculos' }, () => listeners.forEach(fn => fn()))
          .subscribe();
      }
      return () => {
        listeners.delete(callback);
        if (listeners.size === 0 && channel) {
          supabase.removeChannel(channel);
          channel = null;
        }
      };
    };
  })()
};
