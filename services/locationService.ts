/**
 * locationService.ts  (reescrito — padrão TanStack Query)
 *
 * Operações async/await diretas no Supabase.
 * Tabelas states + cities criadas na migration 007.
 * Estados são de sistema (sem company_id).
 * Cidades customizadas por empresa têm company_id.
 *
 * Shims legados mantidos: getStates(), addCity(), removeCity(), subscribe()
 */

import { supabase } from './supabase';
import { authService } from './authService';
import { logService } from './logService';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface StateData {
  id: string;   // UUID
  uf: string;
  name: string;
  cities: CityData[];
}

export interface CityData {
  id: string;   // UUID
  name: string;
  stateId: string;
  isSystem: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const getCompanyId = () => authService.getCurrentUser()?.companyId ?? null;

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name || 'Sistema' };
};

// ── API principal ─────────────────────────────────────────────────────────────

export const locationService = {

  /** Retorna todos os estados com suas cidades (sistema + empresa). */
  getAll: async (): Promise<StateData[]> => {
    const [statesRes, citiesRes] = await Promise.all([
      supabase.from('states').select('id, uf, name').order('name'),
      supabase.from('cities').select('id, name, state_id, company_id').order('name'),
    ]);

    if (statesRes.error) throw statesRes.error;
    if (citiesRes.error) throw citiesRes.error;

    const states: StateData[] = (statesRes.data ?? []).map(s => ({
      id: s.id,
      uf: s.uf,
      name: s.name,
      cities: [],
    }));

    const stateMap = new Map<string, StateData>(states.map(s => [s.id, s]));

    (citiesRes.data ?? []).forEach(c => {
      const state = stateMap.get(c.state_id);
      if (state) {
        state.cities.push({
          id: c.id,
          name: c.name,
          stateId: c.state_id,
          isSystem: c.company_id === null,
        });
      }
    });

    return states;
  },

  /** Adiciona uma cidade customizada para a empresa. */
  addCity: async (stateId: string, cityName: string): Promise<CityData> => {
    const companyId = getCompanyId();
    if (!companyId) throw new Error('Usuário sem empresa vinculada.');

    const { data, error } = await supabase
      .from('cities')
      .insert({ state_id: stateId, name: cityName.trim(), company_id: companyId })
      .select('id, name, state_id, company_id')
      .single();

    if (error) {
      if (error.code === '23505') throw new Error(`A cidade "${cityName}" já existe neste estado.`);
      throw error;
    }

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId, userName, action: 'create', module: 'Configurações',
      description: `Adicionou cidade: ${cityName}`,
      entityId: data.id,
    });

    return { id: data.id, name: data.name, stateId: data.state_id, isSystem: false };
  },

  /** Remove uma cidade customizada da empresa. */
  removeCity: async (cityId: string, cityName?: string): Promise<void> => {
    const { error } = await supabase
      .from('cities')
      .delete()
      .eq('id', cityId);

    if (error) throw error;

    const { userId, userName } = getLogInfo();
    logService.addLog({
      userId, userName, action: 'delete', module: 'Configurações',
      description: `Removeu cidade: ${cityName ?? cityId}`,
      entityId: cityId,
    });
  },

  /** Realtime: singleton channel para states + cities. Retorna cleanup. */
  subscribeRealtime: (() => {
    const listeners = new Set<() => void>();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    return (callback: () => void): (() => void) => {
      listeners.add(callback);
      if (!channel) {
        channel = supabase
          .channel('realtime:locations:svc')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'states' }, () => listeners.forEach(fn => fn()))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'cities' }, () => listeners.forEach(fn => fn()))
          .subscribe();
      }
      return () => {
        listeners.delete(callback);
        if (listeners.size === 0 && channel) { void supabase.removeChannel(channel); channel = null; }
      };
    };
  })(),

  /** Retorna lista flat de cidades para autocomplete (city + state UF). */
  getAllCitiesFlat: async (): Promise<{ city: string; state: string }[]> => {
    const states = await locationService.getAll();
    const result: { city: string; state: string }[] = [];
    states.forEach(s => s.cities.forEach(c => result.push({ city: c.name, state: s.uf })));
    return result;
  },

  // ── Lista estática dos 27 estados ─────────────────────────────────────────

  ALL_STATES_LIST: [
    { uf: 'AC', name: 'Acre' }, { uf: 'AL', name: 'Alagoas' }, { uf: 'AP', name: 'Amapá' },
    { uf: 'AM', name: 'Amazonas' }, { uf: 'BA', name: 'Bahia' }, { uf: 'CE', name: 'Ceará' },
    { uf: 'DF', name: 'Distrito Federal' }, { uf: 'ES', name: 'Espírito Santo' }, { uf: 'GO', name: 'Goiás' },
    { uf: 'MA', name: 'Maranhão' }, { uf: 'MT', name: 'Mato Grosso' }, { uf: 'MS', name: 'Mato Grosso do Sul' },
    { uf: 'MG', name: 'Minas Gerais' }, { uf: 'PA', name: 'Pará' }, { uf: 'PB', name: 'Paraíba' },
    { uf: 'PR', name: 'Paraná' }, { uf: 'PE', name: 'Pernambuco' }, { uf: 'PI', name: 'Piauí' },
    { uf: 'RJ', name: 'Rio de Janeiro' }, { uf: 'RN', name: 'Rio Grande do Norte' }, { uf: 'RS', name: 'Rio Grande do Sul' },
    { uf: 'RO', name: 'Rondônia' }, { uf: 'RR', name: 'Roraima' }, { uf: 'SC', name: 'Santa Catarina' },
    { uf: 'SP', name: 'São Paulo' }, { uf: 'SE', name: 'Sergipe' }, { uf: 'TO', name: 'Tocantins' },
  ],

  getAllStatesInfo: () => locationService.ALL_STATES_LIST,

  // ── Shims legados ──────────────────────────────────────────────────────────

  /** @deprecated Use useLocations() hook. */
  getStates: (): { id: string; uf: string; name: string; cities: string[] }[] => [],

  /** @deprecated Use locationService.addCity(stateId, name). */
  subscribe: (_callback: (items: unknown[]) => void): (() => void) => () => { /* no-op */ },

  loadFromSupabase: async () => { /* no-op */ },
  startRealtime: () => { /* no-op */ },

  // Resolvedor por ID (para retrocompatibilidade com pedidos/loadings já gravados)
  getCityNameById: async (cityId: string | null): Promise<string | null> => {
    if (!cityId) return null;
    const { data } = await supabase.from('cities').select('name').eq('id', cityId).maybeSingle();
    return data?.name ?? null;
  },

  getStateUfById: async (stateId: string | null): Promise<string | null> => {
    if (!stateId) return null;
    const { data } = await supabase.from('states').select('uf').eq('id', stateId).maybeSingle();
    return data?.uf ?? null;
  },
};

