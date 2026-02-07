
import { logService } from './logService';
import { authService } from './authService';
import { supabase } from './supabase';

export type RotationFrequency = 'daily' | 'weekly' | 'monthly' | 'fixed';

interface LoginScreenSettings {
  images: string[];
  frequency: RotationFrequency;
}

interface WatermarkSettings {
  imageUrl: string | null;
  opacity: number;
  orientation: 'portrait' | 'landscape';
}

interface CompanyData {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  ie?: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  site?: string;
  logoUrl: string | null;
}

type CompanyListener = (data: CompanyData) => void;
type WatermarkListener = (data: WatermarkSettings) => void;

// Chaves para persistência
const LOGIN_KEY = 'sg_login_settings';
const COMPANY_KEY = 'sg_company_data';
const WATERMARK_KEY = 'sg_watermark_settings';

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return {
    userId: user?.id || 'system',
    userName: user?.name || 'Sistema'
  };
};

// --- HELPERS DE CARREGAMENTO ---

const loadLoginSettings = (): LoginScreenSettings => {
  const stored = localStorage.getItem(LOGIN_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { }
  }
  return {
    images: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2532&auto=format&fit=crop'],
    frequency: 'fixed'
  };
};

const loadCompanyData = (): CompanyData => {
  const stored = localStorage.getItem(COMPANY_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { }
  }
  return {
    razaoSocial: 'Agro Grãos LTDA',
    nomeFantasia: 'Suporte Grãos',
    cnpj: '12.345.678/0001-90',
    ie: '123.456.789',
    endereco: 'Av. das Indústrias',
    numero: '1000',
    bairro: 'Distrito Industrial',
    cidade: 'Sinop',
    uf: 'MT',
    cep: '78550-000',
    telefone: '(66) 3531-0000',
    email: 'financeiro@suportegraos.com',
    site: 'www.suportegraos.com',
    logoUrl: null
  };
};

const loadWatermarkSettings = (): WatermarkSettings => {
  const stored = localStorage.getItem(WATERMARK_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { }
  }
  return {
    imageUrl: null,
    opacity: 10,
    orientation: 'portrait'
  };
};

const mapCompanyRecord = (record: any): CompanyData => ({
  razaoSocial: record?.razao_social || '',
  nomeFantasia: record?.nome_fantasia || '',
  cnpj: record?.cnpj || '',
  ie: record?.ie || '',
  endereco: record?.endereco || '',
  numero: record?.numero || '',
  bairro: record?.bairro || '',
  cidade: record?.cidade || '',
  uf: record?.uf || '',
  cep: record?.cep || '',
  telefone: record?.telefone || '',
  email: record?.email || '',
  site: record?.website || '',
  logoUrl: record?.logo_url || null
});

const companyListeners: CompanyListener[] = [];
const watermarkListeners: WatermarkListener[] = [];

const mapWatermarkRecord = (record: any): WatermarkSettings => ({
  imageUrl: record?.image_url || null,
  opacity: typeof record?.opacity === 'number' ? record.opacity : 15,
  orientation: record?.orientation === 'landscape' ? 'landscape' : 'portrait'
});

const notifyCompanyListeners = () => {
  companyListeners.forEach(listener => {
    try {
      listener(_companyData);
    } catch (err) {
      console.error('Erro ao notificar listener de empresa:', err);
    }
  });
};

const notifyWatermarkListeners = () => {
  watermarkListeners.forEach(listener => {
    try {
      listener(_watermarkSettings);
    } catch (err) {
      console.error('Erro ao notificar listener de marca d\'água:', err);
    }
  });
};

// --- VARIÁVEIS EM MEMÓRIA ---
let _loginScreenSettings = loadLoginSettings();
let _companyData = loadCompanyData();
let _watermarkSettings = loadWatermarkSettings();
let _companyId: string | null = null;
let _watermarkId: string | null = null;
let companyChannel: ReturnType<typeof supabase.channel> | null = null;
let watermarkChannel: ReturnType<typeof supabase.channel> | null = null;

const startCompanyRealtime = () => {
  if (companyChannel) return;

  companyChannel = supabase
    .channel('realtime:companies')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, payload => {
      const record = payload.new || payload.old;
      if (!record) return;

      _companyId = record.id || _companyId;
      _companyData = mapCompanyRecord(record);
      localStorage.setItem(COMPANY_KEY, JSON.stringify(_companyData));
      notifyCompanyListeners();

      console.log(`🔔 Atualização em companies via realtime (${payload.eventType})`);
    })
    .subscribe(status => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime de companies ativo');
      }
    });
};

const startWatermarkRealtime = () => {
  if (watermarkChannel) return;

  watermarkChannel = supabase
    .channel('realtime:watermarks')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'watermarks' }, payload => {
      const record = payload.new || payload.old;
      if (!record) return;

      _watermarkId = record.id || _watermarkId;
      _watermarkSettings = mapWatermarkRecord(record);
      localStorage.setItem(WATERMARK_KEY, JSON.stringify(_watermarkSettings));
      notifyWatermarkListeners();

      console.log(`🔔 Atualização em watermarks via realtime (${payload.eventType})`);
    })
    .subscribe(status => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime de watermarks ativo');
      }
    });
};

const fetchCompanyFromSupabase = async (): Promise<boolean> => {
  const { data, error } = await supabase
    .from('companies')
    .select('id, razao_social, nome_fantasia, cnpj, ie, endereco, numero, bairro, cidade, uf, cep, telefone, email, website, logo_url')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (!data) {
    console.log('⚠️ settingsService: nenhuma empresa encontrada no Supabase. Mantendo dados locais.');
    return false;
  }

  _companyId = data.id;
  _companyData = mapCompanyRecord(data);
  localStorage.setItem(COMPANY_KEY, JSON.stringify(_companyData));
  notifyCompanyListeners();
  console.log('✅ settingsService: company sincronizada com Supabase');
  return true;
};

const fetchWatermarkFromSupabase = async (): Promise<boolean> => {
  const { data, error } = await supabase
    .from('watermarks')
    .select('id, image_url, opacity, orientation')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (!data) {
    console.log('⚠️ settingsService: nenhuma marca d\'água encontrada no Supabase. Mantendo dados locais.');
    return false;
  }

  _watermarkId = data.id;
  _watermarkSettings = mapWatermarkRecord(data);
  localStorage.setItem(WATERMARK_KEY, JSON.stringify(_watermarkSettings));
  notifyWatermarkListeners();
  console.log('✅ settingsService: watermark sincronizada com Supabase');
  return true;
};

const loadSettingsFromSupabase = async () => {
  console.log('🔄 settingsService: sincronizando com Supabase...');
  const [companyResult, watermarkResult] = await Promise.allSettled([
    fetchCompanyFromSupabase(),
    fetchWatermarkFromSupabase()
  ]);

  if (companyResult.status === 'rejected') {
    console.warn('⚠️ settingsService: falha ao carregar dados da empresa do Supabase:', companyResult.reason);
  }
  if (watermarkResult.status === 'rejected') {
    console.warn('⚠️ settingsService: falha ao carregar marca d\'água do Supabase:', watermarkResult.reason);
  }

  startCompanyRealtime();
  startWatermarkRealtime();

  return {
    companyLoaded: companyResult.status === 'fulfilled' ? companyResult.value : false,
    watermarkLoaded: watermarkResult.status === 'fulfilled' ? watermarkResult.value : false
  };
};

// ❌ NÃO inicializar automaticamente - aguardar autenticação via supabaseInitService
// Load company from Supabase on startup (fallback to localStorage)
// (async () => {
//   try {
//     const { data, error } = await supabase
//       .from('companies')
//       .select(
//         'id, razao_social, nome_fantasia, cnpj, ie, endereco, numero, bairro, cidade, uf, cep, telefone, email, website, logo_url'
//       )
//       .order('created_at', { ascending: true })
//       .limit(1)
//       .maybeSingle();

//     if (error) throw error;
//     if (data) {
//       _companyId = data.id;
//       _companyData = mapCompanyRecord(data);
//       localStorage.setItem(COMPANY_KEY, JSON.stringify(_companyData));
//       notifyCompanyListeners();
//       console.log('✅ Company carregada do Supabase');
//     }
//   } catch (err) {
//     console.warn('⚠️ settingsService: usando company do localStorage. Motivo:', err);
//   } finally {
//     startCompanyRealtime();
//   }
// })();

// ❌ NÃO inicializar automaticamente - aguardar autenticação via supabaseInitService
// Load watermark from Supabase on startup (fallback to localStorage)
// (async () => {
//   try {
//     const { data, error } = await supabase
//       .from('watermarks')
//       .select('id, image_url, opacity, orientation')
//       .order('created_at', { ascending: true })
//       .limit(1)
//       .maybeSingle();

//     if (error) throw error;
//     if (data) {
//       _watermarkId = data.id;
//       _watermarkSettings = mapWatermarkRecord(data);
//       localStorage.setItem(WATERMARK_KEY, JSON.stringify(_watermarkSettings));
//       notifyWatermarkListeners();
//       console.log('✅ Watermark carregada do Supabase');
//     }
//   } catch (err) {
//     console.warn('⚠️ settingsService: usando watermark do localStorage. Motivo:', err);
//   } finally {
//     startWatermarkRealtime();
//   }
// })();

export const settingsService = {
  loadFromSupabase: () => loadSettingsFromSupabase(),
  startRealtime: () => {
    startCompanyRealtime();
    startWatermarkRealtime();
  },
  // --- DADOS DA EMPRESA ---
  getCompanyData: () => _companyData,

  onCompanyChange: (listener: CompanyListener) => {
    companyListeners.push(listener);
    return () => {
      const index = companyListeners.indexOf(listener);
      if (index >= 0) {
        companyListeners.splice(index, 1);
      }
    };
  },

  updateCompanyData: async (data: CompanyData) => {
    try {
      // Validações básicas
      if (!data.razaoSocial || !data.nomeFantasia || !data.cnpj) {
        throw new Error('Razão Social, Nome Fantasia e CNPJ são obrigatórios.');
      }

      // Atualiza em memória e localStorage primeiro
      _companyData = { ..._companyData, ...data };
      localStorage.setItem(COMPANY_KEY, JSON.stringify(_companyData));
      
      const { userId, userName } = getLogInfo();
      logService.addLog({ 
        userId, userName, action: 'update', module: 'Configurações', 
        description: 'Atualizou dados cadastrais da empresa.' 
      });

      // Persistir no Supabase
      try {
        const payload = {
          id: _companyId || undefined,
          razao_social: _companyData.razaoSocial,
          nome_fantasia: _companyData.nomeFantasia,
          cnpj: _companyData.cnpj,
          ie: _companyData.ie || null,
          endereco: _companyData.endereco || null,
          numero: _companyData.numero || null,
          bairro: _companyData.bairro || null,
          cidade: _companyData.cidade || null,
          uf: _companyData.uf || null,
          cep: _companyData.cep || null,
          telefone: _companyData.telefone || null,
          email: _companyData.email || null,
          website: _companyData.site || null,
          logo_url: _companyData.logoUrl || null,
          active: true
        };

        console.log('🔵 Tentando salvar company no Supabase...');
        console.log('🔵 Payload:', JSON.stringify(payload, null, 2));
        console.log('🔵 Company ID existente:', _companyId);

        const { data: upserted, error } = await supabase
          .from('companies')
          .upsert(payload, { onConflict: 'cnpj' })
          .select('id')
          .maybeSingle();

        console.log('🔵 Resposta Supabase:', { data: upserted, error });

        if (error) {
          console.error('❌ Erro Supabase completo:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        
        if (upserted?.id) {
          _companyId = upserted.id;
          console.log('✅ Company salva no Supabase com ID:', _companyId);
        } else {
          console.log('✅ Company salva no Supabase (sem retorno de ID)');
        }

        // Notifica listeners apenas após salvar com sucesso
        notifyCompanyListeners();
      } catch (dbErr: any) {
        console.error('❌ Erro CRÍTICO ao salvar company no Supabase:', dbErr);
        console.error('❌ Stack trace:', dbErr.stack);
        
        // Mensagens de erro mais específicas
        if (dbErr.code === '23505') {
          throw new Error('CNPJ já cadastrado no sistema.');
        } else if (dbErr.message?.includes('logo_url')) {
          throw new Error('Erro ao salvar a logomarca. A imagem pode ser muito grande (máximo 2MB recomendado).');
        } else {
          throw new Error(`Erro ao sincronizar com o banco de dados: ${dbErr.message}`);
        }
      }
    } catch (error: any) {
      console.error("Erro ao salvar dados da empresa:", error);
      throw error; // Re-throw para o componente tratar
    }
  },

  // --- MARCA D'ÁGUA ---
  getWatermark: () => _watermarkSettings,

  onWatermarkChange: (listener: WatermarkListener) => {
    watermarkListeners.push(listener);
    return () => {
      const index = watermarkListeners.indexOf(listener);
      if (index >= 0) {
        watermarkListeners.splice(index, 1);
      }
    };
  },

  updateWatermark: async (data: WatermarkSettings) => {
    try {
      _watermarkSettings = { ..._watermarkSettings, ...data };
      localStorage.setItem(WATERMARK_KEY, JSON.stringify(_watermarkSettings));
      
      const { userId, userName } = getLogInfo();
      logService.addLog({ 
        userId, userName, action: 'update', module: 'Configurações', 
        description: 'Atualizou configurações de marca d\'água.' 
      });

      try {
        const payload = {
          id: _watermarkId || undefined,
          image_url: _watermarkSettings.imageUrl,
          opacity: _watermarkSettings.opacity,
          orientation: _watermarkSettings.orientation,
          active: true
        };

        const { data: upserted, error } = await supabase
          .from('watermarks')
          .upsert(payload)
          .select('id')
          .maybeSingle();

        if (error) {
          console.error('❌ Erro Supabase (watermarks):', error);
          throw error;
        }

        if (upserted?.id) {
          _watermarkId = upserted.id;
          console.log('✅ Watermark salva no Supabase com ID:', _watermarkId);
        } else {
          console.log('✅ Watermark salva no Supabase (sem retorno de ID)');
        }

        notifyWatermarkListeners();
      } catch (dbErr: any) {
        console.error('❌ Erro ao salvar watermark no Supabase:', dbErr);
        throw dbErr;
      }
    } catch (error) {
      console.error("Erro ao salvar marca d'água:", error);
      throw new Error("Falha ao salvar. A imagem da marca d'água pode ser muito grande.");
    }
  },

  // --- TELA DE LOGIN ---
  getLoginSettings: () => _loginScreenSettings,
  
  updateLoginSettings: (settings: Partial<LoginScreenSettings>) => {
    try {
      _loginScreenSettings = { ..._loginScreenSettings, ...settings };
      localStorage.setItem(LOGIN_KEY, JSON.stringify(_loginScreenSettings));
      
      const { userId, userName } = getLogInfo();
      logService.addLog({ 
        userId, userName, action: 'update', module: 'Configurações', 
        description: 'Atualizou configurações de fundo da tela de login.' 
      });
    } catch (error) {
      console.error("Erro ao salvar imagens de login:", error);
      throw new Error("Limite de armazenamento do navegador atingido. Tente usar menos imagens.");
    }
  },

  getActiveLoginImage: () => {
    const { images, frequency } = _loginScreenSettings;
    if (!images || images.length === 0) return 'https://images.unsplash.com/photo-1551467013-eb30663473f6?q=80&w=1600';
    if (frequency === 'fixed') return images[0];

    const now = new Date();
    let index = 0;

    if (frequency === 'daily') {
      const start = new Date(now.getFullYear(), 0, 0);
      const diff = now.getTime() - start.getTime();
      const day = Math.floor(diff / (1000 * 60 * 60 * 24));
      index = day % images.length;
    } else if (frequency === 'weekly') {
      const oneJan = new Date(now.getFullYear(), 0, 1);
      const week = Math.ceil((((now.getTime() - oneJan.getTime()) / 86400000) + oneJan.getDay() + 1) / 7);
      index = week % images.length;
    } else if (frequency === 'monthly') {
      index = now.getMonth() % images.length;
    }

    return images[index] || images[0];
  },

  getAgroPrompts: () => [
    "High-end professional photography of a vast green corn field at golden hour sunrise, morning mist, 8k resolution, cinematic lighting.",
    "Macro close-up shot of healthy yellow corn kernels on the cob, shallow depth of field, water droplets, commercial photography style.",
    "A modern John Deere combine harvester working in a large corn plantation, dusty sunset background, powerful agricultural machinery, 4k.",
    "Top-down aerial drone shot of a perfectly aligned corn plantation in Brazil, geometric agricultural patterns, vibrant green colors.",
    "A professional farmer silhouette standing in the middle of tall corn stalks at dawn, inspiring and dramatic lighting.",
    "Modern agricultural irrigation system pivot spraying water over a corn field under a clear blue sky, rainbow appearing in the mist.",
    "Close-up of corn sprouts emerging from fertile dark earth, straight lines, focus on the small green leaves, spring growth.",
    "Industrial corn storage silos in a farm during the harvest season, sunset background, rural technology aesthetic.",
    "Detailed shot of dried corn ears stacked in a rustic wooden barn, warm interior lighting, high resolution texture.",
    "A wide-angle landscape of a corn harvest in the Mato Grosso region of Brazil, vast horizon, blue sky with fluffy clouds.",
    "High-tech agriculture drone flying over a corn field for monitoring, futuristic farming concept, sharp focus.",
    "Golden ripe corn field ready for harvest, waving in the wind, close perspective from ground level looking up to the sky."
  ]
};
