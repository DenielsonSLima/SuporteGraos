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
  vw_purchase_orders_enriched: {
    Row: {
      id: string
      number: string
      order_date: string
      row_status: string
      partner_id: string | null
      partner_name: string | null
      total_value: number
      paid_value: number
      discount_value: number
      total_purchase_val_calc: number
      total_freight_val_calc: number
      total_sales_val_calc: number
      total_kg: number
      total_sc: number
      total_in_transit_val_calc: number
      balance_value: number
      has_broker: boolean
      broker_commission_per_sc: number
      broker_paid_value: number
      broker_total_due: number
      broker_balance_value: number
      company_id: string
      created_at: string
      metadata: Json | null
    }
    Relationships: []
  }
  vw_sales_orders_enriched: {
    Row: {
      id: string
      company_id: string | null
      legacy_id: string | null
      number: string | null
      order_date: string | null
      status: string | null
      customer_id: string | null
      customer_name: string | null
      total_value: number | null
      received_value: number
      metadata: Json | null
      raw_payload: Json | null
      created_at: string | null
      updated_at: string | null
      delivered_qty_sc: number
      delivered_value: number
      load_count: number
      total_grain_cost: number
      total_freight_cost: number
      total_direct_investment: number
      gross_profit: number
      margin_percent: number
      transit_count: number
      transit_value: number
    }
    Relationships: []
  }
}
