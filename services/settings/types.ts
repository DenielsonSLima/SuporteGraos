export type RotationFrequency = 'daily' | 'weekly' | 'monthly' | 'fixed';

export interface LoginScreenSettings {
  images: string[];
  frequency: RotationFrequency;
}

export interface WatermarkSettings {
  imageUrl: string | null;
  opacity: number;
  orientation: 'portrait' | 'landscape';
}

export interface CompanyData {
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

export type CompanyListener = (data: CompanyData) => void;
export type WatermarkListener = (data: WatermarkSettings) => void;
