import type { Enums } from './enums';

export interface Views {
  account_balances_v2: {
    Row: {
      account_id: string | null
      balance: number | null
      company_id: string | null
      name: string | null
    }
    Relationships: []
  }
  financial_history_v2: {
    Row: {
      account_id: string | null
      company_id: string | null
      due_date: string | null
      entry_created_at: string | null
      entry_description: string | null
      entry_id: string | null
      entry_status:
        | Enums["financial_entry_status"]
        | null
      entry_type: Enums["financial_entry_type"] | null
      movement_type:
        | Enums["financial_movement_type"]
        | null
      origin_module: string | null
      payment_date: string | null
      total_amount: number | null
      transaction_amount: number | null
      transaction_id: string | null
    }
    Relationships: [
      {
        foreignKeyName: "financial_transactions_v2_account_id_fkey"
        columns: ["account_id"]
        isOneToOne: false
        referencedRelation: "account_balances_v2"
        referencedColumns: ["account_id"]
      },
      {
        foreignKeyName: "financial_transactions_v2_account_id_fkey"
        columns: ["account_id"]
        isOneToOne: false
        referencedRelation: "accounts"
        referencedColumns: ["id"]
      },
    ]
  }
  v_partners_with_primary_address: {
    Row: {
      active: boolean | null
      city_id: number | null
      city_name: string | null
      complement: string | null
      created_at: string | null
      id: string | null
      name: string | null
      number: string | null
      street: string | null
      type: string | null
      updated_at: string | null
      zip_code: string | null
    }
    Relationships: [
      {
        foreignKeyName: "partner_addresses_city_id_fkey"
        columns: ["city_id"]
        isOneToOne: false
        referencedRelation: "cities"
        referencedColumns: ["id"]
      },
    ]
  }
}
