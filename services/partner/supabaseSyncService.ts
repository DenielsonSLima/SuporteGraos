import { supabase } from '../supabase';
import { Partner } from '../../modules/Partners/types';

/**
 * Sincronização com Supabase - apenas PARCEIRO
 * Endereços são gerenciados separadamente pelo partnerAddressService
 */

export const partnerSupabaseSync = {
  
  syncInsertPartner: async (partner: Partner, supabasePartner: any) => {
    // 1. Inserir parceiro
    const { data: savedPartner, error: partnerError } = await supabase
      .from('partners')
      .insert(supabasePartner)
      .select()
      .single();
    
    if (partnerError) {
      throw partnerError;
    }

    return savedPartner;
  },

  syncUpdatePartner: async (partner: Partner, supabasePartner: any) => {
    // Atualizar parceiro
    const { error: partnerError } = await supabase
      .from('partners')
      .update(supabasePartner)
      .eq('id', partner.id);
    
    if (partnerError) {
      throw partnerError;
    }
  },

  syncDeletePartner: async (id: string) => {
    const { error } = await supabase.from('partners').delete().eq('id', id);
    if (error) {
      throw error;
    }
  }
};
