export type FinancialEntryType = 'payable' | 'receivable';
export type OriginType =
  | 'purchase_order'
  | 'sales_order'
  | 'commission'
  | 'expense'
  | 'loan'
  | 'advance'
  | 'transfer'
  | 'credit'
  | 'freight';

export type EntryStatus = 'open' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled' | 'reversed';

export interface FinancialEntry {
  id: string;
  company_id: string;
  type: FinancialEntryType;
  origin_type?: OriginType;
  origin_id?: string;
  partner_id: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  deductions_amount?: number;
  net_amount?: number;
  status: EntryStatus;
  created_date: string;
  due_date?: string;
  paid_date?: string;
  created_at: string;
  updated_at: string;
}

export interface EnrichedPayableEntry extends FinancialEntry {
  partner_name: string;
  order_number?: string;
  order_partner_name?: string;
  load_count: number;
  total_weight_kg: number;
  total_weight_ton: number;
  total_weight_sc: number;
  agg_purchase_value: number;
  unit_price_sc: number;
  freight_vehicle_plate?: string;
  freight_driver_name?: string;
  freight_weight_kg?: number;
  freight_weight_ton?: number;
  freight_total_value?: number;
  freight_price_per_ton?: number;
}

export interface EnrichedReceivableEntry extends FinancialEntry {
  partner_name: string;
  sales_order_number?: string;
  sales_order_id?: string;
  loading_weight_kg?: number;
  loading_weight_ton?: number;
  loading_weight_sc?: number;
  loading_sales_value?: number;
  unit_price_sc?: number;
}

export interface FinancialFilterParams {
  startDate?: string;
  endDate?: string;
  partnerId?: string;
  search?: string;
  status?: EntryStatus;
  page?: number;
  pageSize?: number;
}
