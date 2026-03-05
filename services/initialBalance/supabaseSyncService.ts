import { supabase } from '../supabase';
import { authService } from '../authService';

export interface InitialBalanceRecord {
  id: string;
  accountId: string;
  accountName: string;
  date: string;
  value: number;
}

export const initialBalanceSupabaseSync = {
  syncInsertBalance: async (balance: InitialBalanceRecord) => {
    try {
      const companyId = authService.getCurrentUser()?.companyId || null;
      const { error } = await supabase.from('initial_balances').insert({
        id: balance.id,
        account_id: balance.accountId,
        account_name: balance.accountName,
        date: balance.date,
        value: balance.value,
        company_id: companyId
      });
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  },

  syncDeleteBalance: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('initial_balances')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;
    } catch (error) {
    }
  }
};
