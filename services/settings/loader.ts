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
  let companyId = user?.companyId;

  if (!companyId) {
    user = await authService.restoreSession();
    companyId = user?.companyId;
  }

  if (!companyId) return false;

  const { data, error } = await supabase
    .from('companies')
    .select('id, razao_social, nome_fantasia, cnpj, ie, endereco, numero, bairro, cidade, uf, cep, telefone, email, website, logo_url, login_settings')
    .eq('id', companyId)
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return false;

  state.companyId = data.id;
  state.companyData = mapCompanyRecord(data);
  
  if (data.login_settings) {
    state.loginScreenSettings = data.login_settings;
    localStorage.setItem('settings_login', JSON.stringify(state.loginScreenSettings));
  }

  localStorage.setItem(COMPANY_KEY, JSON.stringify(state.companyData));
  notifyCompanyListeners();
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
