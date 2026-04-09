import { supabase } from '../supabase';
import { authService } from '../authService';
import { Driver } from './types';

/**
 * DRIVERS ACTIONS
 * Gerencia a tabela parceiros_motoristas.
 */

const driverCache = new Map<string, Driver[]>();

export const driversActions = {
  /**
   * Limpa o cache de motoristas (usado pelo Realtime)
   */
  clearCache(partnerId?: string) {
    if (partnerId) {
      driverCache.delete(partnerId);
      console.log(`[driverCache] Cache limpo para o parceiro: ${partnerId}`);
    } else {
      driverCache.clear();
      console.log('[driverCache] Todo o cache de motoristas foi limpo.');
    }
  },

  mapDatabaseToDriver(dbRow: any): Driver {
    return {
      id: dbRow.id,
      companyId: dbRow.company_id,
      partnerId: dbRow.partner_id,
      name: dbRow.name,
      cnhNumber: dbRow.cnh_number,
      cnhCategory: dbRow.cnh_category,
      cpf: dbRow.cpf,
      phone: dbRow.phone,
      active: dbRow.active !== false,
      createdAt: dbRow.created_at
    };
  },

  async getDrivers(partnerId: string) {
    if (!partnerId) return [];

    // Tentar do cache primeiro
    if (driverCache.has(partnerId)) {
      console.log(`[driverCache] Retornando ${driverCache.get(partnerId)?.length} motoristas do cache para: ${partnerId}`);
      return driverCache.get(partnerId)!;
    }

    const start = performance.now();
    const { data, error } = await supabase
      .from('parceiros_motoristas')
      .select('*')
      .eq('partner_id', partnerId)
      .order('name');

    if (error) throw error;
    
    const mapped = (data || []).map(row => this.mapDatabaseToDriver(row));
    const end = performance.now();
    
    console.log(`[getDrivers] Busca no Supabase levou ${(end - start).toFixed(0)}ms para o parceiro ${partnerId}.`);
    
    // Guardar no cache
    driverCache.set(partnerId, mapped);
    
    return mapped;
  },

  async createDriver(driver: Omit<Driver, 'id' | 'companyId' | 'createdAt'>) {
    const companyId = authService.getCurrentUser()?.companyId;
    if (!companyId) throw new Error('Company ID not found');

    const { data, error } = await supabase
      .from('parceiros_motoristas')
      .insert({
        company_id: companyId,
        partner_id: driver.partnerId,
        name: driver.name,
        cnh_number: driver.cnhNumber,
        cnh_category: driver.cnhCategory,
        cpf: driver.cpf,
        phone: driver.phone,
        active: driver.active !== false
      })
      .select()
      .single();

    if (error) throw error;
    const mapped = this.mapDatabaseToDriver(data);
    this.clearCache(mapped.partnerId);
    return mapped;
  },

  async updateDriver(id: string, driver: Partial<Driver>) {
    const { data, error } = await supabase
      .from('parceiros_motoristas')
      .update({
        name: driver.name,
        cnh_number: driver.cnhNumber,
        cnh_category: driver.cnhCategory,
        cpf: driver.cpf,
        phone: driver.phone,
        active: driver.active
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    const mapped = this.mapDatabaseToDriver(data);
    this.clearCache(mapped.partnerId);
    return mapped;
  },

  async deleteDriver(id: string) {
    // Para limpar o cache corretamente, precisamos saber o partnerId antes de deletar
    const { data: existing } = await supabase.from('parceiros_motoristas').select('partner_id').eq('id', id).single();
    
    const { error } = await supabase.from('parceiros_motoristas').delete().eq('id', id);
    if (error) throw error;

    if (existing?.partner_id) {
      this.clearCache(existing.partner_id);
    }
  }
};
