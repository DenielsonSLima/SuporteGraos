-- ============================================================================
-- Migration: Fix Account Balance Types Robustness (IN/OUT and credit/debit case-insensitivity)
-- Date: 2026-05-27
-- ============================================================================

SET search_path = public;

-- 1. Re-create public.fn_update_account_balance_by_id to be case-insensitive and support both legacy IN/OUT and credit/debit types
CREATE OR REPLACE FUNCTION public.fn_update_account_balance_by_id(p_account_id uuid, p_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_initial    DECIMAL := 0;
  v_initial_date DATE;
  v_tx_sum     DECIMAL := 0;
BEGIN
  -- A) Buscar saldo inicial da conta e sua data de implantação (marco zero)
  SELECT COALESCE(value, 0), date
  INTO v_initial, v_initial_date
  FROM public.initial_balances
  WHERE account_id = p_account_id
    AND company_id = p_company_id
  LIMIT 1;

  IF v_initial_date IS NULL THEN
    v_initial := 0;
    v_initial_date := '1900-01-01'::date;
  END IF;

  -- B) Somar transações que ocorreram a partir da data de implantação (inclusive)
  SELECT COALESCE(SUM(
    CASE
      WHEN lower(type) IN ('credit', 'in') THEN amount
      WHEN lower(type) IN ('debit', 'out') THEN -amount
      ELSE 0
    END
  ), 0)
  INTO v_tx_sum
  FROM public.financial_transactions
  WHERE account_id = p_account_id
    AND company_id = p_company_id
    AND transaction_date >= v_initial_date;

  -- C) Atualizar saldo consolidado na tabela de contas
  UPDATE public.accounts SET
    balance = v_initial + v_tx_sum,
    updated_at = now()
  WHERE id = p_account_id;
END;
$function$;

-- 2. Re-create public.fn_get_account_balance_at_date to use case-insensitive logic
CREATE OR REPLACE FUNCTION public.fn_get_account_balance_at_date(p_account_id uuid, p_date date)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_initial NUMERIC := 0;
  v_initial_date DATE;
  v_tx_sum NUMERIC := 0;
BEGIN
  -- A) Pega o valor inicial implantado e sua data (se houver)
  SELECT COALESCE(value, 0), date INTO v_initial, v_initial_date
  FROM public.initial_balances 
  WHERE account_id = p_account_id;

  IF v_initial_date IS NULL THEN
    v_initial := 0;
    v_initial_date := '1900-01-01'::date;
  END IF;

  -- B) Soma as transações entre a data de implantação (inclusive) e a data limite (exclusiva)
  IF p_date > v_initial_date THEN
    SELECT COALESCE(SUM(
      CASE 
        WHEN lower(type) IN ('credit', 'in') THEN amount
        WHEN lower(type) IN ('debit', 'out') THEN -amount
        ELSE 0
      END
    ), 0) INTO v_tx_sum
    FROM public.financial_transactions
    WHERE account_id = p_account_id 
      AND transaction_date >= v_initial_date 
      AND transaction_date < p_date;
  ELSE
    v_tx_sum := 0;
  END IF;

  RETURN v_initial + v_tx_sum;
END;
$function$;

-- 3. Re-create public.rpc_monthly_balance_sheet to support both case-insensitive IN/OUT and credit/debit
CREATE OR REPLACE FUNCTION public.rpc_monthly_balance_sheet(p_company_id uuid, p_year integer, p_month integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_caller_company UUID;
  v_start_of_month DATE;
  v_end_of_month   DATE;
  v_month_label    TEXT;

  -- Saldos bancários
  v_total_bank_balance     NUMERIC := 0;
  v_total_initial_balance  NUMERIC := 0;
  v_bank_balances          JSON;

  -- Ativos
  v_pending_sales_receipts   NUMERIC := 0;
  v_merchandise_in_transit   NUMERIC := 0;
  v_total_fixed_assets       NUMERIC := 0;
  v_shareholder_receivables  NUMERIC := 0;
  v_loans_granted            NUMERIC := 0;
  v_advances_given           NUMERIC := 0;
  v_total_assets             NUMERIC := 0;

  -- Passivos
  v_pending_purchase_payments NUMERIC := 0;
  v_pending_freight_payments  -- ==========================================
  v_pending_freight_payments  NUMERIC := 0;
  v_commissions_to_pay        NUMERIC := 0;
  v_loans_taken               NUMERIC := 0;
  v_advances_taken            NUMERIC := 0;
  v_shareholder_payables      NUMERIC := 0;
  v_total_liabilities         NUMERIC := 0;

  -- Resultado
  v_net_balance NUMERIC := 0;
  result        JSON;
BEGIN
  -- Validar que o caller pertence à empresa
  SELECT au.company_id INTO v_caller_company
  FROM app_users au
  WHERE au.auth_user_id = (SELECT auth.uid())
  LIMIT 1;

  IF v_caller_company IS NULL OR v_caller_company <> p_company_id THEN
    RAISE EXCEPTION 'Access denied: caller does not belong to company %', p_company_id;
  END IF;

  v_start_of_month := make_date(p_year, p_month, 1);
  v_end_of_month   := (v_start_of_month + interval '1 month - 1 day')::date;
  v_month_label    := to_char(v_start_of_month, 'TMMonth YYYY');

  -- A) SALDOS BANCÁRIOS (respeitando data de implantação)
  WITH active_accounts AS (
    SELECT a.id
    FROM accounts a
    WHERE a.company_id = p_company_id
      AND a.is_active = true
  ),
  initial_vals AS (
    SELECT
      ib.account_id,
      COALESCE(SUM(ib.value), 0) AS init_value,
      MIN(ib.date) AS init_date
    FROM initial_balances ib
    WHERE ib.company_id = p_company_id
      AND ib.account_id IN (SELECT id FROM active_accounts)
    GROUP BY ib.account_id
  ),
  tx_before_month AS (
    SELECT
      ft.account_id,
      SUM(
        CASE
          WHEN lower(ft.type) IN ('credit', 'in') THEN ft.amount
          WHEN lower(ft.type) IN ('debit', 'out') THEN -ft.amount
          ELSE 0
        END
      ) AS net_before
    FROM financial_transactions ft
    LEFT JOIN initial_vals iv ON iv.account_id = ft.account_id
    WHERE ft.company_id = p_company_id
      AND ft.transaction_date < v_start_of_month
      AND ft.transaction_date >= COALESCE(iv.init_date, '1900-01-01'::date)
      AND ft.account_id IN (SELECT id FROM active_accounts)
    GROUP BY ft.account_id
  ),
  tx_in_month AS (
    SELECT
      ft.account_id,
      SUM(
        CASE
          WHEN lower(ft.type) IN ('credit', 'in') THEN ft.amount
          WHEN lower(ft.type) IN ('debit', 'out') THEN -ft.amount
          ELSE 0
        END
      ) AS net_in_month
    FROM financial_transactions ft
    LEFT JOIN initial_vals iv ON iv.account_id = ft.account_id
    WHERE ft.company_id = p_company_id
      AND ft.transaction_date >= v_start_of_month
      AND ft.transaction_date <= v_end_of_month
      AND ft.transaction_date >= COALESCE(iv.init_date, '1900-01-01'::date)
      AND ft.account_id IN (SELECT id FROM active_accounts)
    GROUP BY ft.account_id
  ),
  account_balances AS (
    SELECT
      a.id,
      a.account_name AS bank_name,
      a.owner,
      COALESCE(iv.init_value, 0) + COALESCE(tbm.net_before, 0)
        AS start_balance,
      COALESCE(iv.init_value, 0) + COALESCE(tbm.net_before, 0) + COALESCE(tim.net_in_month, 0)
        AS end_balance
    FROM accounts a
    INNER JOIN active_accounts aa ON aa.id = a.id
    LEFT JOIN initial_vals iv       ON iv.account_id = a.id
    LEFT JOIN tx_before_month tbm   ON tbm.account_id = a.id
    LEFT JOIN tx_in_month tim       ON tim.account_id = a.id
    WHERE a.company_id = p_company_id
  )
  SELECT
    COALESCE(SUM(ab.end_balance), 0),
    COALESCE(json_agg(json_build_object(
      'id',           ab.id,
      'bankName',     ab.bank_name,
      'owner',        ab.owner,
      'startBalance', ab.start_balance,
      'balance',      ab.end_balance
    )), '[]'::json)
  INTO v_total_bank_balance, v_bank_balances
  FROM account_balances ab;

  -- Saldo inicial global
  SELECT COALESCE(SUM(ib.value), 0)
  INTO v_total_initial_balance
  FROM initial_balances ib
  WHERE ib.company_id = p_company_id;

  -- B) ATIVOS
  SELECT COALESCE(SUM(
    COALESCE(fe.remaining_amount, fe.total_amount - COALESCE(fe.paid_amount, 0))
  ), 0)
  INTO v_pending_sales_receipts
  FROM financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'receivable'
    AND fe.origin_type = 'sales_order'
    AND fe.status NOT IN ('paid', 'cancelled', 'canceled')
    AND fe.created_date <= v_end_of_month;

  SELECT COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0)
  INTO v_merchandise_in_transit
  FROM ops_loadings l
  WHERE l.company_id = p_company_id
    AND COALESCE(l.status, '') IN ('loaded', 'in_transit', 'redirected', 'waiting_unload');

  SELECT COALESCE(SUM(a.acquisition_value), 0)
  INTO v_total_fixed_assets
  FROM assets a
  WHERE a.company_id = p_company_id
    AND a.status = 'active';

  SELECT COALESCE(SUM(ABS(s.current_balance)), 0)
  INTO v_shareholder_receivables
  FROM shareholders s
  WHERE s.company_id = p_company_id
    AND s.current_balance < 0;

  v_loans_granted := 0;

  SELECT COALESCE(SUM(
    COALESCE(a.remaining_amount, a.amount - COALESCE(a.settled_amount, 0))
  ), 0)
  INTO v_advances_given
  FROM advances a
  WHERE a.company_id = p_company_id
    AND a.recipient_type = 'given'
    AND a.status NOT IN ('settled', 'cancelled');

  v_total_assets := v_total_bank_balance + v_pending_sales_receipts
    + v_merchandise_in_transit + v_total_fixed_assets
    + v_shareholder_receivables + v_loans_granted + v_advances_given;

  -- C) PASSIVOS
  SELECT COALESCE(SUM(
    COALESCE(fe.remaining_amount, fe.total_amount - COALESCE(fe.paid_amount, 0))
  ), 0)
  INTO v_pending_purchase_payments
  FROM financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.origin_type = 'purchase_order'
    AND fe.status NOT IN ('paid', 'cancelled', 'canceled')
    AND fe.created_date <= v_end_of_month;

  SELECT COALESCE(SUM(
    COALESCE(fe.remaining_amount, fe.total_amount - COALESCE(fe.paid_amount, 0))
  ), 0)
  INTO v_pending_freight_payments
  FROM financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.origin_type = 'freight'
    AND fe.status NOT IN ('paid', 'cancelled', 'canceled')
    AND fe.created_date <= v_end_of_month;

  v_commissions_to_pay := 0;
  v_loans_taken := 0;

  SELECT COALESCE(SUM(
    COALESCE(a.remaining_amount, a.amount - COALESCE(a.settled_amount, 0))
  ), 0)
  INTO v_advances_taken
  FROM advances a
  WHERE a.company_id = p_company_id
    AND a.recipient_type = 'received'
    AND a.status NOT IN ('settled', 'cancelled');

  SELECT COALESCE(SUM(s.current_balance), 0)
  INTO v_shareholder_payables
  FROM shareholders s
  WHERE s.company_id = p_company_id
    AND s.current_balance > 0;

  v_total_liabilities := v_pending_purchase_payments + v_pending_freight_payments
    + v_commissions_to_pay + v_loans_taken + v_advances_taken + v_shareholder_payables;

  -- D) RESULTADO
  v_net_balance := v_total_assets - v_total_liabilities;

  result := json_build_object(
    'monthKey',        to_char(v_start_of_month, 'YYYY-MM'),
    'monthLabel',      v_month_label,
    'referenceDate',   v_end_of_month,

    'bankBalances',              COALESCE(v_bank_balances, '[]'::json),
    'totalBankBalance',          v_total_bank_balance,
    'totalInitialBalance',       v_total_initial_balance,

    'pendingSalesReceipts',      v_pending_sales_receipts,
    'merchandiseInTransitValue', v_merchandise_in_transit,
    'totalFixedAssetsValue',     v_total_fixed_assets,
    'shareholderReceivables',    v_shareholder_receivables,
    'loansGranted',              v_loans_granted,
    'advancesGiven',             v_advances_given,
    'totalAssets',               v_total_assets,

    'pendingPurchasePayments',   v_pending_purchase_payments,
    'pendingFreightPayments',    v_pending_freight_payments,
    'commissionsToPay',          v_commissions_to_pay,
    'loansTaken',                v_loans_taken,
    'advancesTaken',             v_advances_taken,
    'shareholderPayables',       v_shareholder_payables,
    'totalLiabilities',          v_total_liabilities,

    'netBalance',                v_net_balance
  );

  RETURN result;
END;
$function$;
