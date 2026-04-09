import { supabase } from '../supabase';
import { logService } from '../logService';
import { authService } from '../authService';
import { Driver } from './types';
import { driverStore } from './store';

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

export const driverActions = {
  add: async (driver: Omit<Driver, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const tempId = generateUUID();
    const tempDriver: Driver = {
      ...driver,
      id: tempId,
      created_at: now,
      updated_at: now
    };
    driverStore.add(tempDriver);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'create',
      module: 'Parceiros',
      description: `Cadastrou motorista: ${driver.name}`,
      entityId: tempId
    });

    try {
      const document = driver.document === 'NÃO INFORMADO' ? `TEMP-DOC-${generateUUID()}` : driver.document;
      const license_number = driver.license_number === 'NÃO INFORMADO' ? `TEMP-CNH-${generateUUID()}` : driver.license_number;

      const insertPayload = {
        ...driver,
        document,
        license_number,
        company_id: driver.company_id || authService.getCurrentUser()?.companyId,
        created_at: now,
        updated_at: now
      } as any;

      const { data, error } = await supabase
        .from('drivers')
        .insert(insertPayload)
        .select()
        .single();
      
      if (error) throw error;

      const savedDriver: Driver = data as Driver;
      driverStore.delete(tempId);
      driverStore.add(savedDriver);
    } catch (error) {
      driverStore.delete(tempId);
      throw error;
    }
  },

  update: async (driver: Driver) => {
    const existing = driverStore.getById(driver.id);
    driverStore.update(driver);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'update',
      module: 'Parceiros',
      description: `Atualizou motorista: ${driver.name}`,
      entityId: driver.id
    });

    try {
      const { error } = await supabase
        .from('drivers')
        .update(driver)
        .eq('id', driver.id);
      if (error) throw error;
    } catch (error) {
      if (existing) driverStore.update(existing);
      throw error;
    }
  },

  delete: async (id: string) => {
    const driver = driverStore.getById(id);
    if (!driver) return;

    driverStore.delete(id);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'delete',
      module: 'Parceiros',
      description: `Deletou motorista: ${driver.name}`,
      entityId: id
    });

    try {
      const { error } = await supabase.from('drivers').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      driverStore.add(driver);
      throw error;
    }
  },

  importData: (drivers: Driver[]) => {
    if (!drivers) return;
    driverStore.setAll(drivers);
    const companyId = authService.getCurrentUser()?.companyId;
    if (!companyId) return;

    void (async () => {
      try {
        const payload = drivers.map(d => ({
          ...d,
          company_id: companyId,
          document: d.document === 'NÃO INFORMADO' ? `TEMP-DOC-${generateUUID()}` : d.document,
          license_number: d.license_number === 'NÃO INFORMADO' ? `TEMP-CNH-${generateUUID()}` : d.license_number
        }));
        const { error } = await supabase.from('drivers').upsert(payload, { onConflict: 'id' });
        if (error) console.error('❌ Erro ao sincronizar motoristas:', error);
      } catch (err) {
        console.error('❌ Erro inesperado na importação de motoristas:', err);
      }
    })();
  }
};
