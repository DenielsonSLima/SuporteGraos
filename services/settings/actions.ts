import { supabase } from '../supabase';
import { authService } from '../authService';
import { logService } from '../logService';
import {
  state,
  notifyCompanyListeners,
  notifyWatermarkListeners,
  COMPANY_KEY,
  WATERMARK_KEY,
  LOGIN_KEY
} from './store';
import type { CompanyData, WatermarkSettings, LoginScreenSettings } from './types';

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return { userId: user?.id || 'system', userName: user?.name | 'Sistema' };
};

export const updateCompanyData = async (data: CompanyData) => {
  if (!data.razaoSocial || !data.nomeFantasia || !data.cnpj) {
    throw new Error('Razão Social, Nome Fantasia e CNPJ são obrigatórios.');
  }

  state.companyData = { ...state.companyData, ...data };
  localStorage.setItem(COMPANY_KEY, JSON.stringify(state.companyData));

  const { userId, userName } = getLogInfo();
  logService.addLog({
    userId, userName, action: 'update', module: 'Configurações',
    description: 'Atualizou dados cadastrais da empresa.'
  });

  const resolvedCompanyId = state.companyId || authService.getCurrentUser()?.companyId;
  const payload = {
    razao_social: state.companyData.razaoSocial,
    nome_fantasia: state.companyData.nomeFantasia,
    cnpj: state.companyData.cnpj,
    ie: state.companyData.ie || null,
    endereco: state.companyData.endereco || null,
    numero: state.companyData.numero || null,
    bairro: state.companyData.bairro || null,
    cidade: state.companyData.cidade || null,
    uf: state.companyData.uf || null,
    cep: state.companyData.cep || null,
    telefone: state.companyData.telefone || null,
    email: state.companyData.email || null,
    website: state.companyData.site || null,
    logo_url: state.companyData.logoUrl || null
  };

  const { data: upserted, error } = resolvedCompanyId
    ? await supabase.from('companies').update(payload).eq('id', resolvedCompanyId).select('id').maybeSingle()
    : await supabase.from('companies').insert(payload).select('id').maybeSingle();

  if (error) {
    if (error.code === '23505') throw new Error('CNPJ já cadastrado no sistema.');
    throw new Error(`Erro ao sincronizar com o banco de dados: ${error.message}`);
  }

  if (upserted?.id) state.companyId = upserted.id;
  notifyCompanyListeners();
};

export const updateWatermark = async (data: Omit<WatermarkSettings, 'orientation'> & { orientation?: 'portrait' | 'landscape' }) => {
  const currentUser = authService.getCurrentUser();
  const newData = {
    imageUrl: data.imageUrl,
    opacity: data.opacity,
    orientation: data.orientation || 'portrait'
  } as WatermarkSettings;

  state.watermarkSettings = { ...state.watermarkSettings, ...newData };
  localStorage.setItem(WATERMARK_KEY, JSON.stringify(state.watermarkSettings));

  logService.addLog({
    ...getLogInfo(), action: 'update', module: 'Configurações',
    description: "Atualizou configurações de marca d'água."
  });

  const payload = {
    id: state.watermarkId || undefined,
    image_url: state.watermarkSettings.imageUrl,
    opacity: state.watermarkSettings.opacity,
    orientation: state.watermarkSettings.orientation,
    active: true,
    company_id: currentUser?.companyId || null
  };

  const { data: upserted, error } = await supabase.from('watermarks').upsert(payload).select('id').maybeSingle();
  if (error) throw new Error("Falha ao salvar a marca d'água.");
  if (upserted?.id) state.watermarkId = upserted.id;
  notifyWatermarkListeners();
};

export const updateLoginSettings = async (settings: Partial<LoginScreenSettings>) => {
  try {
    state.loginScreenSettings = { ...state.loginScreenSettings, ...settings };
    localStorage.setItem(LOGIN_KEY, JSON.stringify(state.loginScreenSettings));
    
    logService.addLog({
      ...getLogInfo(), action: 'update', module: 'Configurações',
      description: 'Atualizou configurações de fundo da tela de login.'
    });

    const companyId = state.companyId || authService.getCurrentUser()?.companyId;
    if (companyId) {
      const { error } = await supabase
        .from('companies')
        .update({ login_settings: state.loginScreenSettings })
        .eq('id', companyId);
      
      if (error) console.error('Erro ao sincronizar login_settings:', error);
    }
  } catch (error) {
    throw new Error("Falha ao salvar configurações de login.");
  }
};

export const getActiveLoginImage = () => {
  const { images, frequency } = state.loginScreenSettings;
  if (!images || images.length === 0) return 'https://images.unsplash.com/photo-1551467013-eb30663473f6?q=80&w=1600';
  if (frequency === 'fixed') return images[0];

  const now = new Date();
  if (frequency === 'daily') {
    const day = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    return images[day % images.length] || images[0];
  }
  if (frequency === 'weekly') {
    const week = Math.ceil((((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7);
    return images[week % images.length] || images[0];
  }
  return images[now.getMonth() % images.length] || images[0];
};

export const getAgroPrompts = () => [
  "High-end professional photography of a vast green corn field at golden hour sunrise.",
  "Macro close-up shot of healthy yellow corn kernels on the cob.",
  "A modern John Deere combine harvester working in a large corn plantation.",
  "Top-down aerial drone shot of a perfectly aligned corn plantation in Brazil.",
  "Industrial corn storage silos in a farm during the harvest season."
];
