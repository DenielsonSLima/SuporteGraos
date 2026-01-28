
export interface BankBalance {
  id: string;
  bankName: string;
  balance: number;
}

export interface AccountInitialBalance {
  id: string;
  bankName: string;
  value: number;
}

export interface CashierReport {
  id: string; // 'current' or 'YYYY-MM'
  referenceDate: string; // ISO Date
  isClosed: boolean;

  // --- RECEITAS E DIREITOS (ATIVOS) ---
  bankBalances: BankBalance[];
  totalBankBalance: number;
  totalInitialBalance: number; 
  
  totalInitialMonthBalance: number; 
  initialMonthBalances: AccountInitialBalance[];
  
  pendingSalesReceipts: number; 
  merchandiseInTransitValue: number;
  loansGranted: number;
  advancesGiven: number;
  
  // PATRIMÔNIO E HAVERES
  totalFixedAssetsValue: number; 
  pendingAssetSalesReceipts: number; 
  shareholderReceivables: number; // Haveres de Sócios (Saldos devedores de sócios com a empresa)
  
  totalAssets: number; 

  // --- DÉBITOS E OBRIGAÇÕES (PASSIVOS) ---
  pendingPurchasePayments: number; 
  pendingFreightPayments: number; 
  loansTaken: number; 
  commissionsToPay: number; // Comissões de corretores/terceiros
  advancesTaken: number; 
  shareholderPayables: number; // Obrigações com Sócios (Pro-labore/Lucros a pagar)

  totalLiabilities: number; 

  // --- RESUMO ---
  netBalance: number; 
}
