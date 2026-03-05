-- ============================================================================
-- RPCs para eliminar cálculos financeiros no frontend
-- Data: 2026-03-04
-- Problema: Frontend calcula totalInflow, totalOutflow, totalMonthTransfers,
--           totalReceivable, etc. via .reduce() — viola regra canônica.
-- Solução: RPCs server-side que retornam os totais prontos.
-- ============================================================================

-- 1) Totais de entradas/saídas para o HistoryTab
CREATE OR REPLACE FUNCTION public.rpc_transactions_totals_by_date_range(
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_company_id UUID;
  v_inflow  NUMERIC := 0;
  v_outflow NUMERIC := 0;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN json_build_object('totalInflow', 0, 'totalOutflow', 0, 'totalNet', 0);
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN lower(type) IN ('credit', 'in') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN lower(type) IN ('debit', 'out') THEN amount ELSE 0 END), 0)
  INTO v_inflow, v_outflow
  FROM public.financial_transactions
  WHERE company_id = v_company_id
    AND transaction_date >= p_start_date
    AND transaction_date <= p_end_date;

  RETURN json_build_object(
    'totalInflow', v_inflow,
    'totalOutflow', v_outflow,
    'totalNet', v_inflow - v_outflow
  );
END;
$$;

-- 2) Total de transferências do mês para TransfersTab
CREATE OR REPLACE FUNCTION public.rpc_transfers_month_total(
  p_year  INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT,
  p_month INT DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_company_id UUID;
  v_total NUMERIC := 0;
  v_count INT := 0;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN json_build_object('total', 0, 'count', 0);
  END IF;

  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + INTERVAL '1 month - 1 day')::date;

  SELECT COALESCE(SUM(amount), 0), COUNT(*)
  INTO v_total, v_count
  FROM public.transfers
  WHERE company_id = v_company_id
    AND status != 'cancelled'
    AND transfer_date >= v_start_date
    AND transfer_date <= v_end_date;

  RETURN json_build_object('total', v_total, 'count', v_count);
END;
$$;

-- 3) Total a receber (receivables pendentes) para ReceivablesList
CREATE OR REPLACE FUNCTION public.rpc_receivables_pending_total()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_company_id UUID;
  v_total NUMERIC := 0;
  v_count INT := 0;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN json_build_object('total', 0, 'count', 0);
  END IF;

  SELECT
    COALESCE(SUM(total_amount - paid_amount), 0),
    COUNT(*)
  INTO v_total, v_count
  FROM public.financial_entries
  WHERE company_id = v_company_id
    AND type = 'receivable'
    AND status IN ('open', 'partially_paid');

  RETURN json_build_object('total', v_total, 'count', v_count);
END;
$$;

-- 4) Totais de empréstimos ativos (tomados vs concedidos) para LoanKPIs
CREATE OR REPLACE FUNCTION public.rpc_loans_active_totals()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_company_id UUID;
  v_taken NUMERIC := 0;
  v_granted NUMERIC := 0;
  v_count_active INT := 0;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN json_build_object('takenTotal', 0, 'grantedTotal', 0, 'countActive', 0);
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN type = 'taken' THEN remaining_value ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'granted' THEN remaining_value ELSE 0 END), 0),
    COUNT(*)
  INTO v_taken, v_granted, v_count_active
  FROM public.loans
  WHERE company_id = v_company_id
    AND status = 'active';

  RETURN json_build_object(
    'takenTotal', v_taken,
    'grantedTotal', v_granted,
    'countActive', v_count_active
  );
END;
$$;

-- 5) Totais de créditos/débitos de sócio para ShareholderDetails
CREATE OR REPLACE FUNCTION public.rpc_shareholder_totals(
  p_shareholder_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_company_id UUID;
  v_credits NUMERIC := 0;
  v_debits NUMERIC := 0;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN json_build_object('totalCredits', 0, 'totalDebits', 0, 'balance', 0);
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN type = 'credit' THEN value ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'debit' THEN value ELSE 0 END), 0)
  INTO v_credits, v_debits
  FROM public.shareholder_transactions
  WHERE company_id = v_company_id
    AND shareholder_id = p_shareholder_id;

  RETURN json_build_object(
    'totalCredits', v_credits,
    'totalDebits', v_debits,
    'balance', v_credits - v_debits
  );
END;
$$;
