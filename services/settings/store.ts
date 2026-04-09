import type {
  LoginScreenSettings,
  CompanyData,
  WatermarkSettings,
  CompanyListener,
  WatermarkListener
} from './types';

export const LOGIN_KEY = 'sg_login_settings';
export const COMPANY_KEY = 'sg_company_data';
export const WATERMARK_KEY = 'sg_watermark_settings';

export const loadLoginSettings = (): LoginScreenSettings => {
  if (typeof window === 'undefined') return { images: [], frequency: 'fixed' };
  const stored = localStorage.getItem(LOGIN_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { }
  }
  return {
    images: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2532&auto=format&fit=crop'],
    frequency: 'fixed'
  };
};

export const loadCompanyData = (): CompanyData => {
  if (typeof window === 'undefined') return {} as CompanyData;
  const stored = localStorage.getItem(COMPANY_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { }
  }
  return {
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    ie: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    telefone: '',
    email: '',
    site: '',
    logoUrl: null
  };
};

export const loadWatermarkSettings = (): WatermarkSettings => {
  if (typeof window === 'undefined') return { imageUrl: null, opacity: 15, orientation: 'portrait' };
  const stored = localStorage.getItem(WATERMARK_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { }
  }
  return {
    imageUrl: null,
    opacity: 15,
    orientation: 'portrait'
  };
};

export const mapCompanyRecord = (record: any): CompanyData => ({
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

export const mapWatermarkRecord = (record: any): WatermarkSettings => ({
  imageUrl: record?.image_url || null,
  opacity: typeof record?.opacity === 'number' ? record.opacity : 15,
  orientation: record?.orientation === 'landscape' ? 'landscape' : 'portrait'
});

export const state = {
  loginScreenSettings: loadLoginSettings(),
  companyData: loadCompanyData(),
  watermarkSettings: loadWatermarkSettings(),
  companyId: null as string | null,
  watermarkId: null as string | null,
  companyListeners: [] as CompanyListener[],
  watermarkListeners: [] as WatermarkListener[]
};

export const notifyCompanyListeners = () => {
  state.companyListeners.forEach(listener => {
    try { listener(state.companyData); } catch (err) { }
  });
};

export const notifyWatermarkListeners = () => {
  state.watermarkListeners.forEach(listener => {
    try { listener(state.watermarkSettings); } catch (err) { }
  });
};
