/**
 * SERVIÇO DE ENDEREÇOS DE PARCEIROS
 * Responsável por CRUD de endereços com Realtime Supabase
 */

import { supabase } from '../supabase';
import { Persistence } from '../persistence';
import { logService } from '../logService';
import { authService } from '../authService';
import { isSqlCanonicalOpsEnabled, sqlCanonicalOpsLog } from '../sqlCanonicalOps';
import { PartnerAddress, PartnerAddressInput, PartnerAddressCreateInput } from './types';
import { generateUUID, createPartnerAddress, transformAddressFromSupabase } from './utils';
import { partnerAddressSyncService } from './supabaseSyncService';

const INITIAL_DATA: PartnerAddress[] = [];
const db = new Persistence<PartnerAddress>('partner_addresses', INITIAL_DATA);

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let isLoaded = false;

// ============================================================================
// CARREGAMENTO
// ============================================================================

const loadFromSupabase = async () => {
  if (isLoaded) return;
  try {
    const { data, error } = await supabase
      .from('parceiros_enderecos')
      .select('*')
      .order('is_primary', { ascending: false })
      .order('created_at');

    if (error) throw error;
    const transformedData = (data || []).map(transformAddressFromSupabase);
    db.setAll(transformedData);
    isLoaded = true;
  } catch (error) {
    console.error('❌ Erro ao carregar endereços (parceiros_enderecos):', error);
  }
};

const startRealtime = () => {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('realtime:parceiros_enderecos')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'parceiros_enderecos' }, (payload) => {
      const rec = payload.new || payload.old;
      if (!rec) return;

      const transformed = transformAddressFromSupabase(rec);

      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const existing = db.getById(transformed.id);
        if (existing) db.update(transformed);
        else db.add(transformed);
      } else if (payload.eventType === 'DELETE') {
        db.delete(transformed.id);
      }
    })
    .subscribe();
};

const stopRealtime = () => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
};

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return {
    userId: user?.id || 'system',
    userName: user?.name || 'Sistema'
  };
};

export const partnerAddressService = {
  getAll: (): PartnerAddress[] => db.getAll(),

  getById: (id: string): PartnerAddress | undefined => db.getById(id),

  getByPartner: (partnerId: string): PartnerAddress[] =>
    db.find(a => a.partner_id === partnerId && a.active),

  getPrimaryByPartner: (partnerId: string): PartnerAddress | undefined =>
    db.find(a => a.partner_id === partnerId && a.is_primary && a.active)[0],

  subscribe: (callback: (items: PartnerAddress[]) => void) => db.subscribe(callback),

  subscribeByPartner: (partnerId: string, callback: (items: PartnerAddress[]) => void) => {
    return db.subscribe((all) => {
      const filtered = all.filter(a => a.partner_id === partnerId);
      callback(filtered);
    });
  },

  add: async (input: PartnerAddressCreateInput) => {
    const now = new Date().toISOString();

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId, userName, action: 'create', module: 'Parceiros',
      description: `Cadastrou endereço: ${input.street}`, entityId: 'temp'
    });

    try {
      let resolvedStateId: number | null = input.state_id ?? null;
      let resolvedCityId: number | null = input.city_id ?? null;

      // ... Lógica de resolução de cidades/estados (mantida) ...
      if (!resolvedStateId && input.stateName) {
        const stateStr = (input.stateName || '').trim();
        const ufCode = stateStr.length === 2 ? stateStr.toUpperCase() : null;
        let ufRow: any | null = null;
        if (ufCode) {
          const { data } = await supabase.from('ufs').select('id').eq('uf', ufCode).limit(1).single();
          ufRow = data;
        }
        if (!ufRow) {
          const { data } = await supabase.from('ufs').select('id').ilike('name', stateStr).limit(1).single();
          ufRow = data;
        }
        resolvedStateId = ufRow?.id ?? null;
      }

      if (!resolvedCityId && input.cityName && resolvedStateId) {
        const cityStr = (input.cityName || '').trim();
        const { data } = await supabase.from('cities').select('id').eq('uf_id', resolvedStateId).ilike('name', cityStr).limit(1).single();
        resolvedCityId = data?.id ?? null;
      }

      const addressToSave = {
        ...input,
        id: '', // Supabase gera o UUID
        state_id: resolvedStateId as any,
        city_id: resolvedCityId as any,
        active: true,
        created_at: now,
        updated_at: now
      };

      const savedAddress = await partnerAddressSyncService.syncInsert(addressToSave);
      db.add(savedAddress);
      return savedAddress;
    } catch (error) {
      throw error;
    }
  },

  update: async (address: PartnerAddress & { cityName?: string; stateName?: string }) => {
    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId, userName, action: 'update', module: 'Parceiros',
      description: `Atualizou endereço: ${address.street}`, entityId: address.id
    });

    try {
      const savedAddress = await partnerAddressSyncService.syncUpdate(address);
      db.update(savedAddress);
      return savedAddress;
    } catch (error) {
      throw error;
    }
  },

  delete: async (id: string) => {
    const address = db.getById(id);
    if (!address) return;

    try {
      await partnerAddressSyncService.syncDelete(id);
      db.delete(id);
    } catch (error) {
      throw error;
    }
  },

  loadByPartner: async (partnerId: string): Promise<PartnerAddress[]> => {
    const addresses = await partnerAddressSyncService.syncLoadByPartner(partnerId);
    const transformed = addresses.map(transformAddressFromSupabase);
    transformed.forEach(a => db.update(a));
    return transformed;
  },

  reload: () => {
    isLoaded = false;
    return loadFromSupabase();
  },
  loadFromSupabase,
  startRealtime,
  stopRealtime
};
