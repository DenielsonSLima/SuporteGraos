export interface InitStats {
  totalTime: number;
  tablesLoaded: number;
  errors: string[];
  data: {
    ufs?: any[];
    cities?: any[];
    partnerTypes?: any[];
    productTypes?: any[];
    bankAccounts?: any[];
    initialBalances?: any[];
    expenseTypes?: any[];
    expenseCategories?: any[];
    costCenters?: any[];
    shareholders?: any[];
    shareholderTransactions?: any[];
    transporters?: any[];
    vehicles?: any[];
    drivers?: any[];
    partners?: any[];
  };
}

export type ServiceLoadStatus = 'ok' | 'timeout' | 'error';

export interface ServiceLoadMetric {
  name: string;
  durationMs: number;
  status: ServiceLoadStatus;
  error?: string;
}

export interface InitDiagnostics {
  startedAt: string;
  phase1Ms?: number;
  criticalMs?: number;
  backgroundMs?: number;
  services: ServiceLoadMetric[];
}
