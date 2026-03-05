import { supabase } from '../supabase';
import { authService } from '../authService';
import { BankAccount } from '../../modules/Financial/types';

export const bankAccountSupabaseSync = {
  syncInsertAccount: async (account: BankAccount) => {
    try {
      const { error } = await supabase
        .from('contas_bancarias')
        .insert({
          id: account.id,
          bank_name: account.bankName,
          owner: account.owner || null,
          agency: account.agency || null,
          account_number: account.accountNumber || null,
          active: account.active !== false,
          company_id: authService.getCurrentUser()?.companyId || null
        });
      if (error) throw error;
    } catch (error) {
    }
  },

  syncUpdateAccount: async (account: BankAccount) => {
    try {
      const { error } = await supabase
        .from('contas_bancarias')
        .update({
          bank_name: account.bankName,
          owner: account.owner || null,
          agency: account.agency || null,
          account_number: account.accountNumber || null,
          active: account.active !== false
        })
        .eq('id', account.id);
      if (error) throw error;
    } catch (error) {
    }
  },

  syncDeleteAccount: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;
    } catch (error) {
    }
  }
};
