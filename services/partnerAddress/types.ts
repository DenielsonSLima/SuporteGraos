/**
 * TIPOS - PARTNER ADDRESS
 */

export interface PartnerAddress {
  id: string;
  partner_id: string;
  street: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city_id?: number;
  state_id?: number;
  zip_code?: string;
  address_type: 'billing' | 'shipping' | 'main' | 'warehouse';
  is_primary: boolean;
  coordinates?: string; // JSON: {"lat": -23.5505, "lng": -46.6333}
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type PartnerAddressInput = Omit<PartnerAddress, 'id' | 'created_at' | 'updated_at'>;

// Campos auxiliares (não persistidos) para resolver city/state → IDs
export interface PartnerAddressNameHints {
  cityName?: string;
  stateName?: string; // pode ser UF ("SP") ou nome ("São Paulo")
}

export type PartnerAddressCreateInput = PartnerAddressInput & PartnerAddressNameHints;
