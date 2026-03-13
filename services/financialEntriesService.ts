// services/financialEntriesService.ts
// ============================================================================
// Service para gerenciar obrigações (Contas a Pagar e Contas a Receber)
// ============================================================================
// Padrão: Uma tabela (financial_entries), dois tipos (payable/receivable)
// RLS filtra por empresa automáticamente
// ============================================================================

import { supabase } from './supabase';


export type FinancialEntryType = 'payable' | 'receivable';
export type OriginType =
  | 'purchase_order'
  | 'sales_order'
  | 'commission'
  | 'expense'
  | 'loan'
  | 'advance'
  | 'transfer'
  | 'credit'
  | 'freight';

export type EntryStatus = 'open' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'reversed';

export interface FinancialEntry {
  id: string;
  company_id: string;
  type: FinancialEntryType;
  origin_type?: OriginType;
  origin_id?: string;
  partner_id: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  deductions_amount?: number;
  net_amount?: number;
  status: EntryStatus;
  created_date: string;
  due_date?: string;
  paid_date?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Interfaces enriquecidas — vindas das VIEWs SQL (zero cálculo no frontend)
// ============================================================================

export interface EnrichedPayableEntry extends FinancialEntry {
  partner_name: string;
  order_number?: string;
  order_partner_name?: string;
  load_count: number;
  total_weight_kg: number;
  total_weight_ton: number;
  total_weight_sc: number;
  agg_purchase_value: number;
  unit_price_sc: number;
  freight_vehicle_plate?: string;
  freight_driver_name?: string;
  freight_weight_kg?: number;
  freight_weight_ton?: number;
  freight_total_value?: number;
  freight_price_per_ton?: number;
}

export interface EnrichedReceivableEntry extends FinancialEntry {
  partner_name: string;
  sales_order_number?: string;
  sales_order_id?: string;
  loading_weight_kg?: number;
  loading_weight_ton?: number;
  loading_weight_sc?: number;
  loading_sales_value?: number;
  unit_price_sc?: number;
}

// Mapeador: snake_case (DB) → camelCase (Frontend)
function mapRow(row: any): FinancialEntry {
  const origin = row.origin_type as OriginType | undefined;
  return {
    id: row.id,
    company_id: row.company_id,
    type: row.type,
    origin_type: origin,
    origin_id: row.origin_id,
    partner_id: row.partner_id,
    total_amount: parseFloat(row.total_amount ?? '0'),
    paid_amount: parseFloat(row.paid_amount ?? '0'),
    remaining_amount: parseFloat(row.remaining_amount ?? '0'),
    deductions_amount: parseFloat(row.deductions_amount ?? '0'),
    net_amount: parseFloat(row.net_amount ?? '0'),
    status: row.status,
    created_date: row.created_date,
    due_date: row.due_date,
    paid_date: row.paid_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Mapeador: VIEW vw_payables_enriched → EnrichedPayableEntry
function mapPayableRow(row: any): EnrichedPayableEntry {
  return {
    ...mapRow(row),
    partner_name: row.partner_name ?? 'Parceiro',
    order_number: row.order_number ?? undefined,
    order_partner_name: row.order_partner_name ?? undefined,
    load_count: parseInt(row.load_count ?? '0', 10),
    total_weight_kg: parseFloat(row.total_weight_kg ?? '0'),
    total_weight_ton: parseFloat(row.total_weight_ton ?? '0'),
    total_weight_sc: parseFloat(row.total_weight_sc ?? '0'),
    agg_purchase_value: parseFloat(row.agg_purchase_value ?? '0'),
    unit_price_sc: parseFloat(row.unit_price_sc ?? '0'),
    freight_vehicle_plate: row.freight_vehicle_plate ?? undefined,
    freight_driver_name: row.freight_driver_name ?? undefined,
    freight_weight_kg: row.freight_weight_kg != null ? parseFloat(row.freight_weight_kg) : undefined,
    freight_weight_ton: row.freight_weight_ton != null ? parseFloat(row.freight_weight_ton) : undefined,
    freight_total_value: row.freight_total_value != null ? parseFloat(row.freight_total_value) : undefined,
    freight_price_per_ton: row.freight_price_per_ton != null ? parseFloat(row.freight_price_per_ton) : undefined,
  };
}

// Mapeador: VIEW vw_receivables_enriched → EnrichedReceivableEntry
function mapReceivableRow(row: any): EnrichedReceivableEntry {
  return {
    ...mapRow(row),
    partner_name: row.partner_name ?? 'Cliente',
    sales_order_number: row.sales_order_number ?? undefined,
    sales_order_id: row.sales_order_id ?? undefined,
    loading_weight_kg: row.loading_weight_kg != null ? parseFloat(row.loading_weight_kg) : undefined,
    loading_weight_ton: row.loading_weight_ton != null ? parseFloat(row.loading_weight_ton) : undefined,
    loading_weight_sc: row.loading_weight_sc != null ? parseFloat(row.loading_weight_sc) : undefined,
    loading_sales_value: row.loading_sales_value != null ? parseFloat(row.loading_sales_value) : undefined,
    unit_price_sc: row.unit_price_sc != null ? parseFloat(row.unit_price_sc) : undefined,
  };
}

// Helper: busca company_id
async function getCompanyId(): Promise<string> {
  const { data, error } = await supabase
    .from('app_users')
    .select('company_id')
    .single();
  if (error || !data?.company_id)
    throw new Error('Usuário sem empresa vinculada');
  return data.company_id as string;
}

export const financialEntriesService = {
  // LEITURA — Contas a Pagar via VIEW enriquecida (SQL faz os JOINs)
  getPayables: async (): Promise<EnrichedPayableEntry[]> => {
    const { data, error } = await supabase
      .from('vw_payables_enriched')
      .select('*')
      .order('due_date', { ascending: true });

    if (error) {
      // Fallback: se a VIEW não existir ainda, usa tabela base
      if (error.message?.includes('vw_payables_enriched')) {
        console.warn('[financialEntriesService] VIEW vw_payables_enriched não encontrada, usando fallback');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('financial_entries')
          .select('*')
          .eq('type', 'payable')
          .order('due_date', { ascending: true });
        if (fallbackError) throw new Error(`Erro ao buscar contas a pagar: ${fallbackError.message}`);
        return (fallbackData ?? []).map(r => ({ ...mapRow(r), partner_name: r.partner_id?.substring(0, 8) || 'Parceiro', load_count: 0, total_weight_kg: 0, total_weight_ton: 0, total_weight_sc: 0, agg_purchase_value: 0, unit_price_sc: 0 }));
      }
      throw new Error(`Erro ao buscar contas a pagar: ${error.message}`);
    }
    return (data ?? []).map(mapPayableRow);
  },

  // LEITURA — Contas a Receber via VIEW enriquecida (SQL faz os JOINs)
  getReceivables: async (): Promise<EnrichedReceivableEntry[]> => {
    const { data, error } = await supabase
      .from('vw_receivables_enriched')
      .select('*')
      .order('due_date', { ascending: true });

    if (error) {
      // Fallback: se a VIEW não existir ainda, usa tabela base
      if (error.message?.includes('vw_receivables_enriched')) {
        console.warn('[financialEntriesService] VIEW vw_receivables_enriched não encontrada, usando fallback');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('financial_entries')
          .select('*')
          .eq('type', 'receivable')
          .order('due_date', { ascending: true });
        if (fallbackError) throw new Error(`Erro ao buscar contas a receber: ${fallbackError.message}`);
        return (fallbackData ?? []).map(r => ({ ...mapRow(r), partner_name: r.partner_id?.substring(0, 8) || 'Cliente' }));
      }
      throw new Error(`Erro ao buscar contas a receber: ${error.message}`);
    }
    return (data ?? []).map(mapReceivableRow);
  },

  // LEITURA — Filtra por status
  getByStatus: async (
    type: FinancialEntryType,
    status: EntryStatus,
  ): Promise<FinancialEntry[]> => {
    const { data, error } = await supabase
      .from('financial_entries')
      .select('*')
      .eq('type', type)
      .eq('status', status)
      .order('due_date', { ascending: true });

    if (error)
      throw new Error(
        `Erro ao buscar ${type} com status ${status}: ${error.message}`,
      );
    return (data ?? []).map(mapRow);
  },

  // LEITURA — Busca por ID
  getById: async (id: string): Promise<FinancialEntry | null> => {
    const { data, error } = await supabase
      .from('financial_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erro ao buscar entry: ${error.message}`);
    }
    return data ? mapRow(data) : null;
  },

  // LEITURA — Busca por origem (ex: despesa, pedido)
  getByOrigin: async (originType: OriginType, originId: string): Promise<FinancialEntry[]> => {
    const { data, error } = await supabase
      .from('financial_entries')
      .select('*')
      .eq('origin_type', originType)
      .eq('origin_id', originId);

    if (error) throw new Error(`Erro ao buscar entries por origem: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  // LEITURA — Totais por tipo (SQL aggregate via RPC, zero reduce no browser)
  getTotalsByType: async (
    type: FinancialEntryType,
  ): Promise<{
    total: number;
    paid: number;
    remaining: number;
  }> => {
    const { data, error } = await supabase.rpc(
      'rpc_financial_entry_totals_by_type',
      { p_type: type },
    );

    if (error) {
      throw new Error(
        `Erro ao buscar totais financeiros via RPC (rpc_financial_entry_totals_by_type): ${error.message}`,
      );
    }

    return {
      total: Number(data?.total ?? 0),
      paid: Number(data?.paid ?? 0),
      remaining: Number(data?.remaining ?? 0),
    };
  },

  // INSERÇÃO — Criar nova entry (chamado normalmente por RPC)
  add: async (
    entry: Omit<
      FinancialEntry,
      'id' | 'company_id' | 'paid_amount' | 'remaining_amount' | 'status' | 'paid_date' | 'created_at' | 'updated_at'
    >,
  ): Promise<string> => {
    const companyId = await getCompanyId();
    const { data, error } = await supabase
      .from('financial_entries')
      .insert({
        company_id: companyId,
        type: entry.type,
        origin_type: entry.origin_type,
        origin_id: entry.origin_id,
        partner_id: entry.partner_id,
        total_amount: entry.total_amount,
        created_date: entry.created_date,
        due_date: entry.due_date,
      })
      .select('id')
      .single();

    if (error)
      throw new Error(`Erro ao criar entry: ${error.message}`);
    return data.id;
  },

  // CANCELAR entry
  cancel: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('financial_entries')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) throw new Error(`Erro ao cancelar entry: ${error.message}`);
  },

  // REALTIME — Canal compartilhado (singleton) para evitar duplicação
  // Múltiplos hooks (usePayables, useReceivables, useEntriesByStatus)
  // registram seus callbacks aqui; um único canal despacha para todos.
  // O `entryType` passado ao callback permite que cada hook invalide
  // apenas as queries do seu próprio tipo ('payable' ou 'receivable').
  subscribeRealtime: (() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const listeners = new Set<(entryType: string | undefined) => void>();

    const ensureChannel = async () => {

      const { authService } = await import('./authService');
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
              const entryType: string | undefined =
                payload?.new?.type ?? payload?.old?.type;
              listeners.forEach(cb => cb(entryType));
            }
          },
        )
        .subscribe();
    };

    return (onAnyChange: (entryType: string | undefined) => void): (() => void) => {
      listeners.add(onAnyChange);
      ensureChannel();

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
