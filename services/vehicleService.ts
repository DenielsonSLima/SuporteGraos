/**
 * SERVIÇO DE VEÍCULOS
 * Responsável por CRUD de veículos com Realtime Supabase
 */

import { supabase } from './supabase';
import { Persistence } from './persistence';
import { logService } from './logService';
import { authService } from './authService';

// UUID compatível com navegador (fallback manual)
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

export interface Vehicle {
  id: string;
  plate: string;
  type: 'truck' | 'bitruck' | 'carreta_ls' | 'vanderleia' | 'bi_trem' | 'rodotrem' | 'outros';
  capacity_kg?: number;
  owner_type: 'own' | 'third_party';
  owner_partner_id?: string;
  owner_transporter_id?: string;
  year?: number;
  model?: string;
  color?: string;
  active: boolean;
  company_id?: string;
  created_at: string;
  updated_at: string;
}

const INITIAL_DATA: Vehicle[] = [];
const db = new Persistence<Vehicle>('vehicles', INITIAL_DATA);

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isLoaded = false;

// ============================================================================
// CARREGAMENTO
// ============================================================================

const loadFromSupabase = async () => {
  if (isLoaded) return;
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('plate');

    if (error) throw error;
    db.setAll(data || []);

    isLoaded = true;
    console.log('🔄 Veículos sincronizando em tempo real...');
  } catch (error) {
    console.error('❌ Erro ao carregar veículos:', error);
  }
};

// ============================================================================
// REALTIME
// ============================================================================

const startRealtime = () => {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('realtime:vehicles')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, (payload) => {
      const rec = payload.new || payload.old;
      if (!rec) return;

      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const existing = db.getById(rec.id);
        if (existing) db.update(rec);
        else db.add(rec);
      } else if (payload.eventType === 'DELETE') {
        db.delete(rec.id);
      }

      console.log(`🔔 Realtime vehicles: ${payload.eventType}`);
    })
    .subscribe(status => {
      // Realtime subscribed
    });
};

// Inicializar ao carregar o módulo
// ❌ NÃO inicializar automaticamente - aguardar autenticação
// loadFromSupabase();
// startRealtime();

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

export const vehicleService = {
  getAll: (): Vehicle[] => db.getAll(),

  getById: (id: string): Vehicle | undefined => db.getById(id),

  getActive: (): Vehicle[] => db.find(v => v.active),

  getByType: (type: Vehicle['type']): Vehicle[] => db.find(v => v.type === type && v.active),

  getByOwnerPartner: (partnerId: string): Vehicle[] => {
    return db.find(v => v.owner_type === 'third_party' && v.owner_partner_id === partnerId && v.active);
  },

  getByOwnerTransporter: (transporterId: string): Vehicle[] => {
    return db.find(v => v.owner_type === 'own' && v.owner_transporter_id === transporterId && v.active);
  },

  subscribe: (callback: (items: Vehicle[]) => void) => db.subscribe(callback),

  add: async (vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();

    // Adiciona no cache com id temporário para UX rápida
    const tempId = generateUUID();
    const tempVehicle: Vehicle = {
      ...vehicle,
      id: tempId,
      created_at: now,
      updated_at: now
    };
    db.add(tempVehicle);

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
      // Normaliza dados para respeitar o CHECK constraint do banco
      const allowedTypes = new Set(['truck', 'bitruck', 'carreta_ls', 'vanderleia', 'bi_trem', 'rodotrem', 'outros']);
      const normalizedType = allowedTypes.has((vehicle.type as any)) ? vehicle.type : 'truck';
      const insertPayload = {
        ...vehicle,
        type: normalizedType,
        plate: (vehicle.plate || '').toUpperCase(),
        owner_type: vehicle.owner_type || 'third_party',
        created_at: now,
        updated_at: now
      } as any;

      console.log('🔵 [DEBUG] Vehicle payload para Supabase:', JSON.stringify(insertPayload, null, 2));
      const { data, error } = await supabase
        .from('vehicles')
        .insert(insertPayload)
        .select()
        .single();
      if (error) {
        console.error('❌ [ERRO SUPABASE DETALHADO]:', {
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint,
          code: (error as any).code
        });
        throw error;
      }

      // Substitui o registro temporário pelo retorno real do Supabase (novo id)
      const savedVehicle: Vehicle = data as Vehicle;
      db.delete(tempId);
      db.add(savedVehicle);
      console.log(`✅ Veículo ${vehicle.plate} salvo no Supabase`);
    } catch (error) {
      console.error('❌ Erro ao salvar veículo:', error);
      db.delete(tempId);
      throw error;
    }
  },

  update: async (vehicle: Vehicle) => {
    const existing = db.getById(vehicle.id);
    db.update(vehicle);

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
      console.log(`✅ Veículo ${vehicle.plate} atualizado no Supabase`);
    } catch (error) {
      console.error('❌ Erro ao atualizar veículo:', error);
      if (existing) db.update(existing);
      throw error;
    }
  },

  delete: async (id: string) => {
    const vehicle = db.getById(id);
    if (!vehicle) return;

    console.log('🗑️ [1/3] Deletando veículo:', id);
    db.delete(id);

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
      console.log('✅ [3/3] Veículo excluído do Supabase');
    } catch (error) {
      console.error('❌ Erro ao excluir veículo:', error);
      db.add(vehicle);
      throw error;
    }
  },

  reload: () => {
    isLoaded = false;
    return loadFromSupabase();
  },
  loadFromSupabase,
  startRealtime
};
