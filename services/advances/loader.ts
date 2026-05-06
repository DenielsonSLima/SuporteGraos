import { supabase } from '../supabase';
import { Advance } from './types';
import { PartnerAdvanceSummary } from '../../modules/Financial/Advances/types';

export function mapRow(row: any): Advance {
  return {
    id: row.id,
    company_id: row.company_id,
    recipient_id: row.recipient_id,
    recipient_type: row.recipient_type,
    amount: parseFloat(row.amount ?? '0'),
    settled_amount: parseFloat(row.settled_amount ?? '0'),
    remaining_amount: parseFloat(row.remaining_amount ?? '0'),
    description: row.description,
    advance_date: row.advance_date,
    settlement_date: row.settlement_date,
    status: row.status ?? 'open',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const advancesLoader = {
  getAll: async (): Promise<Advance[]> => {
    const { data, error } = await supabase
      .from('advances')
      .select('*')
      .order('advance_date', { ascending: false });
    if (error) throw new Error(`Erro ao buscar adiantamentos: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  getByRecipientType: async (type: 'supplier' | 'client' | 'shareholder'): Promise<Advance[]> => {
    const { data, error } = await supabase
      .from('advances')
      .select('*')
      .eq('recipient_type', type)
      .order('advance_date', { ascending: false });
    if (error) throw new Error(`Erro ao buscar adiantamentos por tipo: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  getOpen: async (): Promise<Advance[]> => {
    const { data, error } = await supabase
      .from('advances')
      .select('*')
      .eq('status', 'open')
      .order('advance_date', { ascending: false });
    if (error) throw new Error(`Erro ao buscar adiantamentos abertos: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  getSummaries: async (): Promise<PartnerAdvanceSummary[]> => {
    const { data, error } = await supabase
      .from('v_advances_summaries')
      .select('*');

    if (error) {
      console.error('Erro ao buscar sumários de adiantamentos:', error);
      return [];
    }

    return (data || []).map(row => ({
      partnerId: row.partner_id,
      partnerName: row.partner_name,
      totalGiven: parseFloat(row.total_given ?? '0'),
      totalTaken: parseFloat(row.total_taken ?? '0'),
      netBalance: parseFloat(row.net_balance ?? '0'),
    }));
  }
};
