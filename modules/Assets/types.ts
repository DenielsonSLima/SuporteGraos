export type AssetType = 'vehicle' | 'machine' | 'property' | 'equipment' | 'other';
export type AssetStatus = 'active' | 'sold' | 'write_off';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  description?: string;
  
  // Acquisition
  acquisitionDate: string;
  acquisitionValue: number;
  origin: 'purchase' | 'trade_in';
  originDescription?: string;

  // Status
  status: AssetStatus;
  
  // Sale Info (If status === 'sold')
  saleDate?: string;
  saleValue?: number;
  paidValue?: number;
  buyerName?: string;
  buyerId?: string;

  // Write-off Info (If status === 'write_off')
  writeOffDate?: string;
  writeOffReason?: string;
  writeOffNotes?: string;
  
  // Metadata
  identifier?: string; // Placa, Chassi, Matrícula
}