/**
 * UTILITÁRIOS - PARTNER ADDRESS
 */

import { PartnerAddress, PartnerAddressInput } from './types';

/**
 * Gera UUID compatível com navegador
 */
export const generateUUID = (): string => {
  if (typeof self !== 'undefined' && self.crypto && self.crypto.randomUUID) {
    return self.crypto.randomUUID();
  }
  // Fallback: gera UUID v4 manualmente
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Cria um PartnerAddress com timestamp padrão
 */
export const createPartnerAddress = (input: PartnerAddressInput): PartnerAddress => {
  const now = new Date().toISOString();
  return {
    ...input,
    id: generateUUID(),
    created_at: now,
    updated_at: now
  };
};

/**
 * Transforma dados da API Supabase para formato frontend
 */
export const transformAddressFromSupabase = (data: any): PartnerAddress => {
  return {
    id: data.id,
    partner_id: data.partner_id,
    street: data.street,
    number: data.number,
    complement: data.complement,
    neighborhood: data.neighborhood,
    city_id: data.city_id,
    state_id: data.state_id,
    zip_code: data.zip_code,
    address_type: data.address_type,
    is_primary: data.is_primary,
    coordinates: data.coordinates,
    active: data.active,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
};
