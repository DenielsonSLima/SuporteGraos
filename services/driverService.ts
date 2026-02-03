/**
 * SERVIÇO DE MOTORISTAS
 * Responsável por CRUD de motoristas com Realtime Supabase
 */

import { supabase } from './supabase';
import { Persistence } from './persistence';
import { logService } from './logService';
import { authService } from './authService';

/**
 * Gera UUID compatível com navegador
 */
const generateUUID = (): string => {
  if (typeof self !== 'undefined' && self.crypto && self.crypto.randomUUID) {
    return self.crypto.randomUUID();
  }
  // Fallback: gera UUID v4 manualmente
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export interface Driver {
  id: string;
  name: string;
  document: string;
  license_number: string;
  license_expiry_date?: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  address?: string;
  partner_id?: string;
  city_id?: string;
  state_id?: string;
  active: boolean;
  company_id?: string;
  created_at: string;
  updated_at: string;
}

const INITIAL_DATA: Driver[] = [];
const db = new Persistence<Driver>('drivers', INITIAL_DATA);

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isLoaded = false;

// ============================================================================
// CARREGAMENTO
// ============================================================================

const loadFromSupabase = async () => {
  if (isLoaded) return;
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .order('name');

    if (error) throw error;
    db.setAll(data || []);
    isLoaded = true;
    console.log('🔄 Motoristas sincronizando em tempo real...');
  } catch (error) {
    console.error('❌ Erro ao carregar motoristas:', error);
  }
};

// ============================================================================
// REALTIME
// ============================================================================

const startRealtime = () => {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('realtime:drivers')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, (payload) => {
      const rec = payload.new || payload.old;
      if (!rec) return;

      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const existing = db.getById(rec.id);
        if (existing) db.update(rec);
        else db.add(rec);
      } else if (payload.eventType === 'DELETE') {
        db.delete(rec.id);
      }

      console.log(`🔔 Realtime drivers: ${payload.eventType}`);
    })
    .subscribe(status => {
      // Realtime subscribed
    });
};

// Inicializar ao carregar o módulo
loadFromSupabase();
startRealtime();

// ============================================================================
// HELPER
// ============================================================================

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

// ============================================================================
// EXPORT
// ============================================================================

export const driverService = {
  getAll: (): Driver[] => db.getAll(),

  getById: (id: string): Driver | undefined => db.getById(id),

  getActive: (): Driver[] => db.find(d => d.active),

  getByCity: (cityId: string): Driver[] => db.find(d => d.city_id === cityId && d.active),

  getByState: (stateId: string): Driver[] => db.find(d => d.state_id === stateId && d.active),

  getByPartner: (partnerId: string): Driver[] => db.find(d => d.partner_id === partnerId && d.active).sort((a, b) => a.name.localeCompare(b.name)),

  subscribe: (callback: (items: Driver[]) => void) => db.subscribe(callback),

  add: async (driver: Omit<Driver, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();

    // Adiciona no cache com id temporário para UX rápida
    const tempId = generateUUID();
    const tempDriver: Driver = {
      ...driver,
      id: tempId,
      created_at: now,
      updated_at: now
    };
    db.add(tempDriver);

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
      // Gera UUID único para documento e CNH se não informados (evita UNIQUE constraint)
      const document = driver.document === 'NÃO INFORMADO' ? `TEMP-DOC-${generateUUID()}` : driver.document;
      const license_number = driver.license_number === 'NÃO INFORMADO' ? `TEMP-CNH-${generateUUID()}` : driver.license_number;

      // Deixa o Supabase gerar o UUID
      const insertPayload = { 
        ...driver, 
        document, 
        license_number,
        created_at: now, 
        updated_at: now 
      } as any;
      const { data, error } = await supabase
        .from('drivers')
        .insert(insertPayload)
        .select()
        .single();
      if (error) throw error;

      // Substitui o registro temporário pelo retorno real do Supabase (novo id)
      const savedDriver: Driver = data as Driver;
      db.delete(tempId);
      db.add(savedDriver);
      console.log(`✅ Motorista ${driver.name} salvo no Supabase`);
    } catch (error) {
      console.error('❌ Erro ao salvar motorista:', error);
      db.delete(tempId);
      throw error;
    }
  },

  update: async (driver: Driver) => {
    const existing = db.getById(driver.id);
    db.update(driver);

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
      console.log(`✅ Motorista ${driver.name} atualizado no Supabase`);
    } catch (error) {
      console.error('❌ Erro ao atualizar motorista:', error);
      if (existing) db.update(existing);
      throw error;
    }
  },

  delete: async (id: string) => {
    const driver = db.getById(id);
    if (!driver) return;

    console.log('🗑️ [1/3] Deletando motorista:', id);
    db.delete(id);

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
      console.log('✅ [3/3] Motorista excluído do Supabase');
    } catch (error) {
      console.error('❌ Erro ao excluir motorista:', error);
      db.add(driver);
      throw error;
    }
  },

  reload: () => {
    isLoaded = false;
    return loadFromSupabase();
  }
};
