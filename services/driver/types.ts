export interface Driver {
  id: string;
  name: string;
  document: string;
  license_number: string;
  license_expiry_date?: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  address?: string;
  partner_id?: string;
  city_id?: string;
  state_id?: string;
  active: boolean;
  company_id?: string;
  created_at: string;
  updated_at: string;
}
