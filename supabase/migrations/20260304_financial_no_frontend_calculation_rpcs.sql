-- Migration: RPCs para eliminar cálculos financeiros no frontend
-- Data: 2026-03-04

SET search_path = public;

-- ============================================================================
-- 1) Totais de linhas de crédito (server-side)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_credit_lines_totals()
RETURNS TABLE(
  total_limit NUMERIC,
  total_used NUMERIC,
  total_available NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(cl.total_limit), 0)::NUMERIC,
    COALESCE(SUM(cl.used_amount), 0)::NUMERIC,
    COALESCE(SUM(cl.available_amount), 0)::NUMERIC
  FROM public.credit_lines cl
  WHERE cl.is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_credit_lines_totals() TO authenticated;

-- ============================================================================
-- 2) Resumo de transações por conta (credit/debit)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_financial_transactions_summary_by_account(
  p_account_id UUID
)
RETURNS TABLE(
  credits NUMERIC,
  debits NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN ft.type = 'credit' THEN ft.amount ELSE 0 END), 0)::NUMERIC AS credits,
    COALESCE(SUM(CASE WHEN ft.type = 'debit' THEN ft.amount ELSE 0 END), 0)::NUMERIC AS debits
  FROM public.financial_transactions ft
  WHERE ft.account_id = p_account_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_financial_transactions_summary_by_account(UUID) TO authenticated;

-- ============================================================================
-- 3) Saldo total de contas ativas (server-side)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_accounts_total_balance()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(a.balance), 0)::NUMERIC
  INTO v_total
  FROM public.accounts a
  WHERE a.is_active = true;

  RETURN COALESCE(v_total, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_accounts_total_balance() TO authenticated;
