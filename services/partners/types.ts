import type { Partner } from '../../modules/Partners/types';

export type { Partner };

export interface PartnerDB {
  id: string;
  name: string;
  nickname?: string | null;
  trade_name?: string | null;
  document: string;
  type: 'PF' | 'PJ';
  partner_type_id: string;
  email?: string | null;
  phone?: string | null;
  mobile_phone?: string | null;
  website?: string | null;
  notes?: string | null;
  active: boolean;
  company_id: string;
  created_at: string;
  updated_at?: string | null;
}
