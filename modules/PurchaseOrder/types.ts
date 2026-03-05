
export type OrderStatus = 'draft' | 'pending' | 'approved' | 'transport' | 'completed' | 'canceled';

export type ProductUnit = 'KG' | 'SC' | 'TON';

export type TransactionType = 'payment' | 'advance' | 'expense' | 'commission' | 'receipt' | 'reversal';

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unit: ProductUnit;
  unitPrice: number;
  total: number;
}

export interface OrderNote {
  id: string;
  date: string;
  text: string;
  author: string;
}

export interface OrderTransaction {
  id: string;
  type: TransactionType;
  date: string;
  value: number;
  discountValue?: number; // Valor de desconto aplicado nesta transação
  accountId: string; 
  accountName: string; 
  notes?: string;
  deductFromPartner?: boolean;
  /** Quando 'reversed', indica que esta transação foi estornada (SKIL §3.6) */
  status?: 'active' | 'reversed';
  /** ID da transação original (presente em transações do tipo 'reversal') */
  originalTxId?: string;
}

export interface PurchaseOrder {
  id: string;
  number: string; 
  date: string;
  status: OrderStatus;
  
  // Buyer Info
  consultantName: string; 

  // Partner Info
  partnerId: string;
  partnerName: string;
  partnerDocument: string; 
  partnerCity: string; 
  partnerState: string;
  
  // Logistics / Harvest
  useRegisteredLocation: boolean; 
  loadingCity: string;
  loadingState: string;
  loadingComplement?: string; // Complemento: Fazenda, Sítio, Unidade, etc
  harvest: string; 

  // Broker Info
  hasBroker: boolean;
  brokerId?: string;
  brokerName?: string;
  brokerCommissionPerSc?: number; 
  deductBrokerCommission?: boolean; 

  // Financials
  items: OrderItem[];
  transactions: OrderTransaction[]; 
  totalValue: number;
  paidValue: number;
  discountValue?: number; // Total acumulado de descontos
  transportValue: number;
  
  // Notes System
  notes?: string; 
  notesList?: OrderNote[]; 
}
