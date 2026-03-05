import { FinancialTransaction } from './types';

export interface FinancialLink {
    id: string;
    created_at: string;
    transaction_id: string;
    purchase_order_id?: string;
    sales_order_id?: string;
    loading_id?: string;
    commission_id?: string;
    standalone_id?: string;
    link_type: 'payment' | 'receipt' | 'deduction' | 'reversal';
    metadata?: any;
}

export interface FinancialTransactionExtended extends FinancialTransaction {
    user_id?: string;
}
