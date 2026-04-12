import { supabase } from '../../supabase';
import { authService } from '../../authService';

/**
 * FINANCIAL ENTRIES REALTIME
 * Gerencia o canal compartilhado para atualizações em tempo real das obrigações.
 */

let channel: ReturnType<typeof supabase.channel> | null = null;
const listeners = new Set<(entryType: string | undefined) => void>();

const ensureChannel = async () => {
  if (channel) return;

  channel = supabase
    .channel('realtime:financial_entries')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'financial_entries',
      },
      (payload: any) => {
        // Obter companyId do usuário atual para garantir isolamento robusto
        const currentUser = authService.getCurrentUser();
        const myCompanyId = currentUser?.companyId;

        const changedCompanyId = payload?.new?.company_id ?? payload?.old?.company_id;
        
        // Se não houver companyId no payload ou no usuário, ou se coincidirem, notifica
        if (!myCompanyId || !changedCompanyId || changedCompanyId === myCompanyId) {
          const entryType: string | undefined = payload?.new?.type ?? payload?.old?.type;
          listeners.forEach(cb => cb(entryType));
        }
      },
    )
    .subscribe();
};

export const financialEntriesRealtime = {
  subscribe: (onAnyChange: (entryType: string | undefined) => void): (() => void) => {
    listeners.add(onAnyChange);
    ensureChannel();

    return () => {
      listeners.delete(onAnyChange);
      if (listeners.size === 0 && channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };
  }
};
