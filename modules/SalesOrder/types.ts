
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

  status: SalesStatus;
  notes?: string; // Mantido para compatibilidade
  notesList?: OrderNote[]; // Novo sistema cronológico
}
