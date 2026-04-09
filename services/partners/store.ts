import { Persistence } from '../persistence';
import type { Partner, PartnerDB } from './types';

export const db = new Persistence<Partner>('partners', [], { useStorage: false });

export const generateUUID = (): string => {
  if (typeof self !== 'undefined' && self.crypto && self.crypto.randomUUID) {
    return self.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const transformPartnerFromSupabase = (row: any): Partner => {
  const document = row.document?.startsWith('TEMP-') ? 'NÃO INFORMADO' : row.document;
  return {
    id: row.id,
    type: row.type || 'PJ',
    categories: row.partner_type_id ? [row.partner_type_id] : [],
    document,
    name: row.name,
    nickname: row.nickname || undefined,
    tradeName: row.trade_name || undefined,
    email: row.email,
    phone: row.phone,
    active: row.active,
    companyId: row.company_id || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
    address: undefined,
  };
};

export const transformPartnerToSupabase = (partner: Partner, companyId: string | null) => {
  const firstCategory = partner.categories?.[0] || '1';
  const type = partner.type === 'PF' || partner.type === 'PJ' ? partner.type : 'PJ';
  const document = partner.document === 'NÃO INFORMADO' ? `TEMP-${generateUUID()}` : partner.document;

  return {
    id: partner.id,
    name: partner.name,
    nickname: partner.nickname || null,
    trade_name: partner.tradeName || null,
    document,
    type,
    partner_type_id: firstCategory,
    email: partner.email || null,
    phone: partner.phone || null,
    mobile_phone: null,
    website: null,
    notes: null,
    active: partner.active !== false,
    company_id: companyId,
  };
};
