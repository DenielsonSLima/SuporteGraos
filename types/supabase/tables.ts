import type { Json } from './json';
import type { Enums } from './enums';

export interface Tables {
  companies: {
    Row: {
      id: string
      razao_social: string
      nome_fantasia: string
      cnpj: string | null
      ie: string | null
      endereco: string | null
      numero: string | null
      bairro: string | null
      cidade: string | null
      uf: string | null
      cep: string | null
      telefone: string | null
      email: string | null
      website: string | null
      logo_url: string | null
      login_settings: Json | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      razao_social: string
      nome_fantasia: string
      cnpj?: string | null
      ie?: string | null
      endereco?: string | null
      numero?: string | null
      bairro?: string | null
      cidade?: string | null
      uf?: string | null
      cep?: string | null
      telefone?: string | null
      email?: string | null
      website?: string | null
      logo_url?: string | null
      login_settings?: Json | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      razao_social?: string
      nome_fantasia?: string
      cnpj?: string | null
      ie?: string | null
      endereco?: string | null
      numero?: string | null
      bairro?: string | null
      cidade?: string | null
      uf?: string | null
      cep?: string | null
      telefone?: string | null
      email?: string | null
      website?: string | null
      logo_url?: string | null
      login_settings?: Json | null
      created_at?: string
      updated_at?: string
    }
    Relationships: []
  }
  ops_purchase_orders: {
    Row: {
      id: string
      number: string
      order_date: string
      status: string
      partner_id: string | null
      total_value: number
      company_id: string
      metadata: Json | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      number: string
      order_date?: string
      status?: string
      partner_id?: string | null
      total_value?: number
      company_id: string
      metadata?: Json | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      number?: string
      order_date?: string
      status?: string
      partner_id?: string | null
      total_value?: number
      company_id?: string
      metadata?: Json | null
      created_at?: string
      updated_at?: string
    }
    Relationships: [
      {
        foreignKeyName: "ops_purchase_orders_company_id_fkey"
        columns: ["company_id"]
        isOneToOne: false
        referencedRelation: "companies"
        referencedColumns: ["id"]
      }
    ]
  }
  ops_sales_orders: {
    Row: {
      id: string
      number: string
      order_date: string
      status: string
      customer_id: string | null
      total_value: number
      company_id: string
      metadata: Json | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      number: string
      order_date?: string
      status?: string
      customer_id?: string | null
      total_value?: number
      company_id: string
      metadata?: Json | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      number?: string
      order_date?: string
      status?: string
      customer_id?: string | null
      total_value?: number
      company_id?: string
      metadata?: Json | null
      created_at?: string
      updated_at?: string
    }
    Relationships: [
      {
        foreignKeyName: "ops_sales_orders_company_id_fkey"
        columns: ["company_id"]
        isOneToOne: false
        referencedRelation: "companies"
        referencedColumns: ["id"]
      }
    ]
  }
  financial_transactions: {
    Row: {
      id: string
      transaction_date: string
      description: string | null
      amount: number
      type: string
      account_id: string
      company_id: string
      entry_id: string | null
      created_by: string | null
      transfer_id: string | null
      metadata: Json | null
      created_at: string
    }
    Insert: {
      id?: string
      transaction_date?: string
      description?: string | null
      amount: number
      type: string
      account_id: string
      company_id: string
      entry_id?: string | null
      created_by?: string | null
      transfer_id?: string | null
      metadata?: Json | null
      created_at?: string
    }
    Update: {
      id?: string
      transaction_date?: string
      description?: string | null
      amount?: number
      type?: string
      account_id?: string
      company_id?: string
      entry_id?: string | null
      created_by?: string | null
      transfer_id?: string | null
      metadata?: Json | null
      created_at?: string
    }
    Relationships: []
  }
  financial_entries: {
    Row: {
      id: string
      company_id: string
      partner_id: string | null
      description: string | null
      total_amount: number
      paid_amount: number | null
      remaining_amount: number | null
      discount_amount: number | null
      deductions_amount: number | null
      net_amount: number | null
      due_date: string | null
      paid_date: string | null
      created_date: string | null
      status: string | null
      type: string
      origin_type: string | null
      origin_id: string | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      company_id: string
      partner_id?: string | null
      description?: string | null
      total_amount: number
      paid_amount?: number | null
      remaining_amount?: number | null
      discount_amount?: number | null
      deductions_amount?: number | null
      net_amount?: number | null
      due_date?: string | null
      paid_date?: string | null
      created_date?: string | null
      status?: string | null
      type: string
      origin_type?: string | null
      origin_id?: string | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      company_id?: string
      partner_id?: string | null
      description?: string | null
      total_amount?: number
      paid_amount?: number | null
      remaining_amount?: number | null
      discount_amount?: number | null
      deductions_amount?: number | null
      net_amount?: number | null
      due_date?: string | null
      paid_date?: string | null
      created_date?: string | null
      status?: string | null
      type?: string
      origin_type?: string | null
      origin_id?: string | null
      created_at?: string
      updated_at?: string
    }
    Relationships: []
  }
  accounts: {
    Row: {
      id: string
      company_id: string
      account_name: string
      account_type: string
      bank_name: string | null
      agency: string | null
      account_number: string | null
      owner: string | null
      balance: number | null
      allows_negative: boolean | null
      is_active: boolean | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      company_id: string
      account_name: string
      account_type: string
      bank_name?: string | null
      agency?: string | null
      account_number?: string | null
      owner?: string | null
      balance?: number | null
      allows_negative?: boolean | null
      is_active?: boolean | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      company_id?: string
      account_name?: string
      account_type?: string
      bank_name?: string | null
      agency?: string | null
      account_number?: string | null
      owner?: string | null
      balance?: number | null
      allows_negative?: boolean | null
      is_active?: boolean | null
      created_at?: string
      updated_at?: string
    }
    Relationships: []
  }
  ops_loadings: {
    Row: {
      id: string
      company_id: string
      purchase_order_id: string | null
      sales_order_id: string | null
      loading_date: string
      driver_name: string | null
      vehicle_plate: string | null
      weight_kg: number
      unload_weight_kg: number | null
      total_purchase_value: number
      total_sales_value: number
      total_freight_value: number
      paid_value: number | null
      balance_value: number | null
      status: string
      metadata: Json
      raw_payload: Json
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      company_id: string
      purchase_order_id?: string | null
      sales_order_id?: string | null
      loading_date: string
      driver_name?: string | null
      vehicle_plate?: string | null
      weight_kg: number
      unload_weight_kg?: number | null
      total_purchase_value?: number
      total_sales_value?: number
      total_freight_value?: number
      paid_value?: number | null
      balance_value?: number | null
      status?: string
      metadata?: Json
      raw_payload?: Json
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      company_id?: string
      purchase_order_id?: string | null
      sales_order_id?: string | null
      loading_date?: string
      driver_name?: string | null
      vehicle_plate?: string | null
      weight_kg?: number
      unload_weight_kg?: number | null
      total_purchase_value?: number
      total_sales_value?: number
      total_freight_value?: number
      paid_value?: number | null
      balance_value?: number | null
      status?: string
      metadata?: Json
      raw_payload?: Json
      created_at?: string
      updated_at?: string
    }
    Relationships: []
  }
  financial_links: {
    Row: {
      id: string
      company_id: string | null
      transaction_id: string
      purchase_order_id: string | null
      sales_order_id: string | null
      loading_id: string | null
      commission_id: string | null
      standalone_id: string | null
      shareholder_tx_id: string | null
      link_type: string
      metadata: Json | null
      created_at: string | null
    }
    Insert: {
      id?: string
      company_id?: string | null
      transaction_id: string
      purchase_order_id?: string | null
      sales_order_id?: string | null
      loading_id?: string | null
      commission_id?: string | null
      standalone_id?: string | null
      shareholder_tx_id?: string | null
      link_type: string
      metadata?: Json | null
      created_at?: string | null
    }
    Update: {
      id?: string
      company_id?: string | null
      transaction_id?: string
      purchase_order_id?: string | null
      sales_order_id?: string | null
      loading_id?: string | null
      commission_id?: string | null
      standalone_id?: string | null
      shareholder_tx_id?: string | null
      link_type?: string
      metadata?: Json | null
      created_at?: string | null
    }
    Relationships: []
  }
  advances: {
    Row: {
      id: string
      company_id: string
      recipient_type: string
      recipient_id: string
      amount: number
      settled_amount: number | null
      remaining_amount: number | null
      advance_date: string | null
      settlement_date: string | null
      status: string | null
      description: string | null
      parent_id: string | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      company_id: string
      recipient_type: string
      recipient_id: string
      amount: number
      settled_amount?: number | null
      remaining_amount?: number | null
      advance_date?: string | null
      settlement_date?: string | null
      status?: string | null
      description?: string | null
      parent_id?: string | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      company_id?: string
      recipient_type?: string
      recipient_id?: string
      amount?: number
      settled_amount?: number | null
      remaining_amount?: number | null
      advance_date?: string | null
      settlement_date?: string | null
      status?: string | null
      description?: string | null
      parent_id?: string | null
      created_at?: string
      updated_at?: string
    }
    Relationships: []
  }
  loans: {
    Row: {
      id: string
      company_id: string
      type: string | null
      principal_amount: number
      interest_rate: number | null
      start_date: string
      end_date: string | null
      lender_id: string | null
      paid_amount: number | null
      remaining_amount: number | null
      status: string | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      company_id: string
      type?: string | null
      principal_amount: number
      interest_rate?: number | null
      start_date: string
      end_date?: string | null
      lender_id?: string | null
      paid_amount?: number | null
      remaining_amount?: number | null
      status?: string | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      company_id?: string
      type?: string | null
      principal_amount?: number
      interest_rate?: number | null
      start_date?: string
      end_date?: string | null
      lender_id?: string | null
      paid_amount?: number | null
      remaining_amount?: number | null
      status?: string | null
      created_at?: string
      updated_at?: string
    }
    Relationships: []
  }
  shareholders: {
    Row: {
      id: string
      company_id: string
      name: string
      cpf: string | null
      email: string | null
      phone: string | null
      address_street: string | null
      address_number: string | null
      address_neighborhood: string | null
      address_city: string | null
      address_state: string | null
      address_zip: string | null
      current_balance: number
      pro_labore_value: number
      last_pro_labore_date: string | null
      recurrence_active: boolean
      recurrence_day: number
      recurrence_amount: number
      recurrence_last_generated_month: string | null
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      company_id: string
      name: string
      cpf?: string | null
      email?: string | null
      phone?: string | null
      address_street?: string | null
      address_number?: string | null
      address_neighborhood?: string | null
      address_city?: string | null
      address_state?: string | null
      address_zip?: string | null
      current_balance?: number
      pro_labore_value?: number
      last_pro_labore_date?: string | null
      recurrence_active?: boolean
      recurrence_day?: number
      recurrence_amount?: number
      recurrence_last_generated_month?: string | null
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      company_id?: string
      name?: string
      cpf?: string | null
      email?: string | null
      phone?: string | null
      address_street?: string | null
      address_number?: string | null
      address_neighborhood?: string | null
      address_city?: string | null
      address_state?: string | null
      address_zip?: string | null
      current_balance?: number
      pro_labore_value?: number
      last_pro_labore_date?: string | null
      recurrence_active?: boolean
      recurrence_day?: number
      recurrence_amount?: number
      recurrence_last_generated_month?: string | null
      created_at?: string
      updated_at?: string
    }
    Relationships: []
  }
  shareholder_transactions: {
    Row: {
      id: string
      company_id: string
      shareholder_id: string
      date: string
      description: string
      type: string
      value: number
      account_name: string | null
      created_at: string
    }
    Insert: {
      id?: string
      company_id: string
      shareholder_id: string
      date: string
      description?: string
      type: string
      value: number
      account_name?: string | null
      created_at?: string
    }
    Update: {
      id?: string
      company_id?: string
      shareholder_id?: string
      date?: string
      description?: string
      type?: string
      value?: number
      account_name?: string | null
      created_at?: string
    }
    Relationships: []
  }
}
