import { supabase } from './supabase';
import { shouldSkipLegacyTableOps } from './realtimeTableAvailability';

// ============================================================================
// TIPOS
// ============================================================================

export interface LoginScreen {
  id: string;
  company_id?: string;
  sequence_order: number;
  image_url: string;
  image_data?: string; // base64 fallback
  title?: string;
  description?: string;
  source: 'upload' | 'ai_generated';
  ai_prompt?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface LoginScreenInput {
  image_url: string;
  image_data?: string;
  title?: string;
  description?: string;
  source: 'upload' | 'ai_generated';
  ai_prompt?: string;
  sequence_order?: number;
}

export interface RotationConfig {
  id: string;
  company_id?: string;
  rotation_frequency: 'daily' | 'weekly' | 'monthly' | 'fixed';
  display_order: 'sequential' | 'random' | 'manual';
  auto_refresh_seconds: number;
  last_rotation_at?: string;
  next_rotation_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RotationConfigInput {
  rotation_frequency: 'daily' | 'weekly' | 'monthly' | 'fixed';
  display_order: 'sequential' | 'random' | 'manual';
  auto_refresh_seconds?: number;
}

// ============================================================================
// ESTADO LOCAL
// ============================================================================

let _screens: LoginScreen[] = [];
let _rotationConfig: RotationConfig | null = null;
let _isLoaded = false;
let _realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let _rotationConfigChannel: ReturnType<typeof supabase.channel> | null = null;
let _loginScreensUnavailable = shouldSkipLegacyTableOps('login_screens');
let _rotationConfigUnavailable = shouldSkipLegacyTableOps('login_rotation_config');

const isMissingRelationError = (error: any) => {
  const code = String(error?.code || '');
  const status = Number(error?.status || error?.statusCode || 0);
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();

  return (
    code === 'PGRST205'
    || code === '42P01'
    || status === 404
    || message.includes('could not find the table')
    || details.includes('could not find the table')
  );
};

// ============================================================================
// LOAD & FETCH
// ============================================================================

/**
 * Carrega imagens ativas da tela inicial
 */
const loadActiveScreens = async (): Promise<LoginScreen[]> => {
  if (_loginScreensUnavailable) {
    _isLoaded = true;
    return _screens;
  }

  try {
    const { data, error } = await supabase
      .from('login_screens')
      .select('*')
      .eq('is_active', true)
      .order('sequence_order', { ascending: true });

    if (error) {
      if (isMissingRelationError(error)) {
        _loginScreensUnavailable = true;
        _isLoaded = true;
        return _screens;
      }
      throw error;
    }
    _screens = data || [];
    _isLoaded = true;
    return _screens;
  } catch (error) {
    _isLoaded = true;
    return [];
  }
};

/**
 * Carrega configuração de rotação
 */
const loadRotationConfig = async (): Promise<RotationConfig | null> => {
  if (_rotationConfigUnavailable) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('login_rotation_config')
      .select('*')
      .limit(1);

    if (error) {
      if (isMissingRelationError(error)) {
        _rotationConfigUnavailable = true;
      }
      return null;
    }
    
    // Se houver dados, retorna o primeiro; se não, retorna null
    _rotationConfig = (data && data.length > 0) ? data[0] : null;
    if (_rotationConfig) {
    } else {
    }
    return _rotationConfig;
  } catch (err) {
    return null;
  }
};

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Adiciona uma nova imagem à tela inicial
 */
const addScreen = async (input: LoginScreenInput): Promise<LoginScreen | null> => {
  if (_loginScreensUnavailable) {
    return null;
  }

  try {
    // Determinar sequence_order
    const maxOrder = _screens.reduce((max, s) => Math.max(max, s.sequence_order), 0);
    const sequenceOrder = input.sequence_order ?? maxOrder + 1;

    const payload = {
      sequence_order: sequenceOrder,
      image_url: input.image_url,
      image_data: input.image_data,
      title: input.title || null,
      description: input.description || null,
      source: input.source,
      ai_prompt: input.ai_prompt || null,
      is_active: true,
      metadata: {
        added_at: new Date().toISOString()
      }
    };

    const { data, error } = await supabase
      .from('login_screens')
      .insert([payload])
      .select()
      .single();

    if (error) {
      if (isMissingRelationError(error)) {
        _loginScreensUnavailable = true;
        return null;
      }
      throw error;
    }

    // Adicionar ao cache local
    if (data) {
      _screens.push(data);
      window.dispatchEvent(new Event('login_screens:updated'));
    }

    return data || null;
  } catch (error) {
    return null;
  }
};

/**
 * Atualiza uma imagem existente
 */
const updateScreen = async (id: string, updates: Partial<LoginScreenInput> & { is_active?: boolean; sequence_order?: number }): Promise<LoginScreen | null> => {
  if (_loginScreensUnavailable) {
    return null;
  }

  try {
    const payload: any = {
      image_url: updates.image_url,
      image_data: updates.image_data,
      title: updates.title,
      description: updates.description,
      source: updates.source,
      ai_prompt: updates.ai_prompt,
      sequence_order: updates.sequence_order,
      is_active: updates.is_active
    };

    // Remove campos undefined
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const { data, error } = await supabase
      .from('login_screens')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (isMissingRelationError(error)) {
        _loginScreensUnavailable = true;
        return null;
      }
      throw error;
    }

    // Atualizar cache
    const index = _screens.findIndex(s => s.id === id);
    if (index >= 0 && data) {
      _screens[index] = data;
      window.dispatchEvent(new Event('login_screens:updated'));
    }

    return data || null;
  } catch (error) {
    return null;
  }
};

/**
 * Deleta uma imagem
 */
const deleteScreen = async (id: string): Promise<boolean> => {
  if (_loginScreensUnavailable) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('login_screens')
      .delete()
      .eq('id', id);

    if (error) {
      if (isMissingRelationError(error)) {
        _loginScreensUnavailable = true;
      }
      throw error;
    }

    // Remover do cache
    _screens = _screens.filter(s => s.id !== id);
    window.dispatchEvent(new Event('login_screens:updated'));

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Ativa/desativa uma imagem
 */
const toggleScreenActive = async (id: string, isActive: boolean): Promise<boolean> => {
  if (_loginScreensUnavailable) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('login_screens')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) {
      if (isMissingRelationError(error)) {
        _loginScreensUnavailable = true;
        return false;
      }
      throw error;
    }

    // Atualizar cache
    const screen = _screens.find(s => s.id === id);
    if (screen) {
      screen.is_active = isActive;
      if (!isActive) {
        _screens = _screens.filter(s => s.id !== id);
      }
      window.dispatchEvent(new Event('login_screens:updated'));
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Atualiza configuração de rotação
 */
const updateRotationConfig = async (input: RotationConfigInput): Promise<boolean> => {
  if (_rotationConfigUnavailable) {
    return false;
  }

  try {
    // Se não existe config, criar uma
    if (!_rotationConfig) {
      const { data, error: insertError } = await supabase
        .from('login_rotation_config')
        .insert([{
          rotation_frequency: input.rotation_frequency,
          display_order: input.display_order,
          auto_refresh_seconds: input.auto_refresh_seconds || 0
        }])
        .select()
        .single();

      if (insertError) {
        if (isMissingRelationError(insertError)) {
          _rotationConfigUnavailable = true;
          return false;
        }
        throw insertError;
      }
      _rotationConfig = data || null;
    } else {
      // Atualizar existente
      const { data, error } = await supabase
        .from('login_rotation_config')
        .update({
          rotation_frequency: input.rotation_frequency,
          display_order: input.display_order,
          auto_refresh_seconds: input.auto_refresh_seconds || 0
        })
        .eq('id', _rotationConfig.id)
        .select()
        .single();

      if (error) {
        if (isMissingRelationError(error)) {
          _rotationConfigUnavailable = true;
          return false;
        }
        throw error;
      }
      _rotationConfig = data || null;
    }

    window.dispatchEvent(new Event('login_screens:config_updated'));
    return true;
  } catch (error) {
    return false;
  }
};

// ============================================================================
// REALTIME
// ============================================================================

const startRealtime = () => {
  if (_loginScreensUnavailable) return;

  if (_realtimeChannel) return;

  _realtimeChannel = supabase
    .channel('realtime:login_screens')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'login_screens' }, (payload) => {
      const rec = payload.new || payload.old;
      if (!rec) return;

      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const existing = _screens.findIndex(s => s.id === rec.id);
        if (existing >= 0) {
          _screens[existing] = rec;
        } else if (rec.is_active) {
          _screens.push(rec);
          _screens.sort((a, b) => a.sequence_order - b.sequence_order);
        }
      } else if (payload.eventType === 'DELETE') {
        _screens = _screens.filter(s => s.id !== rec.id);
      }

      dispatchEvent(new Event('login_screens:updated'));
    })
    .subscribe(status => {
      if (status === 'CHANNEL_ERROR') {
        _loginScreensUnavailable = true;
      }
    });

  // Também escuta mudanças de config
  if (_rotationConfigUnavailable) {
    return;
  }

  _rotationConfigChannel = supabase
    .channel('realtime:login_rotation_config')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'login_rotation_config' }, (payload) => {
      const rec = payload.new;
      if (rec) {
        _rotationConfig = rec;
        window.dispatchEvent(new Event('login_screens:config_updated'));
      }
    })
    .subscribe();
};

// ============================================================================
// PUBLIC API
// ============================================================================

export const loginScreenService = {
  // Getters
  getScreens: () => _screens,
  getRotationConfig: () => _rotationConfig,
  isLoaded: () => _isLoaded,

  // Load
  loadActiveScreens,
  loadRotationConfig,
  
  // CRUD
  addScreen,
  updateScreen,
  deleteScreen,
  toggleScreenActive,
  updateRotationConfig,

  // Realtime
  startRealtime,
  stopRealtime: () => {
    if (_realtimeChannel) {
      supabase.removeChannel(_realtimeChannel);
      _realtimeChannel = null;
    }
    if (_rotationConfigChannel) {
      supabase.removeChannel(_rotationConfigChannel);
      _rotationConfigChannel = null;
    }
  }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

// NÃO inicializar automaticamente - aguardar autenticação primeiro
// A inicialização será feita pelo LoginScreen.tsx após login bem-sucedido

// ============================================================================
// EVENT LISTENERS
// ============================================================================

if (typeof window !== 'undefined') {
  window.addEventListener('login_screens:updated', () => {
    // Notificar UI de mudanças
  });

  window.addEventListener('login_screens:config_updated', () => {
    // Notificar UI de mudanças de config
  });
}

export default loginScreenService;
