import type { Json } from './json';
import type { Enums } from './enums';

export interface Functions {
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
      p_type: Enums["financial_entry_type"]
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
