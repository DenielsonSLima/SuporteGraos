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
    parent_id: row.parent_id,
  };
}

async function enrichWithAccounts(advances: Advance[]): Promise<Advance[]> {
  if (advances.length === 0) return advances;

  const advIds = advances.map(a => a.id);
  const { data: entries } = await supabase
    .from('financial_entries')
    .select('id, origin_id')
    .eq('origin_type', 'advance')
    .in('origin_id', advIds);

  if (entries && entries.length > 0) {
    const entryIds = entries.map(e => e.id);
    
    const { data: txs } = await supabase
      .from('financial_transactions')
      .select('entry_id, account_id, accounts(account_name)')
      .in('entry_id', entryIds);

    if (txs && txs.length > 0) {
      advances.forEach(adv => {
        const entry = entries.find(e => e.origin_id === adv.id);
        if (entry) {
          const tx = txs.find(t => t.entry_id === entry.id);
          if (tx) {
            adv.account_id = tx.account_id;
            adv.account_name = (tx.accounts as any)?.account_name || 'Caixa/Banco';
          }
        }
      });
    }
  }

  return advances;
}

export const advancesLoader = {
  getAll: async (): Promise<Advance[]> => {
    const { data, error } = await supabase
      .from('advances')
      .select('*')
      .is('parent_id', null)
      .order('advance_date', { ascending: false });
    if (error) throw new Error(`Erro ao buscar adiantamentos: ${error.message}`);
    const mapped = (data ?? []).map(mapRow);
    return enrichWithAccounts(mapped);
  },

  getByRecipientType: async (type: 'supplier' | 'client' | 'shareholder'): Promise<Advance[]> => {
    const { data, error } = await supabase
      .from('advances')
      .select('*')
      .eq('recipient_type', type)
      .is('parent_id', null)
      .order('advance_date', { ascending: false });
    if (error) throw new Error(`Erro ao buscar adiantamentos por tipo: ${error.message}`);
    const mapped = (data ?? []).map(mapRow);
    return enrichWithAccounts(mapped);
  },

  getOpen: async (): Promise<Advance[]> => {
    const { data, error } = await supabase
      .from('advances')
      .select('*')
      .eq('status', 'open')
      .is('parent_id', null)
      .order('advance_date', { ascending: false });
    if (error) throw new Error(`Erro ao buscar adiantamentos abertos: ${error.message}`);
    const mapped = (data ?? []).map(mapRow);
    return enrichWithAccounts(mapped);
  },

  /**
   * Busca o adiantamento aberto de um parceiro específico (para vincular como parent_id).
   * Retorna o adiantamento mais antigo com saldo disponível.
   */
  getOpenByRecipient: async (recipientId: string): Promise<Advance | null> => {
    const { data, error } = await supabase
      .from('advances')
      .select('*')
      .eq('recipient_id', recipientId)
      .eq('recipient_type', 'supplier')
      .in('status', ['open', 'partially_settled'])
      .is('parent_id', null)
      .order('advance_date', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return mapRow(data);
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
  },

  getChildren: async (parentId: string): Promise<Advance[]> => {
    const { data, error } = await supabase
      .from('advances')
      .select('*')
      .eq('parent_id', parentId)
      .order('advance_date', { ascending: false });
    if (error) throw new Error(`Erro ao buscar consumos do adiantamento: ${error.message}`);
    const mapped = (data ?? []).map(mapRow);
    return enrichWithAccounts(mapped);
  },

  getActiveTotals: async (searchTerm: string = '', status: string = 'active'): Promise<{
    takenOriginal: number;
    takenSettled: number;
    takenRemaining: number;
    givenOriginal: number;
    givenSettled: number;
    givenRemaining: number;
    countActive: number;
    netBalance: number;
  }> => {
    const { data, error } = await supabase.rpc('rpc_get_advances_active_totals', { p_search: searchTerm, p_status: status });
    if (error) {
      console.error('Erro ao buscar totais de adiantamentos:', error);
      return {
        takenOriginal: 0,
        takenSettled: 0,
        takenRemaining: 0,
        givenOriginal: 0,
        givenSettled: 0,
        givenRemaining: 0,
        countActive: 0,
        netBalance: 0
      };
    }
    return {
      takenOriginal: data?.takenOriginal || 0,
      takenSettled: data?.takenSettled || 0,
      takenRemaining: data?.takenRemaining || 0,
      givenOriginal: data?.givenOriginal || 0,
      givenSettled: data?.givenSettled || 0,
      givenRemaining: data?.givenRemaining || 0,
      countActive: data?.countActive || 0,
      netBalance: data?.netBalance || 0,
    };
  }
};
