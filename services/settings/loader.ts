import { supabase } from '../supabase';
import { authService } from '../authService';
import {
  state,
  mapCompanyRecord,
  mapWatermarkRecord,
  notifyCompanyListeners,
  notifyWatermarkListeners,
  COMPANY_KEY,
  WATERMARK_KEY
} from './store';

export const fetchCompanyFromSupabase = async (): Promise<boolean> => {
  let user = authService.getCurrentUser();
  let companyId = user?.companyId || state.companyId;

  console.log('[SettingsLoader] Iniciando fetch da empresa. CompanyID atual:', companyId);

  if (!companyId) {
    user = await authService.restoreSession();
    companyId = user?.companyId;
  }

  if (!companyId) {
    console.warn('[SettingsLoader] CompanyID não encontrado. Abortando fetch.');
    return false;
  }

  const { data, error } = await supabase
    .from('companies')
    .select('id, razao_social, nome_fantasia, cnpj, ie, endereco, numero, bairro, cidade, uf, cep, telefone, email, website, logo_url')
    .eq('id', companyId)
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('[SettingsLoader] Erro ao buscar empresa:', error);
    throw error;
  }
  
  if (!data) {
    console.warn('[SettingsLoader] Nenhum dado retornado para a empresa:', companyId);
    return false;
  }

  state.companyId = data.id;
  state.companyData = mapCompanyRecord(data);
  
  // O campo login_settings foi desativado temporariamente por não existir na tabela
  // if (data.login_settings) { ... }

  localStorage.setItem(COMPANY_KEY, JSON.stringify(state.companyData));
  state.initialized = true;
  notifyCompanyListeners();
  console.log('[SettingsLoader] Dados da empresa carregados com sucesso:', data.razao_social);
  return true;
};

export const fetchWatermarkFromSupabase = async (): Promise<boolean> => {
  let user = authService.getCurrentUser();
  let companyId = user?.companyId;

  if (!companyId) {
    user = await authService.restoreSession();
    companyId = user?.companyId;
  }

  if (!companyId) return false;

  const { data, error } = await supabase
    .from('watermarks')
    .select('id, image_url, opacity, orientation')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return false;

  state.watermarkId = data.id;
  state.watermarkSettings = mapWatermarkRecord(data);
  localStorage.setItem(WATERMARK_KEY, JSON.stringify(state.watermarkSettings));
  notifyWatermarkListeners();
  return true;
};

export const loadFromSupabase = async () => {
  const [companyResult, watermarkResult] = await Promise.allSettled([
    fetchCompanyFromSupabase(),
    fetchWatermarkFromSupabase()
  ]);

  return {
    companyLoaded: companyResult.status === 'fulfilled' ? companyResult.value : false,
    watermarkLoaded: watermarkResult.status === 'fulfilled' ? watermarkResult.value : false
  };
};
