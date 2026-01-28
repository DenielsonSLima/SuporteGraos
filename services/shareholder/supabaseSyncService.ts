import { supabase } from '../supabase';
import { Shareholder, ShareholderTransaction } from './types';

/**
 * Sincronização com Supabase (background, non-blocking)
 */

export const shareholderSupabaseSync = {
  
  syncInsertShareholder: async (shareholder: Shareholder) => {
    try {
      await supabase.from('shareholders').insert({
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
        company_id: null
      });
      console.log(`✅ Sócio ${shareholder.name} salvo no Supabase`);
    } catch (error) {
      console.warn('⚠️ Erro ao salvar sócio no Supabase:', error);
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
      console.log(`✅ Sócio ${shareholder.name} atualizado no Supabase`);
    } catch (error) {
      console.warn('⚠️ Erro ao atualizar sócio no Supabase:', error);
    }
  },

  syncDeleteShareholder: async (id: string) => {
    try {
      await supabase.from('shareholders').delete().eq('id', id);
      console.log(`✅ Sócio excluído do Supabase`);
    } catch (error) {
      console.warn('⚠️ Erro ao excluir sócio do Supabase:', error);
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
        company_id: null
      });
    } catch (error) {
      console.warn('⚠️ Erro ao salvar transação no Supabase:', error);
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
      console.warn('⚠️ Erro ao atualizar transação no Supabase:', error);
    }
  },

  syncDeleteTransaction: async (transactionId: string) => {
    try {
      await supabase.from('shareholder_transactions').delete().eq('id', transactionId);
    } catch (error) {
      console.warn('⚠️ Erro ao excluir transação do Supabase:', error);
    }
  },

  syncUpdateBalance: async (shareholderId: string, currentBalance: number) => {
    try {
      await supabase.from('shareholders').update({
        current_balance: currentBalance
      }).eq('id', shareholderId);
    } catch (error) {
      console.warn('⚠️ Erro ao atualizar saldo no Supabase:', error);
    }
  }
};
