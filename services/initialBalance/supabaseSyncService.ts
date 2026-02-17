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
      console.log(`✅ Saldo inicial para ${balance.accountName} salvo no Supabase`);
    } catch (error) {
      console.error('❌ Erro ao salvar saldo inicial no Supabase:', error);
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
      console.log(`✅ Saldo inicial excluído do Supabase`, data);
    } catch (error) {
      console.warn('⚠️ Erro ao excluir saldo inicial do Supabase:', error);
    }
  }
};
