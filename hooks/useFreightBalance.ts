so/**
 * useFreightBalance.ts
 *
 * Hook TanStack Query para buscar o saldo canônico de frete de um carregamento.
 * SKIL §5.4: balance computado no banco via financial_entries — não no frontend.
 *
 * RPC: rpc_loading_freight_paid_from_entries (definida em 20260304_logistics_sql_canonical.sql)
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { QUERY_KEYS } from './queryKeys';
import { supabase } from '../services/supabase';

export interface FreightBalanceData {
  paidAmount: number;
  discountAmount: number;
  totalAmount: number;
  balance: number;
}

async function fetchFreightBalance(loadingId: string): Promise<FreightBalanceData> {
  const { data, error } = await supabase.rpc('rpc_loading_freight_paid_from_entries', {
    p_loading_id: loadingId,
  });

  if (error) {
    console.warn('[useFreightBalance] RPC error:', error.message);
    return { paidAmount: 0, discountAmount: 0, totalAmount: 0, balance: 0 };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { paidAmount: 0, discountAmount: 0, totalAmount: 0, balance: 0 };

  return {
    paidAmount: Number(row.paid_amount ?? 0),
    discountAmount: Number(row.discount_amount ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    balance: Number(row.balance ?? 0),
  };
}

/**
 * Retorna o saldo de frete canônico de um carregamento (via financial_entries).
 * Quando disponível, este valor tem precedência sobre computeFreightSummary.
 */
export function useFreightBalance(loadingId: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEYS.FREIGHTS, 'balance', loadingId],
    queryFn: () => fetchFreightBalance(loadingId!),
    enabled: !!loadingId,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}
