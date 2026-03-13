export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      admin_expenses: {
        Row: {
          bank_account: string | null
          category: string | null
          company_id: string
          created_at: string | null
          description: string
          discount_value: number | null
          driver_name: string | null
          due_date: string | null
          entity_name: string | null
          id: string
          issue_date: string | null
          load_count: number | null
          notes: string | null
          original_value: number
          paid_value: number | null
          settlement_date: string | null
          status: string | null
          sub_type: string | null
          total_sc: number | null
          total_ton: number | null
          unit_price_sc: number | null
          unit_price_ton: number | null
          updated_at: string | null
          weight_kg: number | null
          weight_sc: number | null
        }
        Insert: {
          bank_account?: string | null
          category?: string | null
          company_id: string
          created_at?: string | null
          description: string
          discount_value?: number | null
          driver_name?: string | null
          due_date?: string | null
          entity_name?: string | null
          id: string
          issue_date?: string | null
          load_count?: number | null
          notes?: string | null
          original_value?: number
          paid_value?: number | null
          settlement_date?: string | null
          status?: string | null
          sub_type?: string | null
          total_sc?: number | null
          total_ton?: number | null
          unit_price_sc?: number | null
          unit_price_ton?: number | null
          updated_at?: string | null
          weight_kg?: number | null
          weight_sc?: number | null
        }
        Update: {
          bank_account?: string | null
          category?: string | null
          company_id?: string
          created_at?: string | null
          description?: string
          discount_value?: number | null
          driver_name?: string | null
          due_date?: string | null
          entity_name?: string | null
          id?: string
          issue_date?: string | null
          load_count?: number | null
          notes?: string | null
          original_value?: number
          paid_value?: number | null
          settlement_date?: string | null
          status?: string | null
          sub_type?: string | null
          total_sc?: number | null
          total_ton?: number | null
          unit_price_sc?: number | null
          unit_price_ton?: number | null
          updated_at?: string | null
          weight_kg?: number | null
          weight_sc?: number | null
        }
        Relationships: []
      }
      advances: {
        Row: {
          advance_date: string
          amount: number
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          outstanding_balance: number
          partner_id: string
          related_id: string | null
          related_type: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          advance_date: string
          amount: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          outstanding_balance: number
          partner_id: string
          related_id?: string | null
          related_type?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          advance_date?: string
          amount?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          outstanding_balance?: number
          partner_id?: string
          related_id?: string | null
          related_type?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advances_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advances_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partners_with_primary_address"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          account_locked_until: string | null
          active: boolean | null
          allow_recovery: boolean | null
          auth_user_id: string | null
          company_id: string | null
          cpf: string
          created_at: string
          created_by: string | null
          email: string
          failed_login_attempts: number | null
          first_name: string
          id: string
          last_failed_login: string | null
          last_login_at: string | null
          last_login_ip: string | null
          last_name: string
          must_change_password: boolean | null
          password_changed_at: string | null
          password_hash: string | null
          password_salt: string | null
          permissions: Json | null
          phone: string | null
          recovery_token: string | null
          recovery_token_expires_at: string | null
          refresh_token: string | null
          refresh_token_expires_at: string | null
          role: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_locked_until?: string | null
          active?: boolean | null
          allow_recovery?: boolean | null
          auth_user_id?: string | null
          company_id?: string | null
          cpf: string
          created_at?: string
          created_by?: string | null
          email: string
          failed_login_attempts?: number | null
          first_name: string
          id?: string
          last_failed_login?: string | null
          last_login_at?: string | null
          last_login_ip?: string | null
          last_name: string
          must_change_password?: boolean | null
          password_changed_at?: string | null
          password_hash?: string | null
          password_salt?: string | null
          permissions?: Json | null
          phone?: string | null
          recovery_token?: string | null
          recovery_token_expires_at?: string | null
          refresh_token?: string | null
          refresh_token_expires_at?: string | null
          role?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_locked_until?: string | null
          active?: boolean | null
          allow_recovery?: boolean | null
          auth_user_id?: string | null
          company_id?: string | null
          cpf?: string
          created_at?: string
          created_by?: string | null
          email?: string
          failed_login_attempts?: number | null
          first_name?: string
          id?: string
          last_failed_login?: string | null
          last_login_at?: string | null
          last_login_ip?: string | null
          last_name?: string
          must_change_password?: boolean | null
          password_changed_at?: string | null
          password_hash?: string | null
          password_salt?: string | null
          permissions?: Json | null
          phone?: string | null
          recovery_token?: string | null
          recovery_token_expires_at?: string | null
          refresh_token?: string | null
          refresh_token_expires_at?: string | null
          role?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          acquisition_date: string
          acquisition_value: number
          asset_type: string
          buyer_id: string | null
          buyer_name: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          identifier: string | null
          metadata: Json | null
          name: string
          origin: string
          origin_description: string | null
          sale_date: string | null
          sale_value: number | null
          status: string
          updated_at: string
          write_off_date: string | null
          write_off_notes: string | null
          write_off_reason: string | null
        }
        Insert: {
          acquisition_date: string
          acquisition_value: number
          asset_type: string
          buyer_id?: string | null
          buyer_name?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          identifier?: string | null
          metadata?: Json | null
          name: string
          origin: string
          origin_description?: string | null
          sale_date?: string | null
          sale_value?: number | null
          status?: string
          updated_at?: string
          write_off_date?: string | null
          write_off_notes?: string | null
          write_off_reason?: string | null
        }
        Update: {
          acquisition_date?: string
          acquisition_value?: number
          asset_type?: string
          buyer_id?: string | null
          buyer_name?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          identifier?: string | null
          metadata?: Json | null
          name?: string
          origin?: string
          origin_description?: string | null
          sale_date?: string | null
          sale_value?: number | null
          status?: string
          updated_at?: string
          write_off_date?: string | null
          write_off_notes?: string | null
          write_off_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "v_partners_with_primary_address"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          module: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          module: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          module?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cashier_monthly_snapshots: {
        Row: {
          closed_by: string | null
          closed_date: string
          company_id: string | null
          created_at: string | null
          id: string
          month_key: string
          notes: string | null
          report: Json | null
          updated_at: string | null
        }
        Insert: {
          closed_by?: string | null
          closed_date?: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          month_key: string
          notes?: string | null
          report?: Json | null
          updated_at?: string | null
        }
        Update: {
          closed_by?: string | null
          closed_date?: string
          company_id?: string | null
          created_at?: string | null
          id?: string
          month_key?: string
          notes?: string | null
          report?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cashier_monthly_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          code: number | null
          company_id: string | null
          created_at: string
          id: number
          name: string
          uf_id: number
          updated_at: string
        }
        Insert: {
          code?: number | null
          company_id?: string | null
          created_at?: string
          id?: number
          name: string
          uf_id: number
          updated_at?: string
        }
        Update: {
          code?: number | null
          company_id?: string | null
          created_at?: string
          id?: number
          name?: string
          uf_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cities_uf_id_fkey"
            columns: ["uf_id"]
            isOneToOne: false
            referencedRelation: "ufs"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          date: string
          description: string | null
          id: string
          loading_id: string | null
          partner_id: string
          sales_order_id: string | null
          status: string | null
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          loading_id?: string | null
          partner_id: string
          sales_order_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          loading_id?: string | null
          partner_id?: string
          sales_order_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_loading_id_fkey"
            columns: ["loading_id"]
            isOneToOne: false
            referencedRelation: "logistics_loadings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          active: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          ie: string | null
          logo_url: string | null
          nome_fantasia: string
          numero: string | null
          razao_social: string
          telefone: string | null
          uf: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          active?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          ie?: string | null
          logo_url?: string | null
          nome_fantasia: string
          numero?: string | null
          razao_social: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          active?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          ie?: string | null
          logo_url?: string | null
          nome_fantasia?: string
          numero?: string | null
          razao_social?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      contas_bancarias: {
        Row: {
          account_number: string | null
          account_type: string | null
          active: boolean
          agency: string | null
          bank_name: string
          company_id: string | null
          created_at: string
          id: string
          owner: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_type?: string | null
          active?: boolean
          agency?: string | null
          bank_name: string
          company_id?: string | null
          created_at?: string
          id?: string
          owner?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_type?: string | null
          active?: boolean
          agency?: string | null
          bank_name?: string
          company_id?: string | null
          created_at?: string
          id?: string
          owner?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_bancarias_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      credits: {
        Row: {
          asset_id: string | null
          asset_name: string | null
          bank_account: string | null
          category: string | null
          company_id: string
          created_at: string | null
          description: string
          discount_value: number | null
          driver_name: string | null
          due_date: string | null
          entity_name: string | null
          id: string
          is_asset_receipt: boolean | null
          issue_date: string | null
          notes: string | null
          original_value: number
          paid_value: number | null
          settlement_date: string | null
          status: string | null
          sub_type: string | null
          updated_at: string | null
          weight_kg: number | null
        }
        Insert: {
          asset_id?: string | null
          asset_name?: string | null
          bank_account?: string | null
          category?: string | null
          company_id: string
          created_at?: string | null
          description: string
          discount_value?: number | null
          driver_name?: string | null
          due_date?: string | null
          entity_name?: string | null
          id: string
          is_asset_receipt?: boolean | null
          issue_date?: string | null
          notes?: string | null
          original_value?: number
          paid_value?: number | null
          settlement_date?: string | null
          status?: string | null
          sub_type?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Update: {
          asset_id?: string | null
          asset_name?: string | null
          bank_account?: string | null
          category?: string | null
          company_id?: string
          created_at?: string | null
          description?: string
          discount_value?: number | null
          driver_name?: string | null
          due_date?: string | null
          entity_name?: string | null
          id?: string
          is_asset_receipt?: boolean | null
          issue_date?: string | null
          notes?: string | null
          original_value?: number
          paid_value?: number | null
          settlement_date?: string | null
          status?: string | null
          sub_type?: string | null
          updated_at?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      critical_events: {
        Row: {
          affected_records_count: number | null
          approved_at: string | null
          approved_by: string | null
          company_id: string | null
          created_at: string
          description: string
          event_type: string
          id: string
          ip_address: string | null
          requires_approval: boolean | null
          severity: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          affected_records_count?: number | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string
          description: string
          event_type: string
          id?: string
          ip_address?: string | null
          requires_approval?: boolean | null
          severity?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          affected_records_count?: number | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string | null
          created_at?: string
          description?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          requires_approval?: boolean | null
          severity?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "critical_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          active: boolean
          address: string | null
          birth_date: string | null
          city_id: number | null
          company_id: string | null
          created_at: string
          document: string
          email: string | null
          id: string
          license_expiry_date: string | null
          license_number: string
          name: string
          partner_id: string | null
          phone: string | null
          state_id: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          birth_date?: string | null
          city_id?: number | null
          company_id?: string | null
          created_at?: string
          document: string
          email?: string | null
          id?: string
          license_expiry_date?: string | null
          license_number: string
          name: string
          partner_id?: string | null
          phone?: string | null
          state_id?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          birth_date?: string | null
          city_id?: number | null
          company_id?: string | null
          created_at?: string
          document?: string
          email?: string | null
          id?: string
          license_expiry_date?: string | null
          license_number?: string
          name?: string
          partner_id?: string | null
          phone?: string | null
          state_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partners_with_primary_address"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "ufs"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          expense_type_id: string
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          expense_type_id: string
          id: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          expense_type_id?: string
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_expense_type_id_fkey"
            columns: ["expense_type_id"]
            isOneToOne: false
            referencedRelation: "expense_types"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_types: {
        Row: {
          color: string
          company_id: string | null
          created_at: string
          icon: string | null
          id: string
          is_system: boolean
          name: string
          type_key: string
          updated_at: string
        }
        Insert: {
          color: string
          company_id?: string | null
          created_at?: string
          icon?: string | null
          id: string
          is_system?: boolean
          name: string
          type_key: string
          updated_at?: string
        }
        Update: {
          color?: string
          company_id?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          type_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_adjustments: {
        Row: {
          amount: number
          created_at: string
          financial_entry_id: string | null
          id: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          financial_entry_id?: string | null
          id?: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          financial_entry_id?: string | null
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_adjustments_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_adjustments_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: false
            referencedRelation: "financial_history_v2"
            referencedColumns: ["entry_id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          origin_id: string | null
          origin_module: string | null
          status: Database["public"]["Enums"]["financial_entry_status"] | null
          total_amount: number
          type: Database["public"]["Enums"]["financial_entry_type"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          origin_id?: string | null
          origin_module?: string | null
          status?: Database["public"]["Enums"]["financial_entry_status"] | null
          total_amount: number
          type: Database["public"]["Enums"]["financial_entry_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          origin_id?: string | null
          origin_module?: string | null
          status?: Database["public"]["Enums"]["financial_entry_status"] | null
          total_amount?: number
          type?: Database["public"]["Enums"]["financial_entry_type"]
          updated_at?: string
        }
        Relationships: []
      }
      financial_history: {
        Row: {
          amount: number
          balance_after: number | null
          balance_before: number | null
          bank_account_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          notes: string | null
          operation: string
          partner_id: string | null
          reference_id: string | null
          reference_type: string | null
          type: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          balance_before?: number | null
          bank_account_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          description: string
          id?: string
          notes?: string | null
          operation: string
          partner_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          balance_before?: number | null
          bank_account_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          notes?: string | null
          operation?: string
          partner_id?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_history_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_history_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_history_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partners_with_primary_address"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          account_id: string | null
          amount: number
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string
          entry_id: string | null
          id: string
          transaction_date: string
          transfer_id: string | null
          type: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description: string
          entry_id?: string | null
          id?: string
          transaction_date: string
          transfer_id?: string | null
          type: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          entry_id?: string | null
          id?: string
          transaction_date?: string
          transfer_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_payable_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "payables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_receivable_id_fkey"
            columns: ["receivable_id"]
            isOneToOne: false
            referencedRelation: "receivables"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions_v2: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          financial_entry_id: string | null
          id: string
          movement_type: Database["public"]["Enums"]["financial_movement_type"]
          payment_date: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string
          financial_entry_id?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["financial_movement_type"]
          payment_date?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          financial_entry_id?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["financial_movement_type"]
          payment_date?: string
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
          {
            foreignKeyName: "financial_transactions_v2_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_v2_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: false
            referencedRelation: "financial_history_v2"
            referencedColumns: ["entry_id"]
          },
        ]
      }
      freight_expenses: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          is_deduction: boolean | null
          loading_id: string | null
          type: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_deduction?: boolean | null
          loading_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_deduction?: boolean | null
          loading_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "freight_expenses_loading_id_fkey"
            columns: ["loading_id"]
            isOneToOne: false
            referencedRelation: "logistics_loadings"
            referencedColumns: ["id"]
          },
        ]
      }
      initial_balances: {
        Row: {
          account_id: string
          account_name: string
          company_id: string | null
          created_at: string
          date: string
          id: string
          updated_at: string
          value: number
        }
        Insert: {
          account_id: string
          account_name: string
          company_id?: string | null
          created_at?: string
          date: string
          id?: string
          updated_at?: string
          value: number
        }
        Update: {
          account_id?: string
          account_name?: string
          company_id?: string | null
          created_at?: string
          date?: string
          id?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "initial_balances_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "initial_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          account_id: string | null
          amount: number
          company_id: string | null
          contract_date: string
          created_at: string
          created_by: string | null
          due_date: string
          entity_name: string | null
          id: string
          interest_rate: number | null
          notes: string | null
          outstanding_balance: number
          partner_id: string | null
          status: string
          total_payable: number | null
          type: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          company_id?: string | null
          contract_date: string
          created_at?: string
          created_by?: string | null
          due_date: string
          entity_name?: string | null
          id?: string
          interest_rate?: number | null
          notes?: string | null
          outstanding_balance: number
          partner_id?: string | null
          status?: string
          total_payable?: number | null
          type: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          company_id?: string | null
          contract_date?: string
          created_at?: string
          created_by?: string | null
          due_date?: string
          entity_name?: string | null
          id?: string
          interest_rate?: number | null
          notes?: string | null
          outstanding_balance?: number
          partner_id?: string | null
          status?: string
          total_payable?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partners_with_primary_address"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempt_type: string
          company_id: string | null
          created_at: string
          device_info: Json | null
          email: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          attempt_type?: string
          company_id?: string | null
          created_at?: string
          device_info?: Json | null
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          attempt_type?: string
          company_id?: string | null
          created_at?: string
          device_info?: Json | null
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "login_attempts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "login_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      login_history: {
        Row: {
          browser_info: string | null
          company_id: string | null
          created_at: string
          device_info: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          location: string | null
          login_type: string
          session_id: string | null
          two_factor_used: boolean | null
          user_agent: string | null
          user_email: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          browser_info?: string | null
          company_id?: string | null
          created_at?: string
          device_info?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          location?: string | null
          login_type?: string
          session_id?: string | null
          two_factor_used?: boolean | null
          user_agent?: string | null
          user_email: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          browser_info?: string | null
          company_id?: string | null
          created_at?: string
          device_info?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          location?: string | null
          login_type?: string
          session_id?: string | null
          two_factor_used?: boolean | null
          user_agent?: string | null
          user_email?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "login_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "login_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      login_rotation_config: {
        Row: {
          auto_refresh_seconds: number | null
          company_id: string | null
          created_at: string
          display_order: string
          id: string
          last_rotation_at: string | null
          next_rotation_at: string | null
          rotation_frequency: string
          updated_at: string
        }
        Insert: {
          auto_refresh_seconds?: number | null
          company_id?: string | null
          created_at?: string
          display_order?: string
          id?: string
          last_rotation_at?: string | null
          next_rotation_at?: string | null
          rotation_frequency?: string
          updated_at?: string
        }
        Update: {
          auto_refresh_seconds?: number | null
          company_id?: string | null
          created_at?: string
          display_order?: string
          id?: string
          last_rotation_at?: string | null
          next_rotation_at?: string | null
          rotation_frequency?: string
          updated_at?: string
        }
        Relationships: []
      }
      login_screens: {
        Row: {
          ai_prompt: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_data: string | null
          image_url: string
          is_active: boolean | null
          metadata: Json | null
          sequence_order: number
          source: string
          title: string | null
          updated_at: string
        }
        Insert: {
          ai_prompt?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_data?: string | null
          image_url: string
          is_active?: boolean | null
          metadata?: Json | null
          sequence_order?: number
          source?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          ai_prompt?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_data?: string | null
          image_url?: string
          is_active?: boolean | null
          metadata?: Json | null
          sequence_order?: number
          source?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      logistics_freight_transactions: {
        Row: {
          account_id: string | null
          company_id: string | null
          created_at: string
          id: string
          loading_id: string
          notes: string | null
          txn_date: string
          txn_type: string
          value: number
        }
        Insert: {
          account_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          loading_id: string
          notes?: string | null
          txn_date: string
          txn_type: string
          value: number
        }
        Update: {
          account_id?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          loading_id?: string
          notes?: string | null
          txn_date?: string
          txn_type?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "logistics_freight_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_freight_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_freight_transactions_loading_id_fkey"
            columns: ["loading_id"]
            isOneToOne: false
            referencedRelation: "logistics_loadings"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_loading_expenses: {
        Row: {
          company_id: string | null
          created_at: string
          date: string
          description: string
          id: string
          loading_id: string
          notes: string | null
          type: string
          value: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          date: string
          description: string
          id?: string
          loading_id: string
          notes?: string | null
          type: string
          value: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          loading_id?: string
          notes?: string | null
          type?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "logistics_loading_expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_loading_expenses_loading_id_fkey"
            columns: ["loading_id"]
            isOneToOne: false
            referencedRelation: "logistics_loadings"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_loading_redirections: {
        Row: {
          company_id: string | null
          created_at: string
          displacement_value: number | null
          from_destination: string | null
          id: string
          loading_id: string
          reason: string | null
          to_destination: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          displacement_value?: number | null
          from_destination?: string | null
          id?: string
          loading_id: string
          reason?: string | null
          to_destination?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          displacement_value?: number | null
          from_destination?: string | null
          id?: string
          loading_id?: string
          reason?: string | null
          to_destination?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logistics_loading_redirections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_loading_redirections_loading_id_fkey"
            columns: ["loading_id"]
            isOneToOne: false
            referencedRelation: "logistics_loadings"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_loadings: {
        Row: {
          breakage_kg: number | null
          carrier_id: string | null
          carrier_name: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          customer_name: string | null
          date: string
          driver_id: string | null
          driver_name: string | null
          freight_advances: number | null
          freight_paid: number | null
          freight_price_per_ton: number | null
          id: string
          invoice_number: string | null
          is_client_transport: boolean | null
          is_redirected: boolean | null
          metadata: Json | null
          notes: string | null
          original_destination: string | null
          product: string
          product_paid: number | null
          purchase_order_id: string | null
          purchase_order_number: string | null
          purchase_price_per_sc: number | null
          redirect_displacement_value: number | null
          sales_order_id: string | null
          sales_order_number: string | null
          sales_price: number | null
          status: string
          supplier_name: string | null
          total_freight_value: number | null
          total_purchase_value: number | null
          total_sales_value: number | null
          unload_weight_kg: number | null
          updated_at: string
          vehicle_id: string | null
          vehicle_plate: string | null
          weight_kg: number
          weight_sc: number | null
          weight_ton: number | null
        }
        Insert: {
          breakage_kg?: number | null
          carrier_id?: string | null
          carrier_name?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          date: string
          driver_id?: string | null
          driver_name?: string | null
          freight_advances?: number | null
          freight_paid?: number | null
          freight_price_per_ton?: number | null
          id?: string
          invoice_number?: string | null
          is_client_transport?: boolean | null
          is_redirected?: boolean | null
          metadata?: Json | null
          notes?: string | null
          original_destination?: string | null
          product: string
          product_paid?: number | null
          purchase_order_id?: string | null
          purchase_order_number?: string | null
          purchase_price_per_sc?: number | null
          redirect_displacement_value?: number | null
          sales_order_id?: string | null
          sales_order_number?: string | null
          sales_price?: number | null
          status: string
          supplier_name?: string | null
          total_freight_value?: number | null
          total_purchase_value?: number | null
          total_sales_value?: number | null
          unload_weight_kg?: number | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_plate?: string | null
          weight_kg: number
          weight_sc?: number | null
          weight_ton?: number | null
        }
        Update: {
          breakage_kg?: number | null
          carrier_id?: string | null
          carrier_name?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string | null
          date?: string
          driver_id?: string | null
          driver_name?: string | null
          freight_advances?: number | null
          freight_paid?: number | null
          freight_price_per_ton?: number | null
          id?: string
          invoice_number?: string | null
          is_client_transport?: boolean | null
          is_redirected?: boolean | null
          metadata?: Json | null
          notes?: string | null
          original_destination?: string | null
          product?: string
          product_paid?: number | null
          purchase_order_id?: string | null
          purchase_order_number?: string | null
          purchase_price_per_sc?: number | null
          redirect_displacement_value?: number | null
          sales_order_id?: string | null
          sales_order_number?: string | null
          sales_price?: number | null
          status?: string
          supplier_name?: string | null
          total_freight_value?: number | null
          total_purchase_value?: number | null
          total_sales_value?: number | null
          unload_weight_kg?: number | null
          updated_at?: string
          vehicle_id?: string | null
          vehicle_plate?: string | null
          weight_kg?: number
          weight_sc?: number | null
          weight_ton?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "logistics_loadings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_loadings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_loadings_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_loadings_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_loadings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_addresses: {
        Row: {
          active: boolean
          address_type: string
          city_id: number | null
          company_id: string | null
          complement: string | null
          coordinates: string | null
          created_at: string
          id: string
          is_primary: boolean
          neighborhood: string | null
          number: string | null
          partner_id: string
          state_id: number | null
          street: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          active?: boolean
          address_type: string
          city_id?: number | null
          company_id?: string | null
          complement?: string | null
          coordinates?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          neighborhood?: string | null
          number?: string | null
          partner_id: string
          state_id?: number | null
          street: string
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          active?: boolean
          address_type?: string
          city_id?: number | null
          company_id?: string | null
          complement?: string | null
          coordinates?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          neighborhood?: string | null
          number?: string | null
          partner_id?: string
          state_id?: number | null
          street?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_addresses_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_addresses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_addresses_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_addresses_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partners_with_primary_address"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_addresses_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "ufs"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_contacts: {
        Row: {
          active: boolean
          company_id: string | null
          contact_type: string
          created_at: string
          department: string | null
          email: string | null
          id: string
          is_primary: boolean
          job_title: string | null
          mobile_phone: string | null
          name: string
          partner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id?: string | null
          contact_type: string
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          job_title?: string | null
          mobile_phone?: string | null
          name: string
          partner_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string | null
          contact_type?: string
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean
          job_title?: string | null
          mobile_phone?: string | null
          name?: string
          partner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_contacts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_contacts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partners_with_primary_address"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_history: {
        Row: {
          action: string
          changed_by: string | null
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          partner_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          partner_id: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_history_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_history_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partners_with_primary_address"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_types: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          active: boolean
          company_id: string | null
          created_at: string
          document: string
          email: string | null
          id: string
          mobile_phone: string | null
          name: string
          nickname: string | null
          notes: string | null
          partner_type_id: string
          phone: string | null
          trade_name: string | null
          type: string
          updated_at: string
          website: string | null
        }
        Insert: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          document: string
          email?: string | null
          id?: string
          mobile_phone?: string | null
          name: string
          nickname?: string | null
          notes?: string | null
          partner_type_id: string
          phone?: string | null
          trade_name?: string | null
          type: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          document?: string
          email?: string | null
          id?: string
          mobile_phone?: string | null
          name?: string
          nickname?: string | null
          notes?: string | null
          partner_type_id?: string
          phone?: string | null
          trade_name?: string | null
          type?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_partner_type_id_fkey"
            columns: ["partner_type_id"]
            isOneToOne: false
            referencedRelation: "partner_types"
            referencedColumns: ["id"]
          },
        ]
      }
      payables: {
        Row: {
          amount: number
          bank_account_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string
          driver_name: string | null
          due_date: string
          id: string
          load_count: number | null
          loading_id: string | null
          notes: string | null
          paid_amount: number | null
          partner_id: string
          partner_name: string | null
          payment_date: string | null
          payment_method: string | null
          purchase_order_id: string | null
          status: string
          sub_type: string | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          driver_name?: string | null
          due_date: string
          id?: string
          load_count?: number | null
          loading_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          partner_id: string
          partner_name?: string | null
          payment_date?: string | null
          payment_method?: string | null
          purchase_order_id?: string | null
          status?: string
          sub_type?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          driver_name?: string | null
          due_date?: string
          id?: string
          load_count?: number | null
          loading_id?: string | null
          notes?: string | null
          paid_amount?: number | null
          partner_id?: string
          partner_name?: string | null
          payment_date?: string | null
          payment_method?: string | null
          purchase_order_id?: string | null
          status?: string
          sub_type?: string | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payables_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_loading_id_fkey"
            columns: ["loading_id"]
            isOneToOne: false
            referencedRelation: "logistics_loadings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partners_with_primary_address"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_types: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id: string
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_expenses: {
        Row: {
          bank_account_id: string | null
          company_id: string | null
          created_at: string | null
          description: string
          expense_category_id: string
          expense_date: string
          id: string
          notes: string | null
          paid: boolean | null
          payment_date: string | null
          purchase_order_id: string
          updated_at: string | null
          value: number
        }
        Insert: {
          bank_account_id?: string | null
          company_id?: string | null
          created_at?: string | null
          description: string
          expense_category_id: string
          expense_date: string
          id?: string
          notes?: string | null
          paid?: boolean | null
          payment_date?: string | null
          purchase_order_id: string
          updated_at?: string | null
          value: number
        }
        Update: {
          bank_account_id?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string
          expense_category_id?: string
          expense_date?: string
          id?: string
          notes?: string | null
          paid?: boolean | null
          payment_date?: string | null
          purchase_order_id?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_expenses_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_expenses_expense_category_id_fkey"
            columns: ["expense_category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_expenses_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          product_type_id: string
          purchase_order_id: string
          quantity: number
          received_quantity: number | null
          subtotal: number | null
          unit_price: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          product_type_id: string
          purchase_order_id: string
          quantity: number
          received_quantity?: number | null
          subtotal?: number | null
          unit_price: number
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          product_type_id?: string
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number | null
          subtotal?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_type_id_fkey"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          date: string
          expected_date: string | null
          id: string
          metadata: Json | null
          notes: string | null
          number: string
          partner_id: string
          partner_name: string | null
          received_value: number
          status: string
          total_value: number
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date: string
          expected_date?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          number: string
          partner_id: string
          partner_name?: string | null
          received_value?: number
          status: string
          total_value?: number
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          expected_date?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          number?: string
          partner_id?: string
          partner_name?: string | null
          received_value?: number
          status?: string
          total_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partners_with_primary_address"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_receipts: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          purchase_order_id: string
          receipt_date: string
          received_by: string | null
          received_quantity: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          purchase_order_id: string
          receipt_date: string
          received_by?: string | null
          received_quantity: number
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          purchase_order_id?: string
          receipt_date?: string
          received_by?: string | null
          received_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_receipts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      receivables: {
        Row: {
          amount: number
          bank_account_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string
          due_date: string
          id: string
          notes: string | null
          partner_id: string
          payment_method: string | null
          receipt_date: string | null
          received_amount: number | null
          sales_order_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          due_date: string
          id?: string
          notes?: string | null
          partner_id: string
          payment_method?: string | null
          receipt_date?: string | null
          received_amount?: number | null
          sales_order_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string
          id?: string
          notes?: string | null
          partner_id?: string
          payment_method?: string | null
          receipt_date?: string | null
          received_amount?: number | null
          sales_order_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivables_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partners_with_primary_address"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      refresh_tokens: {
        Row: {
          company_id: string | null
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          is_revoked: boolean | null
          revoked_at: string | null
          token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: string | null
          is_revoked?: boolean | null
          revoked_at?: string | null
          token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_revoked?: boolean | null
          revoked_at?: string | null
          token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refresh_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refresh_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      report_access_logs: {
        Row: {
          access_time: string
          company_id: string | null
          created_at: string
          exported_to_pdf: boolean | null
          filters: Json | null
          id: string
          records_count: number | null
          report_id: string
          report_title: string
          user_id: string | null
        }
        Insert: {
          access_time?: string
          company_id?: string | null
          created_at?: string
          exported_to_pdf?: boolean | null
          filters?: Json | null
          id?: string
          records_count?: number | null
          report_id: string
          report_title: string
          user_id?: string | null
        }
        Update: {
          access_time?: string
          company_id?: string | null
          created_at?: string
          exported_to_pdf?: boolean | null
          filters?: Json | null
          id?: string
          records_count?: number | null
          report_id?: string
          report_title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sales_deliveries: {
        Row: {
          company_id: string | null
          created_at: string
          delivered_by: string | null
          delivery_date: string
          id: string
          notes: string | null
          sales_order_id: string
          shipped_quantity: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          delivered_by?: string | null
          delivery_date: string
          id?: string
          notes?: string | null
          sales_order_id: string
          shipped_quantity: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          delivered_by?: string | null
          delivery_date?: string
          id?: string
          notes?: string | null
          sales_order_id?: string
          shipped_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_deliveries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_deliveries_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          notes: string | null
          product_type_id: string
          quantity: number
          sales_order_id: string
          shipped_quantity: number | null
          subtotal: number | null
          unit_price: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_type_id: string
          quantity: number
          sales_order_id: string
          shipped_quantity?: number | null
          subtotal?: number | null
          unit_price: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_type_id?: string
          quantity?: number
          sales_order_id?: string
          shipped_quantity?: number | null
          subtotal?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_product_type_id_fkey"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          date: string
          discount: number | null
          expected_delivery_date: string | null
          id: string
          metadata: Json | null
          notes: string | null
          number: string
          partner_id: string
          partner_name: string | null
          shipped_value: number
          status: string
          total_value: number
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          discount?: number | null
          expected_delivery_date?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          number: string
          partner_id: string
          partner_name?: string | null
          shipped_value?: number
          status: string
          total_value?: number
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          discount?: number | null
          expected_delivery_date?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          number?: string
          partner_id?: string
          partner_name?: string | null
          shipped_value?: number
          status?: string
          total_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "v_partners_with_primary_address"
            referencedColumns: ["id"]
          },
        ]
      }
      shareholder_records: {
        Row: {
          bank_account: string | null
          category: string | null
          company_id: string
          created_at: string | null
          description: string
          discount_value: number | null
          due_date: string | null
          entity_name: string | null
          id: string
          issue_date: string | null
          notes: string | null
          original_value: number
          paid_value: number | null
          settlement_date: string | null
          status: string | null
          sub_type: string | null
          updated_at: string | null
        }
        Insert: {
          bank_account?: string | null
          category?: string | null
          company_id: string
          created_at?: string | null
          description: string
          discount_value?: number | null
          due_date?: string | null
          entity_name?: string | null
          id: string
          issue_date?: string | null
          notes?: string | null
          original_value?: number
          paid_value?: number | null
          settlement_date?: string | null
          status?: string | null
          sub_type?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_account?: string | null
          category?: string | null
          company_id?: string
          created_at?: string | null
          description?: string
          discount_value?: number | null
          due_date?: string | null
          entity_name?: string | null
          id?: string
          issue_date?: string | null
          notes?: string | null
          original_value?: number
          paid_value?: number | null
          settlement_date?: string | null
          status?: string | null
          sub_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shareholder_transactions: {
        Row: {
          account_id: string | null
          account_name: string | null
          company_id: string | null
          created_at: string
          date: string
          description: string
          id: string
          shareholder_id: string
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          company_id?: string | null
          created_at?: string
          date: string
          description: string
          id?: string
          shareholder_id: string
          type: string
          updated_at?: string
          value: number
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          company_id?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          shareholder_id?: string
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "shareholder_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shareholder_transactions_shareholder_id_fkey"
            columns: ["shareholder_id"]
            isOneToOne: false
            referencedRelation: "shareholders"
            referencedColumns: ["id"]
          },
        ]
      }
      shareholders: {
        Row: {
          address_city: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          company_id: string | null
          cpf: string | null
          created_at: string
          current_balance: number
          email: string | null
          id: string
          last_pro_labore_date: string | null
          name: string
          phone: string | null
          pro_labore_value: number
          recurrence_active: boolean
          recurrence_amount: number
          recurrence_day: number
          recurrence_last_generated_month: string | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          company_id?: string | null
          cpf?: string | null
          created_at?: string
          current_balance?: number
          email?: string | null
          id?: string
          last_pro_labore_date?: string | null
          name: string
          phone?: string | null
          pro_labore_value?: number
          recurrence_active?: boolean
          recurrence_amount?: number
          recurrence_day?: number
          recurrence_last_generated_month?: string | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          company_id?: string | null
          cpf?: string | null
          created_at?: string
          current_balance?: number
          email?: string | null
          id?: string
          last_pro_labore_date?: string | null
          name?: string
          phone?: string | null
          pro_labore_value?: number
          recurrence_active?: boolean
          recurrence_amount?: number
          recurrence_day?: number
          recurrence_last_generated_month?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shareholders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      standalone_receipts: {
        Row: {
          asset_id: string | null
          asset_name: string | null
          bank_account: string | null
          category: string | null
          company_id: string
          created_at: string | null
          description: string
          discount_value: number | null
          due_date: string | null
          entity_name: string | null
          id: string
          is_asset_receipt: boolean | null
          issue_date: string | null
          notes: string | null
          original_value: number
          paid_value: number | null
          settlement_date: string | null
          status: string | null
          sub_type: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          asset_name?: string | null
          bank_account?: string | null
          category?: string | null
          company_id: string
          created_at?: string | null
          description: string
          discount_value?: number | null
          due_date?: string | null
          entity_name?: string | null
          id: string
          is_asset_receipt?: boolean | null
          issue_date?: string | null
          notes?: string | null
          original_value?: number
          paid_value?: number | null
          settlement_date?: string | null
          status?: string | null
          sub_type?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          asset_name?: string | null
          bank_account?: string | null
          category?: string | null
          company_id?: string
          created_at?: string | null
          description?: string
          discount_value?: number | null
          due_date?: string | null
          entity_name?: string | null
          id?: string
          is_asset_receipt?: boolean | null
          issue_date?: string | null
          notes?: string | null
          original_value?: number
          paid_value?: number | null
          settlement_date?: string | null
          status?: string | null
          sub_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      standalone_records: {
        Row: {
          asset_id: string | null
          asset_name: string | null
          bank_account: string | null
          category: string
          company_id: string | null
          created_at: string | null
          description: string
          discount_value: number | null
          driver_name: string | null
          due_date: string
          entity_name: string
          id: string
          is_asset_receipt: boolean | null
          issue_date: string
          load_count: number | null
          notes: string | null
          original_value: number
          paid_value: number | null
          settlement_date: string | null
          status: string
          sub_type: string | null
          total_sc: number | null
          total_ton: number | null
          unit_price_sc: number | null
          unit_price_ton: number | null
          updated_at: string | null
          weight_kg: number | null
          weight_sc: number | null
        }
        Insert: {
          asset_id?: string | null
          asset_name?: string | null
          bank_account?: string | null
          category: string
          company_id?: string | null
          created_at?: string | null
          description: string
          discount_value?: number | null
          driver_name?: string | null
          due_date: string
          entity_name: string
          id: string
          is_asset_receipt?: boolean | null
          issue_date: string
          load_count?: number | null
          notes?: string | null
          original_value: number
          paid_value?: number | null
          settlement_date?: string | null
          status: string
          sub_type?: string | null
          total_sc?: number | null
          total_ton?: number | null
          unit_price_sc?: number | null
          unit_price_ton?: number | null
          updated_at?: string | null
          weight_kg?: number | null
          weight_sc?: number | null
        }
        Update: {
          asset_id?: string | null
          asset_name?: string | null
          bank_account?: string | null
          category?: string
          company_id?: string | null
          created_at?: string | null
          description?: string
          discount_value?: number | null
          driver_name?: string | null
          due_date?: string
          entity_name?: string
          id?: string
          is_asset_receipt?: boolean | null
          issue_date?: string
          load_count?: number | null
          notes?: string | null
          original_value?: number
          paid_value?: number | null
          settlement_date?: string | null
          status?: string
          sub_type?: string | null
          total_sc?: number | null
          total_ton?: number | null
          unit_price_sc?: number | null
          unit_price_ton?: number | null
          updated_at?: string | null
          weight_kg?: number | null
          weight_sc?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "standalone_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string
          from_account_id: string
          id: string
          notes: string | null
          to_account_id: string
          transfer_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          from_account_id: string
          id?: string
          notes?: string | null
          to_account_id: string
          transfer_date: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          from_account_id?: string
          id?: string
          notes?: string | null
          to_account_id?: string
          transfer_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
        ]
      }
      transporters: {
        Row: {
          active: boolean
          company_id: string | null
          created_at: string
          document: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          document: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          document?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transporters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_devices: {
        Row: {
          company_id: string | null
          created_at: string
          device_fingerprint: string
          device_name: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_used_at: string | null
          trusted_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          device_fingerprint: string
          device_name?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_used_at?: string | null
          trusted_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          device_fingerprint?: string
          device_name?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_used_at?: string | null
          trusted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trusted_devices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trusted_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ufs: {
        Row: {
          code: number
          company_id: string | null
          created_at: string
          id: number
          name: string
          uf: string
          updated_at: string
        }
        Insert: {
          code: number
          company_id?: string | null
          created_at?: string
          id?: number
          name: string
          uf: string
          updated_at?: string
        }
        Update: {
          code?: number
          company_id?: string | null
          created_at?: string
          id?: number
          name?: string
          uf?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ufs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          browser_info: string | null
          company_id: string | null
          created_at: string
          device_info: string | null
          duration_minutes: number | null
          id: string
          ip_address: string | null
          session_end: string | null
          session_start: string
          status: string
          updated_at: string
          user_agent: string | null
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          browser_info?: string | null
          company_id?: string | null
          created_at?: string
          device_info?: string | null
          duration_minutes?: number | null
          id?: string
          ip_address?: string | null
          session_end?: string | null
          session_start?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          browser_info?: string | null
          company_id?: string | null
          created_at?: string
          device_info?: string | null
          duration_minutes?: number | null
          id?: string
          ip_address?: string | null
          session_end?: string | null
          session_start?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          active: boolean
          capacity_kg: number | null
          color: string | null
          company_id: string | null
          created_at: string
          id: string
          model: string | null
          owner_partner_id: string | null
          owner_transporter_id: string | null
          owner_type: string
          plate: string
          type: string
          updated_at: string
          year: number | null
        }
        Insert: {
          active?: boolean
          capacity_kg?: number | null
          color?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          model?: string | null
          owner_partner_id?: string | null
          owner_transporter_id?: string | null
          owner_type: string
          plate: string
          type: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          active?: boolean
          capacity_kg?: number | null
          color?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          model?: string | null
          owner_partner_id?: string | null
          owner_transporter_id?: string | null
          owner_type?: string
          plate?: string
          type?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_owner_partner_id_fkey"
            columns: ["owner_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_owner_partner_id_fkey"
            columns: ["owner_partner_id"]
            isOneToOne: false
            referencedRelation: "v_partners_with_primary_address"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_owner_transporter_id_fkey"
            columns: ["owner_transporter_id"]
            isOneToOne: false
            referencedRelation: "transporters"
            referencedColumns: ["id"]
          },
        ]
      }
      watermarks: {
        Row: {
          active: boolean
          company_id: string | null
          created_at: string
          id: string
          image_url: string | null
          opacity: number
          orientation: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          opacity?: number
          orientation?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          opacity?: number
          orientation?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watermarks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
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
          | Database["public"]["Enums"]["financial_entry_status"]
          | null
          entry_type: Database["public"]["Enums"]["financial_entry_type"] | null
          movement_type:
          | Database["public"]["Enums"]["financial_movement_type"]
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
    Functions: {
      apply_discount_financial_entry: {
        Args: { p_amount: number; p_entry_id: string }
        Returns: undefined
      }
      authenticate_user: {
        Args: { p_email: string; p_password: string }
        Returns: Json
      }
      clean_expired_tokens: { Args: never; Returns: undefined }
      clean_old_login_attempts: { Args: never; Returns: undefined }
      create_financial_entry: {
        Args: {
          p_company_id: string
          p_description: string
          p_due_date: string
          p_origin_id: string
          p_origin_module: string
          p_total: number
          p_type: Database["public"]["Enums"]["financial_entry_type"]
        }
        Returns: string
      }
      create_test_user: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_password: string
        }
        Returns: Json
      }
      create_user_flexible: {
        Args: {
          p_active?: boolean
          p_can_generate_tokens?: boolean
          p_cpf: string
          p_email: string
          p_first_name: string
          p_generate_password?: boolean
          p_last_name: string
          p_password: string
          p_permissions?: Json
          p_phone: string
          p_role?: string
        }
        Returns: Json
      }
      create_user_with_auth:
      | {
        Args: {
          p_active?: boolean
          p_allow_recovery?: boolean
          p_cpf: string
          p_email: string
          p_first_name: string
          p_last_name: string
          p_password: string
          p_permissions?: Json
          p_phone: string
          p_role?: string
        }
        Returns: {
          auth_id: string
          error: string
          success: boolean
          user_id: string
        }[]
      }
      | {
        Args: {
          p_active?: boolean
          p_can_generate_tokens?: boolean
          p_cpf: string
          p_email: string
          p_first_name: string
          p_generate_password?: boolean
          p_last_name: string
          p_password: string
          p_permissions?: Json
          p_phone: string
          p_role?: string
        }
        Returns: Json
      }
      create_user_with_bcrypt: {
        Args: {
          p_active?: boolean
          p_allow_recovery?: boolean
          p_cpf: string
          p_email: string
          p_first_name: string
          p_last_name: string
          p_password: string
          p_permissions?: Json
          p_phone: string
          p_role?: string
        }
        Returns: Json
      }
      delete_user_by_id: { Args: { p_user_id: string }; Returns: Json }
      delete_user_with_auth: {
        Args: { p_app_user_id: string }
        Returns: {
          error: string
          success: boolean
        }[]
      }
      get_my_company: { Args: never; Returns: string }
      get_my_company_id: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      increment_failed_attempts: {
        Args: { p_email: string }
        Returns: undefined
      }
      is_user_locked: { Args: { p_email: string }; Returns: boolean }
      partner_contribution: {
        Args: {
          p_account_id: string
          p_amount: number
          p_company_id: string
          p_partner_id: string
        }
        Returns: undefined
      }
      partner_withdrawal: {
        Args: {
          p_account_id: string
          p_amount: number
          p_company_id: string
          p_partner_id: string
        }
        Returns: undefined
      }
      pay_financial_entry: {
        Args: { p_account_id: string; p_amount: number; p_entry_id: string }
        Returns: undefined
      }
      reset_failed_attempts: { Args: { p_email: string }; Returns: undefined }
      transfer_between_accounts: {
        Args: { p_amount: number; p_from_account: string; p_to_account: string }
        Returns: undefined
      }
      verify_user_password: {
        Args: { p_email: string; p_password: string }
        Returns: Json
      }
    }
    Enums: {
      financial_entry_status:
      | "pending"
      | "partially_paid"
      | "paid"
      | "cancelled"
      financial_entry_type:
      | "payable"
      | "receivable"
      | "expense"
      | "commission"
      | "advance"
      | "partner_contribution"
      | "partner_withdrawal"
      | "loan_receivable"
      | "loan_payable"
      | "internal_credit"
      financial_movement_type: "credit" | "debit"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      financial_entry_status: [
        "pending",
        "partially_paid",
        "paid",
        "cancelled",
      ],
      financial_entry_type: [
        "payable",
        "receivable",
        "expense",
        "commission",
        "advance",
        "partner_contribution",
        "partner_withdrawal",
        "loan_receivable",
        "loan_payable",
        "internal_credit",
      ],
      financial_movement_type: ["credit", "debit"],
    },
  },
} as const

