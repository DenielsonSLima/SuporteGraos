import { supabase } from '../supabase';
import { authService } from '../authService';
import { PartnerAddress, SavePartnerAddressData } from './types';

/**
 * ADDRESSES ACTIONS
 * Gerencia a tabela parceiros_enderecos.
 */

export const addressesActions = {
  mapDatabaseToAddress(dbRow: any): PartnerAddress {
    if (!dbRow) return {} as PartnerAddress;
    const city = Array.isArray(dbRow.city) ? dbRow.city[0] : dbRow.city;
    const state = city?.state ? (Array.isArray(city.state) ? city.state[0] : city.state) : null;

    return {
      id: dbRow.id,
      companyId: dbRow.company_id,
      partnerId: dbRow.partner_id,
      cityId: dbRow.city_id,
      cep: dbRow.cep,
      street: dbRow.street,
      number: dbRow.number,
      neighborhood: dbRow.neighborhood,
      complement: dbRow.complement,
      isPrimary: dbRow.is_primary !== false,
      cityName: city?.name,
      stateUf: state?.uf
    };
  },

  async getAddresses(partnerId: string) {
    const { data, error } = await supabase
      .from('parceiros_enderecos')
      .select(`
        *,
        city:cities(
          name,
          state:states(uf)
        )
      `)
      .eq('partner_id', partnerId)
      .order('is_primary', { ascending: false });

    if (error) throw error;
    return (data || []).map(row => this.mapDatabaseToAddress(row));
  },

  async createAddress(address: Omit<PartnerAddress, 'id' | 'companyId'>) {
    const companyId = authService.getCurrentUser()?.companyId;
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('parceiros_enderecos')
      .insert({
        company_id: companyId,
        partner_id: address.partnerId,
        city_id: address.cityId,
        cep: address.cep,
        street: address.street,
        number: address.number,
        neighborhood: address.neighborhood,
        complement: address.complement,
        is_primary: address.isPrimary
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapDatabaseToAddress(data);
  },

  async updateAddress(id: string, address: Partial<PartnerAddress>) {
    const { data, error } = await supabase
      .from('parceiros_enderecos')
      .update({
        city_id: address.cityId,
        cep: address.cep,
        street: address.street,
        number: address.number,
        neighborhood: address.neighborhood,
        complement: address.complement,
        is_primary: address.isPrimary
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapDatabaseToAddress(data);
  },

  async deleteAddress(id: string) {
    const { error } = await supabase.from('parceiros_enderecos').delete().eq('id', id);
    if (error) throw error;
  },

  async savePartnerAddress(partnerId: string, addressData: SavePartnerAddressData) {
    const { cep, street, number, neighborhood, complement, cityName, stateUf } = addressData;
    if (!stateUf || !cityName) return;

    const { data, error } = await supabase.rpc('rpc_upsert_partner_primary_address', {
      p_partner_id: partnerId,
      p_cep: cep || '',
      p_street: street || '',
      p_number: number || '',
      p_neighborhood: neighborhood || '',
      p_complement: complement || '',
      p_city_name: cityName.trim(),
      p_state_uf: stateUf.toUpperCase()
    });

    if (error) {
      console.error('Erro ao salvar endereço via RPC:', error);
      throw new Error(`Falha ao sincronizar endereço: ${error.message}`);
    }

    return data; // Retorna o UUID do endereço criado/atualizado
  }
};
