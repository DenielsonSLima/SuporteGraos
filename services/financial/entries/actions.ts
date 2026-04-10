import { supabase } from '../../supabase';
import { authService } from '../../authService';
import { FinancialEntry, FinancialEntryType, EntryStatus } from './types';
import { mapRow } from './loader';

/**
 * FINANCIAL ENTRIES ACTIONS
 * Implementa as operações de criação e cancelamento de obrigações.
 */

async function getCompanyId(): Promise<string> {
  const companyId = authService.getCurrentUser()?.companyId;
  if (companyId) return companyId;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase.from('app_users').select('company_id').eq('auth_user_id', user.id).single();
  if (error || !data?.company_id) throw new Error('Usuário sem empresa vinculada');
  return data.company_id as string;
}

export const financialEntriesActions = {
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

    if (error) throw new Error(`Erro ao criar entry: ${error.message}`);
    return data.id;
  },

  cancel: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('financial_entries')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) throw new Error(`Erro ao cancelar entry: ${error.message}`);
  },

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

    if (error) throw new Error(`Erro ao buscar ${type} com status ${status}: ${error.message}`);
    return (data ?? []).map(mapRow);
  },

  getTotalsByType: async (
    type: FinancialEntryType,
    startDate?: string,
    endDate?: string,
  ): Promise<{ total: number; paid: number; remaining: number }> => {
    const { data, error } = await supabase.rpc('rpc_financial_entry_totals_by_type', { 
      p_type: type,
      p_start_date: startDate || null,
      p_end_date: endDate || null
    });
    if (error) throw new Error(`Erro ao buscar totais financeiros via RPC: ${error.message}`);
    
    return {
      total: Number(data?.total ?? 0),
      paid: Number(data?.paid ?? 0),
      remaining: Number(data?.remaining ?? 0),
    };
  }
};
