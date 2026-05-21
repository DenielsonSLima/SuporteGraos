/**
 * financialRealtimeHub.ts
 *
 * Hub centralizado de Realtime para TODAS as tabelas financeiras.
 *
 * PROBLEMA RESOLVIDO:
 *   Antes, cada submódulo (transfers, accounts, cashier, entries, advances, loans, shareholders)
 *   abria seu próprio canal WebSocket escutando APENAS sua tabela principal.
 *   Quando uma transferência era excluída, o trigger do banco atualizava accounts.balance,
 *   mas o canal de accounts no outro computador podia perder o evento por throttle do Supabase.
 *
 * SOLUÇÃO:
 *   1 único canal WebSocket que escuta TODAS as tabelas financeiras interligadas.
 *   Quando qualquer uma muda, notifica TODOS os listeners registrados.
 *   Debounce de 300ms para agrupar rajadas (ex: exclusão de transferência gera ~3 eventos em <50ms).
 *
 * CONSUMO:
 *   - Hooks chamam `financialRealtimeHub.subscribe(callback)`
 *   - Retorna unsubscribe function
 *   - O canal é criado na primeira subscription e destruído quando a última sai
 */

import { supabase } from './supabase';
import { authService } from './authService';

// Tabelas financeiras que precisam de observação cross-module
const FINANCIAL_TABLES = [
  'transfers',
  'accounts',
  'financial_transactions',
  'financial_entries',
  'advances',
  'loans',
  'shareholders',
  'admin_expenses',
  'ops_loadings',
] as const;

const listeners = new Set<() => void>();
let channel: ReturnType<typeof supabase.channel> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const DEBOUNCE_MS = 300;

function notifyAll(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    listeners.forEach((fn) => fn());
  }, DEBOUNCE_MS);
}

function ensureChannel(): void {
  if (channel) return;

  const companyId = authService.getCurrentUser()?.companyId;

  let ch = supabase.channel('realtime:financial-hub');

  for (const table of FINANCIAL_TABLES) {
    ch = ch.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        ...(companyId ? { filter: `company_id=eq.${companyId}` } : {}),
      },
      notifyAll,
    );
  }

  channel = ch.subscribe();
}

function destroyChannel(): void {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

/**
 * Subscribe to ALL financial realtime changes.
 * Returns an unsubscribe function.
 *
 * Usage:
 * ```ts
 * const unsub = financialRealtimeHub.subscribe(() => {
 *   queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSFERS });
 * });
 * // later:
 * unsub();
 * ```
 */
function subscribe(onAnyChange: () => void): () => void {
  listeners.add(onAnyChange);
  ensureChannel();

  return () => {
    listeners.delete(onAnyChange);
    if (listeners.size === 0) {
      destroyChannel();
    }
  };
}

export const financialRealtimeHub = {
  subscribe,
};
