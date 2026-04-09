import { supabase } from '../supabase';
import { db, mapRow, mapTransactionRow } from './store';
import type { Shareholder } from './types';

export const loadFromSupabase = async (): Promise<Shareholder[]> => {
  try {
    const { data, error } = await supabase
      .from('shareholders')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    const mapped = (data || []).map((row) => mapRow(row as any));
    db.setAll(mapped, true);
    return mapped;
  } catch (error) {
    console.error('❌ Erro ao carregar sócios:', error);
    return [];
  }
};

export const getById = async (id: string): Promise<Shareholder | null> => {
  const [{ data: row, error }, { data: txRows, error: txErr }] = await Promise.all([
    supabase.from('shareholders').select('*').eq('id', id).single(),
    supabase.from('shareholder_transactions').select('*').eq('shareholder_id', id).order('date', { ascending: false }),
  ]);

  if (error) throw new Error(`Erro ao buscar sócio: ${error.message}`);
  if (!row) return null;
  if (txErr) throw new Error(`Erro ao buscar transações: ${txErr.message}`);

  return mapRow(row as any, (txRows ?? []).map(mapTransactionRow as any));
};

export const getShareholderTotals = async (shareholderId: string): Promise<{ totalCredits: number; totalDebits: number; balance: number }> => {
  const { data, error } = await supabase.rpc('rpc_shareholder_totals', {
    p_shareholder_id: shareholderId,
  });

  if (error) {
    console.error('[shareholderService] getShareholderTotals RPC error:', error.message);
    return { totalCredits: 0, totalDebits: 0, balance: 0 };
  }

  const result = typeof data === 'string' ? JSON.parse(data) : data;
  return {
    totalCredits: Number(result?.totalCredits ?? 0),
    totalDebits: Number(result?.totalDebits ?? 0),
    balance: Number(result?.balance ?? 0),
  };
};
