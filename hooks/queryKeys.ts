/**
 * queryKeys.ts
 *
 * Chaves de cache centralizadas para o TanStack Query.
 * Todas as queries do sistema devem referenciar essas constantes
 * para garantir invalidação correta e sem typos.
 *
 * ⚠️  REGRA: Nenhum hook deve usar query keys "soltas".
 *     Toda key DEVE ser referenciada a partir deste arquivo.
 */

export const QUERY_KEYS = {
  // ─── Configurações ──────────────────────────────────────
  PRODUCT_TYPES: ['product_types'] as const,
  PARTNER_TYPES: ['partner_types'] as const,

  // ─── Usuários ───────────────────────────────────────────
  USERS: ['users'] as const,

  // ─── Perfil do usuário logado ────────────────────────────
  PROFILE: ['profile', 'me'] as const,

  // ─── Sócios ─────────────────────────────────────────────
  SHAREHOLDERS: ['shareholders'] as const,

  // ─── Financeiro — configurações ─────────────────────────
  BANK_ACCOUNTS: ['bank_accounts'] as const,
  INITIAL_BALANCES: ['initial_balances'] as const,

  // ─── Financeiro — base de cálculos ──────────────────────
  ACCOUNTS: ['accounts'] as const,
  ACCOUNT_BY_ID: (id: string) => ['account', id] as const,
  TOTAL_BALANCE: ['total_balance'] as const,
  FINANCIAL_ENTRIES: ['financial_entries'] as const,
  FINANCIAL_PAYABLES: ['financial_payables'] as const,
  FINANCIAL_RECEIVABLES: ['financial_receivables'] as const,
  FINANCIAL_TRANSACTIONS: ['financial_transactions'] as const,
  ENTRY_BY_ID: (id: string) => ['entry', id] as const,
  TOTALS_BY_TYPE: (type: string) => ['totals', type] as const,
  ACCOUNT_TRANSACTIONS: (accountId: string) => ['account_transactions', accountId] as const,
  ENTRY_TRANSACTIONS: (entryId: string) => ['entry_transactions', entryId] as const,
  TRANSACTIONS_DATE_RANGE: (accountId: string, start: string, end: string) =>
    ['financial_transactions', 'range', accountId, start, end] as const,
  TRANSACTION_TOTALS: (start: string, end: string) =>
    ['financial_transactions', 'totals', start, end] as const,
  ACCOUNT_SUMMARY: (accountId: string) => ['account_summary', accountId] as const,

  // ─── Financeiro — operações (FASE 1B) ───────────────────
  TRANSFERS: ['transfers'] as const,
  LOANS: ['loans'] as const,
  LOAN_INSTALLMENTS: ['loan_installments'] as const,
  CREDIT_LINES: ['credit_lines'] as const,
  CREDIT_LINE_TOTALS: ['credit_line_totals'] as const,
  ADMIN_EXPENSES: ['admin_expenses'] as const,
  ADVANCES: ['advances'] as const,
  SHAREHOLDER_OPERATIONS: ['shareholder_operations'] as const,
  STANDALONE_RECORDS: ['standalone_records'] as const,
  CREDITS: ['credits'] as const,

  // ─── Categorias de despesa ──────────────────────────────
  EXPENSE_CATEGORIES: ['expense_categories'] as const,

  // ─── Localidades ────────────────────────────────────────
  LOCATIONS: ['locations'] as const,

  // ─── Marca d'água & Empresa ─────────────────────────────
  WATERMARK: ['watermark'] as const,
  COMPANY: ['company'] as const,

  // ─── Parceiros ──────────────────────────────────────────
  PARTNERS: ['partners'] as const,
  ADDRESSES: ['addresses'] as const,
  DRIVERS: ['drivers'] as const,
  VEHICLES: ['vehicles'] as const,

  // ─── Pedidos ────────────────────────────────────────────
  PURCHASE_ORDERS: ['purchase_orders'] as const,
  SALES_ORDERS: ['sales_orders'] as const,

  // ─── Patrimônio ─────────────────────────────────────────
  ASSETS: ['assets'] as const,

  // ─── Logística ──────────────────────────────────────────
  LOADINGS: ['loadings'] as const,
  FREIGHTS: ['freights'] as const,
  CARRIERS: ['carriers'] as const,

  // ─── Caixa ──────────────────────────────────────────────
  CASHIER_CURRENT: ['cashier', 'current'] as const,
  CASHIER_HISTORY: ['cashier', 'history'] as const,

  // ─── Reports (lazy loaded) ──────────────────────────────
  REPORTS: ['reports'] as const,

  // ─── Performance ────────────────────────────────────────
  PERFORMANCE: (monthsBack: number | null) => ['performance', monthsBack] as const,
} as const;

/**
 * Stale times padronizados por nível de volatilidade.
 * Facilita manter consistência entre hooks e evita "magic numbers".
 */
export const STALE_TIMES = {
  /** Dados que mudam a cada transação (30s) */
  VOLATILE: 30 * 1000,
  /** Dados financeiros dinâmicos (1 min) */
  DYNAMIC: 1 * 60 * 1000,
  /** Dados com atualização moderada (2 min) */
  MODERATE: 2 * 60 * 1000,
  /** Dados de referência / catálogo (5 min) */
  REFERENCE: 5 * 60 * 1000,
  /** Dados quase estáticos (10 min) */
  STABLE: 10 * 60 * 1000,
  /** Dados que quase nunca mudam (30 min) */
  STATIC: 30 * 60 * 1000,
  /** Código compilado que nunca muda (1h) */
  LONG: 60 * 60 * 1000,
} as const;
