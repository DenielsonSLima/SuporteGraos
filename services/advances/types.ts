export interface Advance {
  id: string;
  company_id: string;
  recipient_id: string;
  recipient_type: 'supplier' | 'client' | 'shareholder';
  amount: number;
  settled_amount: number;
  remaining_amount: number;
  description?: string;
  advance_date: string;
  settlement_date?: string;
  status: 'open' | 'partially_settled' | 'settled' | 'cancelled';
  created_at: string;
  updated_at: string;
}
