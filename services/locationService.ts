
import { logService } from './logService';
import { authService } from './authService';
import { supabase } from './supabase';
import { initializeSupabaseData, waitForInit } from './supabaseInitService';
import { Persistence } from './persistence';

// Initial Data - simulated database
interface StateData {
  id?: string; // Opcional para compatibilidade com Persistence
  uf: string;
  name: string;
  cities: string[];
}

interface SupabaseUF {
  id: number;
  uf: string;
  name: string;
  code: number;
}

interface SupabaseCity {
  id: number;
  name: string;
  uf_id: number;
  ibge_code: number;
}

const sortCities = (cities: string[]) => cities.sort((a, b) => a.localeCompare(b));

// Fallback data if Supabase is unavailable
const FALLBACK_STATE_DATABASE: StateData[] = [
  {
    uf: 'SE',
    name: 'Sergipe',
    cities: sortCities(['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana', 'São Cristóvão', 'Estância', 'Tobias Barreto', 'Simão Dias', 'Nossa Senhora da Glória', 'Poço Verde'])
  },
  {
    uf: 'MA',
    name: 'Maranhão',
    cities: sortCities(['São Luís', 'Imperatriz', 'São José de Ribamar', 'Timon', 'Caxias', 'Codó', 'Paço do Lumiar', 'Açailândia', 'Bacabal', 'Balsas'])
  },
  {
    uf: 'PE',
    name: 'Pernambuco',
    cities: sortCities(['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina', 'Paulista', 'Cabo de Santo Agostinho', 'Camaragibe', 'Garanhuns', 'Vitória de Santo Antão'])
  },
  {
    uf: 'BA',
    name: 'Bahia',
    cities: sortCities(['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Juazeiro', 'Lauro de Freitas', 'Itabuna', 'Ilhéus', 'Porto Seguro', 'Jequié'])
  },
  {
    uf: 'TO',
    name: 'Tocantins',
    cities: sortCities(['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional', 'Paraíso do Tocantins', 'Araguatins', 'Colinas do Tocantins', 'Guaraí', 'Tocantinópolis', 'Dianópolis'])
  },
  {
    uf: 'PI',
    name: 'Piauí',
    cities: sortCities(['Teresina', 'Parnaíba', 'Picos', 'Piripiri', 'Floriano', 'Barras', 'Campo Maior', 'União', 'Altos', 'Esperantina'])
  },
  {
    uf: 'PB',
    name: 'Paraíba',
    cities: sortCities(['João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux', 'Sousa', 'Cabedelo', 'Cajazeiras', 'Guarabira', 'Sapé'])
  },
  {
    uf: 'MT',
    name: 'Mato Grosso',
    cities: sortCities(['Sinop', 'Sorriso', 'Lucas do Rio Verde', 'Nova Mutum', 'Cuiabá', 'Rondonópolis', 'Primavera do Leste', 'Tangará da Serra'])
  },
  {
    uf: 'PR',
    name: 'Paraná',
    cities: sortCities(['Cascavel', 'Londrina', 'Maringá', 'Ponta Grossa', 'Curitiba', 'Foz do Iguaçu'])
  },
  {
    uf: 'GO',
    name: 'Goiás',
    cities: sortCities(['Rio Verde', 'Jataí', 'Cristalina', 'Goiânia', 'Anápolis'])
  }
];

const statesDb = new Persistence<StateData>('states', [...FALLBACK_STATE_DATABASE]);
let _stateDatabase: StateData[] = [...FALLBACK_STATE_DATABASE];
let _isSupabaseLoaded = false;
let ufsChannel: ReturnType<typeof supabase.channel> | null = null;
let citiesChannel: ReturnType<typeof supabase.channel> | null = null;
let _realtimeStarted = false;

// Load data from Supabase on startup using optimized parallel loader
const loadFromSupabase = async () => {
  try {
    const stats = await waitForInit();
    
    if (!stats.data.ufs || !stats.data.cities) {
      throw new Error('UFs ou Cities não carregadas');
    }

    // Build state database from pre-loaded data
    const newStateDatabase: StateData[] = [];
    const ufsMap = new Map<number, SupabaseUF>();
    
    stats.data.ufs.forEach((uf: any) => {
      ufsMap.set(uf.id, uf);
      newStateDatabase.push({
        uf: uf.uf,
        name: uf.name,
        cities: []
      });
    });

    // Map cities to their states
    stats.data.cities.forEach((city: any) => {
      const ufData = ufsMap.get(city.uf_id);
      if (ufData) {
        const stateIndex = newStateDatabase.findIndex(s => s.uf === ufData.uf);
        if (stateIndex >= 0) {
          newStateDatabase[stateIndex].cities.push(city.name);
        }
      }
    });

    // Sort cities in each state
    newStateDatabase.forEach(state => {
      state.cities = sortCities(state.cities);
    });

    _stateDatabase = newStateDatabase;
    statesDb.setAll(newStateDatabase);
    _isSupabaseLoaded = true;
    
  } catch (error) {
    console.warn('⚠️ LocationService: Usando fallback:', error);
    _stateDatabase = [...FALLBACK_STATE_DATABASE];
    statesDb.setAll([...FALLBACK_STATE_DATABASE]);
    _isSupabaseLoaded = false;
  }
};

// ❌ NÃO inicializar automaticamente - aguardar autenticação
// Será chamado por initializeSupabaseData() no App.tsx após login
// loadFromSupabase();

// --- REALTIME ---
const refreshLocationDataFromSupabase = async () => {
  try {
    const [ufsRes, citiesRes] = await Promise.all([
      supabase.from('ufs').select('id, uf, name, code').order('code'),
      supabase.from('cities').select('id, name, uf_id, code').order('name')
    ]);

    if (ufsRes.error) throw ufsRes.error;
    if (citiesRes.error) throw citiesRes.error;

    const newStateDatabase: StateData[] = [];
    const ufsMap = new Map<number, SupabaseUF>();

    (ufsRes.data || []).forEach((uf: any) => {
      ufsMap.set(uf.id, uf);
      newStateDatabase.push({ uf: uf.uf, name: uf.name, cities: [] });
    });

    (citiesRes.data || []).forEach((city: any) => {
      const ufData = ufsMap.get(city.uf_id);
      if (ufData) {
        const idx = newStateDatabase.findIndex(s => s.uf === ufData.uf);
        if (idx >= 0) newStateDatabase[idx].cities.push(city.name);
      }
    });

    newStateDatabase.forEach(state => { state.cities = sortCities(state.cities); });

    _stateDatabase = newStateDatabase;
    statesDb.setAll(newStateDatabase); // ✅ CRÍTICO: atualiza Persistence para disparar subscribers
    _isSupabaseLoaded = true;
    console.log(`🔁 Realtime: localização atualizada (${newStateDatabase.length} UFs)`);
    // Opcional: disparar evento para componentes interessados
    try {
      const event = new CustomEvent('location:states-changed', { detail: { timestamp: Date.now() } });
      window.dispatchEvent(event);
    } catch {}
  } catch (err) {
    console.warn('⚠️ Realtime: falha ao atualizar UFs/Cities:', err);
  }
};

const startLocationRealtime = () => {
  if (_realtimeStarted) return;
  _realtimeStarted = true;

  if (!ufsChannel) {
    ufsChannel = supabase
      .channel('realtime:ufs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ufs' }, async () => {
        await refreshLocationDataFromSupabase();
      })
      .subscribe(status => {
        // Realtime subscribed
      });
  }

  if (!citiesChannel) {
    citiesChannel = supabase
      .channel('realtime:cities')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cities' }, async () => {
        await refreshLocationDataFromSupabase();
      })
      .subscribe(status => {
        // Realtime subscribed
      });
  }
};

// Inicia Realtime
startLocationRealtime();

export const ALL_STATES_LIST = [
  { uf: 'AC', name: 'Acre' }, { uf: 'AL', name: 'Alagoas' }, { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' }, { uf: 'BA', name: 'Bahia' }, { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' }, { uf: 'ES', name: 'Espírito Santo' }, { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' }, { uf: 'MT', name: 'Mato Grosso' }, { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' }, { uf: 'PA', name: 'Pará' }, { uf: 'PB', name: 'Paraíba' },
  { uf: 'PR', name: 'Paraná' }, { uf: 'PE', name: 'Pernambuco' }, { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' }, { uf: 'RN', name: 'Rio Grande do Norte' }, { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rondônia' }, { uf: 'RR', name: 'Roraima' }, { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' }, { uf: 'SE', name: 'Sergipe' }, { uf: 'TO', name: 'Tocantins' }
];

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return {
    userId: user?.id || 'system',
    userName: user?.name || 'Sistema'
  };
};

export const locationService = {
  loadFromSupabase,
  startRealtime: startLocationRealtime,
  // Get all data structured (for Settings Module)
  getStates: () => {
    return _stateDatabase;
  },

  subscribe: (callback: (items: StateData[]) => void) => {
    startLocationRealtime();
    return statesDb.subscribe(callback);
  },

  // Get flat list of cities (for Autocomplete in Orders)
  getAllCitiesFlat: () => {
    const flatList: { city: string, state: string }[] = [];
    _stateDatabase.forEach(ufData => {
      ufData.cities.forEach(city => {
        flatList.push({ city: city, state: ufData.uf });
      });
    });
    return flatList;
  },

  // Add a city (updates both local DB and Supabase)
  addCity: async (uf: string, cityName: string) => {
    const stateIndex = _stateDatabase.findIndex(s => s.uf === uf);
    
    if (stateIndex >= 0) {
      const state = _stateDatabase[stateIndex];
      if (!state.cities.includes(cityName)) {
        state.cities = sortCities([...state.cities, cityName]);
        _stateDatabase[stateIndex] = state;
        statesDb.setAll([..._stateDatabase]);
        
        const { userId, userName } = getLogInfo();
        logService.addLog({
          userId,
          userName,
          action: 'create',
          module: 'Configurações',
          description: `Adicionou cidade: ${cityName} - ${uf}`,
        });

        // If Supabase is loaded, sync the city to database
        if (_isSupabaseLoaded) {
          try {
            // Get the UF ID from Supabase
            const { data: ufData } = await supabase
              .from('ufs')
              .select('id')
              .eq('uf', uf)
              .single();

            if (ufData) {
              await supabase
                .from('cities')
                .insert({
                  name: cityName,
                  uf_id: ufData.id,
                  code: null,
                  company_id: null
                });
              console.log(`✅ Cidade ${cityName} salva no Supabase`);
            }
          } catch (error) {
            console.warn('⚠️ Erro ao salvar cidade no Supabase:', error);
          }
        }
      }
    }
  },

  removeCity: async (uf: string, cityName: string) => {
    const stateIndex = _stateDatabase.findIndex(s => s.uf === uf);
    
    if (stateIndex >= 0) {
      const state = _stateDatabase[stateIndex];
      state.cities = state.cities.filter(c => c !== cityName);
      _stateDatabase[stateIndex] = state;
      
      const { userId, userName } = getLogInfo();
      logService.addLog({
        userId,
        userName,
        action: 'delete',
        module: 'Configurações',
        description: `Removeu cidade: ${cityName} - ${uf}`,
      });

      // Remove from Supabase
      if (_isSupabaseLoaded) {
        try {
          // Get the UF ID first
          const { data: ufData } = await supabase
            .from('ufs')
            .select('id')
            .eq('uf', uf)
            .single();

          if (ufData) {
            await supabase
              .from('cities')
              .delete()
              .eq('name', cityName)
              .eq('uf_id', ufData.id);
            console.log(`✅ Cidade ${cityName} removida do Supabase`);
          }
        } catch (error) {
          console.warn('⚠️ Erro ao remover cidade do Supabase:', error);
        }
      }
    }
  },

  getAllStatesInfo: () => ALL_STATES_LIST,

  importData: (states: StateData[]) => {
    _stateDatabase = states;
    _isSupabaseLoaded = false;
  },

  // For debugging
  resetToFallback: () => {
    _stateDatabase = [...FALLBACK_STATE_DATABASE];
    _isSupabaseLoaded = false;
  },

  // Check if Supabase is loaded
  isSupabaseReady: () => _isSupabaseLoaded,

  // Resolve city name by ID
  getCityNameById: async (cityId: number | bigint | null): Promise<string | null> => {
    if (!cityId) return null;
    try {
      const { data } = await supabase
        .from('cities')
        .select('name')
        .eq('id', cityId)
        .single();
      return data?.name || null;
    } catch (error) {
      console.error('Erro ao buscar cidade por ID:', error);
      return null;
    }
  },

  // Resolve state UF by ID
  getStateUfById: async (stateId: number | bigint | null): Promise<string | null> => {
    if (!stateId) return null;
    try {
      const { data } = await supabase
        .from('ufs')
        .select('uf')
        .eq('id', stateId)
        .single();
      return data?.uf || null;
    } catch (error) {
      console.error('Erro ao buscar UF por ID:', error);
      return null;
    }
  }

};
