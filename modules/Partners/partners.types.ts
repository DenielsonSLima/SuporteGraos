// modules/Partners/partners.types.ts
// ============================================================================
// Tipos canônicos do módulo Parceiros (SKILL §9.4: {modulo}.types.ts)
// ============================================================================

export interface Partner {
  id: string;
  companyId: string;
  partnerTypeId?: string;
  type: 'PJ' | 'PF';
  categories: string[]; // No frontend mantemos como array para o form, mas no banco salvamos o primeiro
  document: string; // CPF ou CNPJ
  name: string; // Razão Social ou Nome Completo
  tradeName?: string; // Nome Fantasia
  nickname?: string; // Apelido
  email?: string;
  phone?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  address?: PartnerAddress; // Endereço principal para exibição rápida
}

export interface PartnerAddress {
  id: string;
  companyId: string;
  partnerId: string;
  cityId?: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  complement?: string;
  isPrimary: boolean;
  cityName?: string; // Virtual/Join
  stateUf?: string; // Virtual/Join
}

export interface Driver {
  id: string;
  companyId: string;
  partnerId: string; // Link para a Transportadora
  name: string;
  cnhNumber?: string;
  cnhCategory?: string;
  cpf?: string;
  phone?: string;
  active: boolean;
  linkedVehicleId?: string;
  createdAt?: string;
}

export interface Vehicle {
  id: string;
  companyId: string;
  partnerId: string; // Link para a Transportadora
  plate: string;
  brand?: string;
  model?: string;
  color?: string;
  year?: number;
  active: boolean;
  createdAt?: string;
}

export interface PartnerCategory {
  id: string;
  label: string;
}

export interface SavePartnerAddressData {
  partnerId?: string;
  companyId?: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  complement?: string;
  cityName: string;
  stateUf: string;
  isPrimary?: boolean;
}

export type SavePartnerData = Omit<Partner, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'address'> & {
  address?: SavePartnerAddressData;
  active?: boolean;
  updatedAt?: string;
};
