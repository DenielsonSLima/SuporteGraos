import { OrderTransaction } from '../PurchaseOrder/types';

export type LoadingStatus = 'loaded' | 'in_transit' | 'unloading' | 'completed' | 'redirected' | 'canceled';

export interface LoadingExtraExpense {
  id: string;
  description: string;
  value: number;
  type: 'deduction' | 'addition'; // deduction = desconta do motorista, addition = soma ao frete
  date: string;
  notes?: string;
}

export interface Loading {
  id: string;
  companyId?: string; // ✅ Adicionado para garantir vínculo correto
  date: string;

  // Documento Fiscal
  invoiceNumber?: string;

  // Origin (Purchase)
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  supplierName: string;

  // Transport
  carrierId: string;
  carrierName: string;
  driverId: string;
  driverName: string;
  vehiclePlate: string;
  isClientTransport?: boolean;

  // Cargo Data
  product: string;
  weightKg: number;
  weightTon: number;
  weightSc: number;

  // Unloading Data
  unloadWeightKg?: number;
  breakageKg?: number;

  // Financials - Purchase Side
  purchasePricePerSc: number;
  totalPurchaseValue: number;
  productPaid: number;

  // Financials - Freight Side
  freightPricePerTon: number;
  totalFreightValue: number; // Valor Bruto (Peso * Preço)
  freightAdvances: number;
  freightPaid: number;

  // Gestão de Extras (Novo)
  extraExpenses: LoadingExtraExpense[];

  transactions: OrderTransaction[];

  // Destination (Sales)
  salesOrderId: string;
  salesOrderNumber: string;
  customerName: string;
  salesPrice: number;
  totalSalesValue: number;

  status: LoadingStatus;
  notes?: string;

  isRedirected?: boolean;
  originalDestination?: string;
  redirectDisplacementValue?: number; // VALOR ADICIONAL DE DESLOCAMENTO
  freightBase?: 'Origem' | 'Destino'; // Base de cálculo do frete (trigger SQL é a autoridade)
}