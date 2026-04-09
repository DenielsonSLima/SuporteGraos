import { supabase } from '../../supabase';

/**
 * FINANCIAL ENTRIES REALTIME
 * Gerencia o canal compartilhado para atualizações em tempo real das obrigações.
 */

let channel: ReturnType<typeof supabase.channel> | null = null;
const listeners = new Set<(entryType: string | undefined) => void>();

const ensureChannel = async () => {
  if (channel) return;

  const { authService } = await import('../../authService');
  const user = authService.getCurrentUser();
  const companyId = user?.companyId;

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
        const changedCompanyId = payload?.new?.company_id ?? payload?.old?.company_id;
        if (!companyId || !changedCompanyId || changedCompanyId === companyId) {
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
