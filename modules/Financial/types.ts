
export type FinancialStatus = 'pending' | 'paid' | 'overdue' | 'partial' | 'cancelled' | 'reversed';

export interface FinancialRecord {
  id: string;
  originId?: string; // ID do registro de origem (pedido, carregamento, etc.)
  description: string;
  entityName: string;
  driverName?: string;
  category: string;
  dueDate: string;
  issueDate: string;
  settlementDate?: string;
  originalValue: number;
  paidValue: number;
  discountValue?: number;
  status: FinancialStatus;
  subType?: 'purchase_order' | 'freight' | 'commission' | 'sales_order' | 'loan_taken' | 'loan_granted' | 'admin' | 'shareholder' | 'receipt' | 'credit_income' | 'investment' | 'transfer';
  bankAccount?: string;
  notes?: string;
  assetId?: string;
  isAssetReceipt?: boolean;
  assetName?: string;
  weightSc?: number; // legado: usado em algumas telas
  weightKg?: number; // volume consolidado em KG
  unitPriceTon?: number; // preço por TON quando aplicável
  unitPriceSc?: number; // preço por SC calculado
  loadCount?: number; // total de carregamentos vinculados
  totalTon?: number; // total em toneladas das cargas
  totalSc?: number; // total em sacas (se disponível)
  orderNumber?: string; // número do pedido vinculado (ex: PV-2026-389)
  companyId?: string;
  remainingValue?: number;
  deductionsAmount?: number;
  netAmount?: number;
}

export interface LoanTransaction {
  id: string;
  date: string;
  type: 'increase' | 'decrease'; // increase = aumenta dívida/crédito, decrease = amortização/pagamento
  value: number;
  description: string;
  accountId?: string;
  accountName?: string;
  isHistorical?: boolean;
}

export interface LoanRecord {
  id: string;
  entityName: string;
  contractDate: string;
  originalValue?: number; // Valor original do contrato
  totalValue: number; // Valor original do contrato
  interestRate: number;
  installments: number;
  remainingValue: number; // Saldo atual calculado
  nextDueDate: string;
  status: 'active' | 'settled' | 'default';
  type: 'taken' | 'granted';
  transactions: LoanTransaction[];
  bankAccountName?: string; // Nome da conta bancária
  // Fix: Added missing optional properties used during loan creation and logging
  accountId?: string;
  accountName?: string;
  isHistorical?: boolean;
}

// Added agency and accountNumber to BankAccount interface
export interface BankAccount {
  id: string;
  bankName: string;
  bank?: string;
  owner?: string;
  active?: boolean;
  agency?: string;
  accountNumber?: string;
  initialBalance?: number;
  currentBalance?: number; // Foundation V2 atomic balance
  allowsNegative?: boolean;
  type?: string;
}

export interface TransferRecord {
  id: string;
  date: string;
  originAccount: string;
  destinationAccount: string;
  value: number;
  description: string;
  user: string;
}

export interface FinancialTransaction {
  id: string;
  financialRecordId?: string; // Link to Payable/Receivable
  date: string;
  description: string;
  amount: number;
  type: 'payment' | 'receipt' | 'transfer' | 'adjustment';
  bankAccountId?: string;
  categoryId?: string;
  companyId: string;
}

export interface Commission {
  id: string;
  partnerId: string;
  salesOrderId?: string;
  loadingId?: string;
  amount: number;
  date: string;
  status: 'pending' | 'paid' | 'cancelled';
  description?: string;
  companyId: string;
}

export interface FreightExpense {
  id: string;
  loadingId: string;
  type: 'quebra' | 'adiantamento' | 'secagem' | 'outros';
  amount: number;
  description?: string;
  isDeduction: boolean;
  companyId: string;
}
