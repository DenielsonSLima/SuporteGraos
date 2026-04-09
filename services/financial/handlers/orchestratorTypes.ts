/**
 * ============================================================================
 * TIPOS COMPARTILHADOS DO ORQUESTRADOR DE PAGAMENTOS
 * ============================================================================
 */

export interface PaymentData {
  date: string;
  amount: number;
  discount: number;
  accountId: string;
  accountName: string;
  notes?: string;
  entityName?: string;
  partnerId?: string;
  category?: string;
  subType?: string;
  isExtraExpense?: boolean;
  deductFromPartner?: boolean;
  // Asset fields
  isAsset?: boolean;
  assetName?: string;
  purchaseOrderId?: string;
}

export interface PaymentResult {
  success: boolean;
  txId: string;
  error?: string;
}

export interface CleanupParams {
  entityId: string;
  entityType: 'loading' | 'purchase_order' | 'sales_order' | 'commission' | 'standalone' | 'shareholder_tx';
  payableIds?: string[];
  receivableIds?: string[];
}

export interface RegisterFinancialParams {
  txId: string;
  date: string;
  amount: number;
  discount: number;
  accountId: string;
  accountName: string;
  type: 'payment' | 'receipt';
  recordId: string;
  referenceType: string;
  referenceId: string;
  description: string;
  historyType: string;
  entityName: string;
  driverName?: string;
  partnerId?: string;
  notes?: string;
  companyId?: string;
  shareholderTxId?: string;
  metadata?: any;
  purchaseOrderId?: string;
}
