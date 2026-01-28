
export type FreightStatus = 'scheduled' | 'loaded' | 'in_transit' | 'waiting_unload' | 'completed' | 'canceled' | 'redirected';
export type FreightFinancialStatus = 'pending' | 'partial' | 'paid';

export interface Freight {
  id: string;
  orderNumber: string; // Vínculo com Pedido (Compra ou Venda)
  date: string;
  
  // Carrier & Driver
  carrierName: string;
  driverName: string;
  vehiclePlate: string;
  
  // Route
  supplierName: string; // Nome do Parceiro de Origem (Quem vendeu o milho)
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  
  // Cargo
  product: string;
  weight: number; // kg
  unit: 'KG' | 'TON' | 'SC';
  merchandiseValue: number; // Valor da carga transportada (para seguro/KPI)
  unloadWeightKg?: number; // Peso descarregado (quando houver)
  breakageKg?: number; // Diferença Origem - Destino (positivo = quebra)
  freightBase?: 'Origem' | 'Destino';
  
  // Financials
  pricePerUnit: number; // Preço do frete
  totalFreight: number;
  paidValue: number; // Valor já pago (Adiantamentos + Saldos)
  advanceValue: number; // Adiantamento já pago
  balanceValue: number; // Saldo a pagar
  
  status: FreightStatus;
  financialStatus: FreightFinancialStatus;
  
  notes?: string;
}
