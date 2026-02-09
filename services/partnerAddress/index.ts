/**
 * SERVIÇO DE ENDEREÇOS DE PARCEIROS
 * Responsável por CRUD de endereços com Realtime Supabase
 */

import { supabase } from '../supabase';
import { Persistence } from '../persistence';
import { logService } from '../logService';
import { authService } from '../authService';
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
      .from('partner_addresses')
      .select('*')
      .order('is_primary', { ascending: false })
      .order('created_at');

    if (error) throw error;
    const transformedData = (data || []).map(transformAddressFromSupabase);
    db.setAll(transformedData);
    isLoaded = true;
  } catch (error) {
    console.error('❌ Erro ao carregar endereços:', error);
  }
};

// ============================================================================
// REALTIME
// ============================================================================

const startRealtime = () => {
  if (realtimeChannel) return;

  realtimeChannel = supabase
    .channel('realtime:partner_addresses')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_addresses' }, (payload) => {
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
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('❌ Erro no canal Realtime (pode ser RLS)');
      }
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
  return {
    userId: user?.id || 'system',
    userName: user?.name || 'Sistema'
  };
};

// ============================================================================
// EXPORT SERVICE
// ============================================================================

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

    // Cria com ID temporário para UX rápida
    const address: PartnerAddress = {
      ...input,
      id: generateUUID(),
      created_at: now,
      updated_at: now
    };

    // Adiciona no cache local imediatamente
    db.add(address);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'create',
      module: 'Parceiros',
      description: `Cadastrou endereço: ${input.street}`,
      entityId: address.id
    });

    try {
      // Resolve state_id/city_id se vierem os nomes
      let resolvedStateId: number | null = address.state_id ?? null;
      let resolvedCityId: number | null = address.city_id ?? null;

      if (!resolvedStateId && input.stateName) {
        const stateStr = (input.stateName || '').trim();
        const ufCode = stateStr.length === 2 ? stateStr.toUpperCase() : null;

        // tenta por UF (ex: "SP") senão por nome (ex: "São Paulo")
        let ufRow: any | null = null;
        if (ufCode) {
          const { data } = await supabase.from('ufs').select('id, uf, name').eq('uf', ufCode).limit(1).single();
          ufRow = data || null;
        }
        if (!ufRow) {
          const { data } = await supabase.from('ufs').select('id, uf, name').ilike('name', stateStr).limit(1).single();
          ufRow = data || null;
        }
        resolvedStateId = ufRow?.id ?? null;
      }

      if (!resolvedCityId && input.cityName) {
        const cityStr = (input.cityName || '').trim();
        if (resolvedStateId) {
          const { data } = await supabase
            .from('cities')
            .select('id, name')
            .eq('uf_id', resolvedStateId)
            .ilike('name', cityStr)
            .limit(1)
            .single();
          if (data?.id) {
            resolvedCityId = data.id as number;
          } else {
            // cria cidade vinculada à UF se não encontrada
            const { data: created, error: cityCreateErr } = await supabase
              .from('cities')
              .insert({ name: cityStr, uf_id: resolvedStateId })
              .select('id')
              .single();
            if (!cityCreateErr && created?.id) {
              resolvedCityId = created.id as number;
            }
          }
        } else {
          const { data } = await supabase
            .from('cities')
            .select('id, name')
            .ilike('name', cityStr)
            .limit(1)
            .single();
          resolvedCityId = data?.id ?? null;
        }
      }

      // Atualiza os IDs resolvidos para o insert
      address.state_id = (resolvedStateId ?? null) as any;
      address.city_id = (resolvedCityId ?? null) as any;

      // Sincroniza com Supabase
      const savedAddress = await partnerAddressSyncService.syncInsert(address);

      // Substitui pelo registro real do Supabase (em caso de diferenças)
      db.delete(address.id);
      db.add(savedAddress);
      console.log(`✅ Endereço ${input.street} salvo com sucesso`);
      return savedAddress;
    } catch (error) {
      console.error('❌ Erro ao salvar endereço:', error);
      db.delete(address.id);
      throw error;
    }
  },

  update: async (address: PartnerAddress & { cityName?: string; stateName?: string }) => {
    const existing = db.getById(address.id);
    db.update(address);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'update',
      module: 'Parceiros',
      description: `Atualizou endereço: ${address.street}`,
      entityId: address.id
    });

    try {
      // Resolve IDs se nomes fornecidos
      let resolvedStateId: number | null = address.state_id ?? null;
      let resolvedCityId: number | null = address.city_id ?? null;
      if (address.stateName && !resolvedStateId) {
        const stateStr = (address.stateName || '').trim();
        const ufCode = stateStr.length === 2 ? stateStr.toUpperCase() : null;
        let ufRow: any | null = null;
        if (ufCode) {
          const { data } = await supabase.from('ufs').select('id, uf, name').eq('uf', ufCode).limit(1).single();
          ufRow = data || null;
        }
        if (!ufRow) {
          const { data } = await supabase.from('ufs').select('id, uf, name').ilike('name', stateStr).limit(1).single();
          ufRow = data || null;
        }
        resolvedStateId = ufRow?.id ?? null;
      }
      if (address.cityName && !resolvedCityId) {
        const cityStr = (address.cityName || '').trim();
        if (resolvedStateId) {
          const { data } = await supabase
            .from('cities')
            .select('id, name')
            .eq('uf_id', resolvedStateId)
            .ilike('name', cityStr)
            .limit(1)
            .single();
          if (data?.id) {
            resolvedCityId = data.id as number;
          } else {
            const { data: created, error: cityCreateErr } = await supabase
              .from('cities')
              .insert({ name: cityStr, uf_id: resolvedStateId })
              .select('id')
              .single();
            if (!cityCreateErr && created?.id) {
              resolvedCityId = created.id as number;
            }
          }
        } else {
          const { data } = await supabase
            .from('cities')
            .select('id, name')
            .ilike('name', cityStr)
            .limit(1)
            .single();
          resolvedCityId = data?.id ?? null;
        }
      }
      address.state_id = (resolvedStateId ?? null) as any;
      address.city_id = (resolvedCityId ?? null) as any;
      const savedAddress = await partnerAddressSyncService.syncUpdate(address);
      db.update(savedAddress);
      console.log(`✅ Endereço ${address.street} atualizado com sucesso`);
      return savedAddress;
    } catch (error) {
      console.error('❌ Erro ao atualizar endereço:', error);
      if (existing) db.update(existing);
      throw error;
    }
  },

  delete: async (id: string) => {
    const address = db.getById(id);
    if (!address) return;

    db.delete(id);

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId,
      userName,
      action: 'delete',
      module: 'Parceiros',
      description: `Removeu endereço: ${address.street}`,
      entityId: id
    });

    try {
      await partnerAddressSyncService.syncDelete(id);
      console.log('✅ Endereço excluído com sucesso');
    } catch (error) {
      console.error('❌ Erro ao excluir endereço:', error);
      db.add(address);
      throw error;
    }
  },

  loadByPartner: async (partnerId: string): Promise<PartnerAddress[]> => {
    try {
      const addresses = await partnerAddressSyncService.syncLoadByPartner(partnerId);
      const transformed = addresses.map(transformAddressFromSupabase);
      // Atualiza cache com os endereços do parceiro
      transformed.forEach(a => {
        const existing = db.getById(a.id);
        if (existing) db.update(a);
        else db.add(a);
      });
      return transformed;
    } catch (error) {
      console.error('❌ Erro ao carregar endereços do parceiro:', error);
      throw error;
    }
  },

  importData: (data: PartnerAddress[]) => db.setAll(data),

  reload: () => {
    isLoaded = false;
    return loadFromSupabase();
  },
  loadFromSupabase,
  startRealtime
};
