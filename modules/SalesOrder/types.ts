
import { TransactionType, OrderNote } from '../PurchaseOrder/types';

export type SalesStatus = 'draft' | 'pending' | 'approved' | 'completed' | 'canceled';

export interface SalesTransaction {
  id: string;
  type: TransactionType; // 'receipt' typically
  date: string;
  value: number;
  // added discountValue to track discounts in sales transactions
  discountValue?: number;
  accountId: string;
  accountName: string;
  notes?: string;
  deductFromPartner?: boolean;
}

export interface SalesLoading {
  id: string;
  date: string;
  ticket: string; // Romaneio
  plate: string;
  driver: string;
  quantity: number;
  unit: 'SC' | 'KG' | 'TON';
}

export interface SalesOrder {
  id: string;
  number: string;
  date: string;
  
  // Sales Info
  consultantName: string; // Sócio/Vendedor
  customerId: string;
  customerName: string;
  customerDocument: string;
  customerCity: string;
  customerState: string;

  // Product Info
  productName: string;
  quantity?: number; // Optional
  unitPrice?: number; // Optional
  totalValue: number; // Calculated or Manual

  // Financials
  transactions: SalesTransaction[];
  paidValue: number; // Amount received so far

  // Logistics
  loadings: SalesLoading[];

  // ═══════ Dados pré-calculados pelo SQL (VIEW vw_sales_orders_enriched) ═══════
  deliveredQtySc?: number;   // Sacas entregues (descarregadas)
  deliveredValue?: number;   // Valor faturado real (peso destino × preço)
  loadCount?: number;        // Total de carregamentos entregues
  transitCount?: number;     // Cargas ainda na estrada
  transitValue?: number;     // Valor projetado em trânsito

  status: SalesStatus;
  notes?: string; // Mantido para compatibilidade
  notesList?: OrderNote[]; // Novo sistema cronológico
  harvest?: string; // Safra
}
