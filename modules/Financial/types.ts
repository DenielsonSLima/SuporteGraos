
export type FinancialStatus = 'pending' | 'paid' | 'overdue' | 'partial';

export interface FinancialRecord {
  id: string;
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
  subType?: 'purchase_order' | 'freight' | 'commission' | 'sales_order' | 'loan_taken' | 'loan_granted' | 'admin' | 'shareholder' | 'receipt';
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
  owner?: string;
  active?: boolean;
  agency?: string;
  accountNumber?: string;
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
