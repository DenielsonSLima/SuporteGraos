import { Database } from './supabase';

// Helper types to extract Row, Insert, and Update types from Database
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// Domain Entity Types
export type FinancialEntry = Tables<'financial_entries'>;
export type FinancialTransaction = Tables<'financial_transactions'>;
export type Advance = Tables<'advances'>;
export type Loan = Tables<'loans'>;
export type Shareholder = Tables<'shareholders'>;
export type ShareholderTransaction = Tables<'shareholder_transactions'>;

export type PurchaseOrder = Tables<'purchase_orders'>;
export type SalesOrder = Tables<'sales_orders'>;
export type Loading = Tables<'logistics_loadings'>;

export type BankAccount = Tables<'contas_bancarias'>;
export type StandaloneRecord = Tables<'standalone_records'>;

// Enums / Status literals
export type FinancialEntryType = 'payable' | 'receivable';
export type FinancialEntryStatus = 'open' | 'partially_paid' | 'paid' | 'cancelled';
export type TransactionType = 'IN' | 'OUT';

// Extracted types for Handlers & Logic
export interface FinancialSummary {
    total: number;
    paid: number;
    remaining: number;
}
