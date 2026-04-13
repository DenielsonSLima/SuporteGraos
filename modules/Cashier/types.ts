
export interface BankBalance {
  id: string;
  bankName: string;
  owner?: string;
  balance: number;
}

export interface AccountInitialBalance {
  id: string;
  bankName: string;
  owner?: string;
  value: number;
}

export interface CashierReport {
  id: string; // 'current' or 'YYYY-MM'
  referenceDate: string; // ISO Date
  isClosed: boolean;

  // --- SNAPSHOT / HISTÓRICO ---
  isSnapshot?: boolean; // É um snapshot congelado?
  snapshotClosedDate?: string; // Quando foi finalizado (ISO Date)
  snapshotClosedBy?: string; // Quem finalizou (email/nome)
  generatedAt?: string; // Quando foi gerado/calculado (ISO Date)

  // --- RECEITAS E DIREITOS (ATIVOS) ---
  bankBalances: BankBalance[];
  totalBankBalance: number;
  totalInitialBalance: number;

  totalInitialMonthBalance: number;
  initialMonthBalances: AccountInitialBalance[];

  pendingSalesReceipts: number;
  merchandiseInTransitValue: number;
  loanCredits: number; // Empréstimos concedidos (Ativo)
  advancesCredits: number; // Adiantamentos concedidos (Ativo)

  // PATRIMÔNIO E HAVERES
  totalFixedAssetsValue: number;
  assetSalesReceivable: number; // Venda de bens a receber
  shareholderCredits: number; // Haveres de Sócios (Saldos devedores de sócios com a empresa)

  totalAssets: number;

  // --- DÉBITOS E OBRIGAÇÕES (PASSIVOS) ---
  pendingPurchasePayments: number;
  pendingFreightPayments: number;
  loanDebts: number; // Empréstimos tomados (Passivo)
  commissionsToPay: number; // Comissões de corretores/terceiros
  clientAdvances: number; // Adiantamento de Clientes (Passivo)
  shareholderDebts: number; // Obrigações com Sócios (Pro-labore/Lucros a pagar)

  totalLiabilities: number;

  // --- RESUMO ---
  netBalance: number;
  netWorth?: number; // Patrimônio líquido calculado pelo RPC

  // --- NOVOS CAMPOS (Resumo do Mês) ---
  monthPurchasedTotal: number;
  monthSoldTotal: number;
  monthPurchasesPaidTotal: number;
  monthFreightPaidTotal: number;
  monthRefusedTotal: number;
  monthExpensesPaidTotal: number;
  monthPaidTotal: number;
  monthDirectDiff: number;
  monthOperationalSpread?: number;
  monthFreightPendingTotal?: number;
  creditsReceivedDetails?: {
    sales_order: number;
    loan: number;
    others: number;
  };
  expenseDistribution: {
    purchases: number;
    freight: number;
    expenses: number;
    others: number;
  };
  revenueDistribution: {
    opening_receivables: number;
    future_receivables: number;
  };
}
