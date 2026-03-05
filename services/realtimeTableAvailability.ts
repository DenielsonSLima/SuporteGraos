import { isSqlCanonicalOpsEnabled } from './sqlCanonicalOps';

const LEGACY_MISSING_PUBLIC_TABLES = new Set<string>([
  'assets',
  'audit_logs',
  'cashier_monthly_snapshots',
  'credits',
  'drivers',
  'financial_transactions_v2',
  'login_history',
  'login_rotation_config',
  'login_screens',
  'logistics_loadings',
  'partner_addresses',
  'partners',
  'payables',
  'purchase_orders',
  'receivables',
  'report_access_logs',
  'sales_orders',
  'standalone_receipts',
  'standalone_records',
  'transporters',
  'user_sessions',
  'vehicles',
]);

export const isLegacyPublicTableMissing = (tableName: string): boolean =>
  LEGACY_MISSING_PUBLIC_TABLES.has(tableName);

export const shouldSkipLegacyTableOps = (tableName: string): boolean =>
  isSqlCanonicalOpsEnabled() && isLegacyPublicTableMissing(tableName);
