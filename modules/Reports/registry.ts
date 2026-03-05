
import { ReportModule } from './types';

// Usando dynamic imports para carregar relatórios sob demanda
// Isso reduz drasticamente o bundle inicial

const lazyReportImports = {
  // Logística
  freightReport: () => import('./Logistics/FreightReport'),
  openFreightsReport: () => import('./Logistics/OpenFreightsReport'),
  monthlyFreightHistoryReport: () => import('./Logistics/MonthlyFreightHistory/index.tsx'),
  monthlyFreightPaymentsReport: () => import('./Logistics/MonthlyFreightPayments'),
  freightPaymentDetailsReport: () => import('./Logistics/FreightPaymentDetailsReport'),

  // Analytics
  abcClientsReport: () => import('./Analytics/AbcClients'),
  abcStatesReport: () => import('./Analytics/AbcStates'),

  // Financeiro
  dreReport: () => import('./Financial/DreReport'),
  trialBalanceReport: () => import('./Financial/TrialBalance'),
  accountStatementReport: () => import('./Financial/AccountStatement'),
  payablesReport: () => import('./Financial/PayablesReport'),
  receivablesReport: () => import('./Financial/ReceivablesReport'),
  transfersReport: () => import('./Financial/TransfersReport'),
  loansReport: () => import('./Financial/LoansReport'),
  advancesReport: () => import('./Financial/AdvancesReport'),
  expensesDetailedReport: () => import('./Financial/ExpensesDetailed'),
  shareholdersReport: () => import('./Financial/ShareholdersReport'),

  // Comercial
  revenueReport: () => import('./Commercial/RevenueReport'),
  purchasesHistoryReport: () => import('./Commercial/PurchasesHistory'),
  salesHistoryReport: () => import('./Commercial/SalesHistory'),
  partnerPerformanceReport: () => import('./Commercial/PartnerPerformance'),

  // Cadastros
  partnersListReport: () => import('./Registration/PartnersList'),
  partnerReceivablesReport: () => import('./Registration/PartnerReceivables'),
  partnerPayablesReport: () => import('./Registration/PartnerPayables'),
  partnerBalanceReport: () => import('./Registration/PartnerBalance'),
  partnerDossierReport: () => import('./Registration/PartnerDossier')
};

// Cache de relatórios carregados
const reportCache = new Map<string, ReportModule>();

// Lista de metadados dos relatórios (carregados sincronamente apenas com info básica)
// Isso permite exibir a lista de relatórios sem carregar todo o código
export const REPORT_METADATA = [
  // Logística
  { id: 'freight_general', category: 'logistics' as const, order: 1 },
  { id: 'freight_open_report', category: 'logistics' as const, order: 2 },
  { id: 'freight_monthly_history', category: 'logistics' as const, order: 3 },
  { id: 'freight_payments_report', category: 'logistics' as const, order: 4 },
  { id: 'freight_payments_detailed', category: 'logistics' as const, order: 5 },

  // Analytics
  { id: 'abc_clients', category: 'analytics' as const, order: 1 },
  { id: 'abc_states', category: 'analytics' as const, order: 2 },

  // Financeiro
  { id: 'dre', category: 'financial' as const, order: 1 },
  { id: 'trial_balance', category: 'financial' as const, order: 2 },
  { id: 'account_statement', category: 'financial' as const, order: 3 },
  { id: 'payables_report', category: 'financial' as const, order: 4 },
  { id: 'receivables_report', category: 'financial' as const, order: 5 },
  { id: 'transfers_report', category: 'financial' as const, order: 6 },
  { id: 'loans_report', category: 'financial' as const, order: 7 },
  { id: 'advances_report', category: 'financial' as const, order: 8 },
  { id: 'expenses_detailed', category: 'financial' as const, order: 9 },
  { id: 'shareholders_report', category: 'financial' as const, order: 10 },

  // Comercial
  { id: 'revenue_report', category: 'commercial' as const, order: 1 },
  { id: 'purchases_history', category: 'commercial' as const, order: 2 },
  { id: 'sales_history', category: 'commercial' as const, order: 3 },
  { id: 'partner_performance', category: 'commercial' as const, order: 4 },

  // Cadastros
  { id: 'partners_list', category: 'registration' as const, order: 1 },
  { id: 'partner_receivables', category: 'registration' as const, order: 2 },
  { id: 'partner_payables', category: 'registration' as const, order: 3 },
  { id: 'partner_balance', category: 'registration' as const, order: 4 },
  { id: 'partner_dossier', category: 'registration' as const, order: 5 }
];

// Mapeamento de ID para nome do import
const reportIdToImportKey: Record<string, keyof typeof lazyReportImports> = {
  'freight_general': 'freightReport',
  'freight_open_report': 'openFreightsReport',
  'freight_monthly_history': 'monthlyFreightHistoryReport',
  'freight_payments_report': 'monthlyFreightPaymentsReport',
  'freight_payments_detailed': 'freightPaymentDetailsReport',
  'abc_clients': 'abcClientsReport',
  'abc_states': 'abcStatesReport',
  'dre': 'dreReport',
  'trial_balance': 'trialBalanceReport',
  'account_statement': 'accountStatementReport',
  'payables_report': 'payablesReport',
  'receivables_report': 'receivablesReport',
  'transfers_report': 'transfersReport',
  'loans_report': 'loansReport',
  'advances_report': 'advancesReport',
  'expenses_detailed': 'expensesDetailedReport',
  'shareholders_report': 'shareholdersReport',
  'revenue_report': 'revenueReport',
  'purchases_history': 'purchasesHistoryReport',
  'sales_history': 'salesHistoryReport',
  'partner_performance': 'partnerPerformanceReport',
  'partners_list': 'partnersListReport',
  'partner_receivables': 'partnerReceivablesReport',
  'partner_payables': 'partnerPayablesReport',
  'partner_balance': 'partnerBalanceReport',
  'partner_dossier': 'partnerDossierReport'
};

// Função assíncrona para carregar relatório sob demanda
export const getReportById = async (id: string): Promise<ReportModule | undefined> => {
  // Verifica no cache primeiro
  if (reportCache.has(id)) {
    return reportCache.get(id);
  }

  // Busca a chave de import
  const importKey = reportIdToImportKey[id];
  if (!importKey) {
    return undefined;
  }

  try {
    // Carrega o módulo dinamicamente
    const module = await lazyReportImports[importKey]();
    const report = module.default;

    // Armazena no cache
    reportCache.set(id, report);

    return report;
  } catch (error) {
    return undefined;
  }
};

// Função para carregar todos os relatórios (apenas quando necessário)
export const loadAllReports = async (): Promise<ReportModule[]> => {
  const reports: ReportModule[] = [];

  for (const meta of REPORT_METADATA) {
    const report = await getReportById(meta.id);
    if (report) {
      reports.push(report);
    }
  }

  return reports;
};

// Para compatibilidade com código existente, mantemos REPORT_REGISTRY
// mas agora é uma Promise
export const REPORT_REGISTRY_PROMISE = loadAllReports();

// Versão síncrona vazia (para evitar erros, mas deve ser substituída)
export const REPORT_REGISTRY: ReportModule[] = [];

