
export interface Partner {
  id: string;
  type: 'PJ' | 'PF';
  categories: string[]; // Changed from single string to array of strings
  document: string; // CPF or CNPJ
  name: string; // Razão Social or Nome Completo
  nickname?: string; // Apelido ou Nome de Referência
  tradeName?: string; // Nome Fantasia (optional)
  email?: string;
  phone?: string;
  active?: boolean; // Status Ativo/Inativo
  address?: {
    zip: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  createdAt: string;
}

export interface PartnerCategory {
  id: string;
  label: string;
}

// --- Submodule Types: Carriers (Transportadoras) ---

export interface Driver {
  id: string;
  partnerId: string; // Link to the Transportadora
  name: string;
  cpf: string;
  cnh: string;
  cnhCategory: string;
  phone: string;
  linkedVehicleId?: string; // Optional link to a vehicle (creates a Set/Conjunto)
  active: boolean; // Status do motorista
}

export interface Vehicle {
  id: string;
  partnerId: string; // Link to the Transportadora
  plate: string; // Placa do Cavalo
  model: string; // Ex: Scania R450
  type: 'Truck' | 'Bi-Trem' | 'Rodotrem' | 'Vanderleia' | 'Carreta LS';
  trailerPlate1?: string; // Placa Carreta 1
  trailerPlate2?: string; // Placa Carreta 2
  antt?: string;
}
