/**
 * SINCRONIZAÇÃO COM SUPABASE - PARTNER ADDRESS
 */

import { supabase } from '../supabase';
import { PartnerAddress, PartnerAddressInput } from './types';

export const partnerAddressSyncService = {
  /**
   * Insere um novo endereço
   */
  syncInsert: async (address: PartnerAddress): Promise<PartnerAddress> => {
    const { data, error } = await supabase
      .from('partner_addresses')
      .insert({
        id: address.id,
        partner_id: address.partner_id,
        street: address.street,
        number: address.number || null,
        complement: address.complement || null,
        neighborhood: address.neighborhood || null,
        city_id: address.city_id || null,
        state_id: address.state_id || null,
        zip_code: address.zip_code || null,
        address_type: address.address_type,
        is_primary: address.is_primary,
        coordinates: address.coordinates || null,
        active: address.active,
        created_at: address.created_at,
        updated_at: address.updated_at
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as PartnerAddress;
  },

  /**
   * Atualiza um endereço existente
   */
  syncUpdate: async (address: PartnerAddress): Promise<PartnerAddress> => {
    const { data, error } = await supabase
      .from('partner_addresses')
      .update({
        street: address.street,
        number: address.number || null,
        complement: address.complement || null,
        neighborhood: address.neighborhood || null,
        city_id: address.city_id || null,
        state_id: address.state_id || null,
        zip_code: address.zip_code || null,
        address_type: address.address_type,
        is_primary: address.is_primary,
        coordinates: address.coordinates || null,
        active: address.active,
        updated_at: new Date().toISOString()
      })
      .eq('id', address.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as PartnerAddress;
  },

  /**
   * Deleta um endereço
   */
  syncDelete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('partner_addresses')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

  },

  /**
   * Carrega todos os endereços de um parceiro
   */
  syncLoadByPartner: async (partnerId: string): Promise<PartnerAddress[]> => {
    const { data, error } = await supabase
      .from('partner_addresses')
      .select('*')
      .eq('partner_id', partnerId)
      .order('is_primary', { ascending: false })
      .order('created_at');

    if (error) {
      throw error;
    }

    return (data || []) as PartnerAddress[];
  }
};
