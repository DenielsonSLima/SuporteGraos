import { supabase } from '../supabase';
import { authService } from '../authService';
import { Shareholder, ShareholderTransaction } from './types';

/**
 * Sincronização com Supabase (background, non-blocking)
 */

export const shareholderSupabaseSync = {

  syncInsertShareholder: async (shareholder: Shareholder) => {
    try {
      const supabaseData = {
        id: shareholder.id,
        name: shareholder.name,
        cpf: shareholder.cpf || null,
        email: shareholder.email || null,
        phone: shareholder.phone || null,
        address_street: shareholder.address.street || null,
        address_number: shareholder.address.number || null,
        address_neighborhood: shareholder.address.neighborhood || null,
        address_city: shareholder.address.city || null,
        address_state: shareholder.address.state || null,
        address_zip: shareholder.address.zip || null,
        pro_labore_value: shareholder.financial.proLaboreValue,
        current_balance: shareholder.financial.currentBalance,
        last_pro_labore_date: shareholder.financial.lastProLaboreDate || null,
        recurrence_active: shareholder.financial.recurrence?.active || false,
        recurrence_amount: shareholder.financial.recurrence?.amount || 0,
        recurrence_day: shareholder.financial.recurrence?.day || 1,
        recurrence_last_generated_month: shareholder.financial.recurrence?.lastGeneratedMonth || null,
        company_id: authService.getCurrentUser()?.companyId || null
      };

      await supabase.from('shareholders').insert(supabaseData);
    } catch (error) {
    }
  },

  syncUpdateShareholder: async (shareholder: Shareholder) => {
    try {
      await supabase.from('shareholders').update({
        name: shareholder.name,
        cpf: shareholder.cpf || null,
        email: shareholder.email || null,
        phone: shareholder.phone || null,
        address_street: shareholder.address.street || null,
        address_number: shareholder.address.number || null,
        address_neighborhood: shareholder.address.neighborhood || null,
        address_city: shareholder.address.city || null,
        address_state: shareholder.address.state || null,
        address_zip: shareholder.address.zip || null,
        pro_labore_value: shareholder.financial.proLaboreValue,
        current_balance: shareholder.financial.currentBalance,
        last_pro_labore_date: shareholder.financial.lastProLaboreDate || null,
        recurrence_active: shareholder.financial.recurrence?.active || false,
        recurrence_amount: shareholder.financial.recurrence?.amount || 0,
        recurrence_day: shareholder.financial.recurrence?.day || 1,
        recurrence_last_generated_month: shareholder.financial.recurrence?.lastGeneratedMonth || null
      }).eq('id', shareholder.id);
    } catch (error) {
    }
  },

  syncDeleteShareholder: async (id: string) => {
    try {
      await supabase.from('shareholders').delete().eq('id', id);
    } catch (error) {
    }
  },

  syncInsertTransaction: async (shareholderId: string, transaction: ShareholderTransaction) => {
    try {
      await supabase.from('shareholder_transactions').insert({
        id: transaction.id,
        shareholder_id: shareholderId,
        date: transaction.date,
        type: transaction.type,
        value: transaction.value,
        description: transaction.description,
        account_name: transaction.accountId || null,
        company_id: authService.getCurrentUser()?.companyId || null
      });
    } catch (error) {
    }
  },

  syncUpdateTransaction: async (shareholderId: string, transaction: ShareholderTransaction) => {
    try {
      await supabase.from('shareholder_transactions').update({
        date: transaction.date,
        type: transaction.type,
        value: transaction.value,
        description: transaction.description,
        account_name: transaction.accountId || null
      }).eq('id', transaction.id);
    } catch (error) {
    }
  },

  syncDeleteTransaction: async (transactionId: string) => {
    try {
      await supabase.from('shareholder_transactions').delete().eq('id', transactionId);
    } catch (error) {
    }
  },

  syncUpdateBalance: async (shareholderId: string, currentBalance: number) => {
    try {
      await supabase.from('shareholders').update({
        current_balance: currentBalance
      }).eq('id', shareholderId);
    } catch (error) {
    }
  }
};
