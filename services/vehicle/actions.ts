import { supabase } from '../supabase';
import { logService } from '../logService';
import { authService } from '../authService';
import { Vehicle } from './types';
import { vehicleStore } from './store';

const generateUUID = (): string => {
  if (typeof self !== 'undefined' && self.crypto && self.crypto.randomUUID) {
    return self.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

export const vehicleActions = {
  add: async (vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const tempId = generateUUID();
    const tempVehicle: Vehicle = {
      ...vehicle,
      id: tempId,
      created_at: now,
      updated_at: now
    };
    vehicleStore.add(tempVehicle);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'create',
      module: 'Parceiros',
      description: `Cadastrou veículo: ${vehicle.plate}`,
      entityId: tempId
    });

    try {
      const allowedTypes = new Set(['truck', 'bitruck', 'carreta_ls', 'vanderleia', 'bi_trem', 'rodotrem', 'outros']);
      const normalizedType = allowedTypes.has((vehicle.type as any)) ? vehicle.type : 'truck';
      const insertPayload = {
        ...vehicle,
        type: normalizedType,
        plate: (vehicle.plate || '').toUpperCase(),
        owner_type: vehicle.owner_type || 'third_party',
        company_id: vehicle.company_id || authService.getCurrentUser()?.companyId,
        created_at: now,
        updated_at: now
      } as any;

      const { data, error } = await supabase
        .from('vehicles')
        .insert(insertPayload)
        .select()
        .single();
      
      if (error) throw error;

      const savedVehicle: Vehicle = data as Vehicle;
      vehicleStore.delete(tempId);
      vehicleStore.add(savedVehicle);
    } catch (error) {
      vehicleStore.delete(tempId);
      throw error;
    }
  },

  update: async (vehicle: Vehicle) => {
    const existing = vehicleStore.getById(vehicle.id);
    vehicleStore.update(vehicle);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'update',
      module: 'Parceiros',
      description: `Atualizou veículo: ${vehicle.plate}`,
      entityId: vehicle.id
    });

    try {
      const { error } = await supabase
        .from('vehicles')
        .update(vehicle)
        .eq('id', vehicle.id);
      if (error) throw error;
    } catch (error) {
      if (existing) vehicleStore.update(existing);
      throw error;
    }
  },

  delete: async (id: string) => {
    const vehicle = vehicleStore.getById(id);
    if (!vehicle) return;

    vehicleStore.delete(id);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'delete',
      module: 'Parceiros',
      description: `Deletou veículo: ${vehicle.plate}`,
      entityId: id
    });

    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      vehicleStore.add(vehicle);
      throw error;
    }
  },

  importData: (vehicles: Vehicle[]) => {
    if (!vehicles) return;
    vehicleStore.setAll(vehicles);
    const companyId = authService.getCurrentUser()?.companyId;
    if (!companyId) return;

    void (async () => {
      try {
        const payload = vehicles.map(v => ({
          ...v,
          company_id: companyId,
          plate: (v.plate || '').toUpperCase()
        }));
        const { error } = await supabase.from('vehicles').upsert(payload, { onConflict: 'id' });
        if (error) console.error('❌ Erro ao sincronizar veículos:', error);
      } catch (err) {
        console.error('[vehicleService] importData:', err);
      }
    })();
  }
};
