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
}
