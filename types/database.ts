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

export type PurchaseOrder = Tables<'ops_purchase_orders'>;
export type SalesOrder = Tables<'ops_sales_orders'>;
export type Loading = Tables<'ops_loadings'>;

export type BankAccount = Tables<'accounts'>;
export type StandaloneRecord = Tables<'financial_entries'>;

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
