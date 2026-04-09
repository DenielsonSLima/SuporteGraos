import { supabase } from '../supabase';
import { authService } from '../authService';
import { Vehicle } from './types';

/**
 * VEHICLES ACTIONS
 * Gerencia a tabela parceiros_veiculos.
 */

export const vehiclesActions = {
  mapDatabaseToVehicle(dbRow: any): Vehicle {
    return {
      id: dbRow.id,
      companyId: dbRow.company_id,
      partnerId: dbRow.partner_id,
      plate: dbRow.plate,
      brand: dbRow.brand,
      model: dbRow.model,
      color: dbRow.color,
      year: dbRow.year,
      active: dbRow.active !== false,
      createdAt: dbRow.created_at
    };
  },

  async getVehicles(partnerId: string) {
    const { data, error } = await supabase
      .from('parceiros_veiculos')
      .select('*')
      .eq('partner_id', partnerId)
      .order('plate');

    if (error) throw error;
    return (data || []).map(row => this.mapDatabaseToVehicle(row));
  },

  async createVehicle(vehicle: Omit<Vehicle, 'id' | 'companyId' | 'createdAt'>) {
    const companyId = authService.getCurrentUser()?.companyId;
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('parceiros_veiculos')
      .insert({
        company_id: companyId,
        partner_id: vehicle.partnerId,
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        color: vehicle.color,
        year: vehicle.year,
        active: vehicle.active !== false
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapDatabaseToVehicle(data);
  },

  async updateVehicle(id: string, vehicle: Partial<Vehicle>) {
    const { data, error } = await supabase
      .from('parceiros_veiculos')
      .update({
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        color: vehicle.color,
        year: vehicle.year,
        active: vehicle.active
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapDatabaseToVehicle(data);
  },

  async deleteVehicle(id: string) {
    const { error } = await supabase.from('parceiros_veiculos').delete().eq('id', id);
    if (error) throw error;
  }
};
