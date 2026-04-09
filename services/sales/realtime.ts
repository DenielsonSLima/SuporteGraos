import { supabase } from '../supabase';
import { salesStore } from './store';
import { mapOrderFromOpsRow, mapOrderFromDb } from './mappers';
import { isSqlCanonicalOpsEnabled } from '../sqlCanonicalOps';

/**
 * SALES REALTIME
 * Gerencia as inscrições do Supabase Realtime para Pedidos de Venda.
 *
 * EGRESS: O handler usa payload.new diretamente (sem re-fetch).
 * O Supabase Realtime já entrega o registro completo da tabela base.
 * Para a VIEW enriquecida, aceitamos dados ligeiramente menos enriquecidos
 * no live update — a tela recarrega os dados completos ao abrir o pedido.
 * Isso evita uma query extra por evento realtime que dobrava o egress.
 */

let channel: ReturnType<typeof supabase.channel> | null = null;

export const salesRealtime = {
  start: (companyId: string) => {
    if (channel) return;

    channel = supabase
      .channel('realtime:sales_orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales_orders',
          filter: companyId ? `company_id=eq.${companyId}` : undefined
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            salesStore.delete(payload.old.id);
            return;
          }

          // EGRESS FIX: Usa payload.new diretamente, sem re-fetch à VIEW.
          // O store é atualizado com os dados da tabela base; dados enriquecidos
          // (nome do parceiro, etc) já estão em memória do carregamento anterior.
          if (isSqlCanonicalOpsEnabled()) {
            // Em modo canônico, mapOrderFromOpsRow tenta usar os campos da view;
            // se payload.new vier da tabela base, os campos extras serão undefined
            // (aceitável para o live update — não quebra a listagem)
            const canonical = mapOrderFromOpsRow(payload.new as any);
            if (payload.eventType === 'INSERT') {
              salesStore.add(canonical);
            } else {
              salesStore.update(canonical);
            }
          } else {
            const mapped = mapOrderFromDb(payload.new as any);
            if (payload.eventType === 'INSERT') {
              salesStore.add(mapped);
            } else {
              salesStore.update(mapped);
            }
          }
        }
      )
      .subscribe();
  },

  stop: () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  }
};
