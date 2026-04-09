export interface Vehicle {
  id: string;
  plate: string;
  type: 'truck' | 'bitruck' | 'carreta_ls' | 'vanderleia' | 'bi_trem' | 'rodotrem' | 'outros';
  capacity_kg?: number;
  owner_type: 'own' | 'third_party';
  owner_partner_id?: string;
  owner_transporter_id?: string;
  year?: number;
  model?: string;
  color?: string;
  active: boolean;
  company_id?: string;
  created_at: string;
  updated_at: string;
}
