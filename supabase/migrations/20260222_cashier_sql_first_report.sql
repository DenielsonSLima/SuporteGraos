-- ============================================================================
-- Caixa SQL-first: rpc_cashier_report completo (sem cálculo no frontend)
-- Data: 2026-02-22
-- Objetivo:
--   - Centralizar cálculos de Caixa no banco
--   - Entregar payload completo para CurrentMonthTab/cashierService
--   - Validar isolamento por empresa (RLS + check de company_id)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_cashier_report(p_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_my_company_id UUID;
  v_auth_user_id UUID;

  v_bank_balances JSON := '[]'::json;
  v_initial_balances JSON := '[]'::json;

  v_total_bank_balance NUMERIC := 0;
  v_total_initial_balance NUMERIC := 0;

  v_pending_sales_receipts NUMERIC := 0;
  v_merchandise_in_transit_value NUMERIC := 0;
  v_loans_granted NUMERIC := 0;
  v_advances_given NUMERIC := 0;
  v_total_fixed_assets_value NUMERIC := 0;
  v_pending_asset_sales_receipts NUMERIC := 0;
  v_shareholder_receivables NUMERIC := 0;

  v_pending_purchase_payments NUMERIC := 0;
  v_pending_freight_payments NUMERIC := 0;
  v_loans_taken NUMERIC := 0;
  v_commissions_to_pay NUMERIC := 0;
  v_advances_taken NUMERIC := 0;
  v_shareholder_payables NUMERIC := 0;

  v_total_assets NUMERIC := 0;
  v_total_liabilities NUMERIC := 0;
  v_net_balance NUMERIC := 0;

  result JSON;
BEGIN
  SELECT auth.uid() INTO v_auth_user_id;
  IF v_auth_user_id IS NOT NULL THEN
    SELECT public.my_company_id() INTO v_my_company_id;
    IF v_my_company_id IS NULL THEN
      RAISE EXCEPTION 'Usuário sem empresa vinculada';
    END IF;
    IF p_company_id IS DISTINCT FROM v_my_company_id THEN
      RAISE EXCEPTION 'Acesso negado para company_id %', p_company_id;
    END IF;
  END IF;

  IF to_regclass('public.accounts') IS NOT NULL THEN
    EXECUTE $q$
      SELECT
        COALESCE(json_agg(json_build_object(
          'id', a.id,
          'bankName', a.account_name,
          'owner', a.owner,
          'balance', COALESCE(a.balance, 0)
        ) ORDER BY a.account_name), '[]'::json),
        COALESCE(SUM(a.balance), 0)
      FROM public.accounts a
      WHERE a.company_id = $1
        AND COALESCE(a.is_active, true) = true
    $q$ INTO v_bank_balances, v_total_bank_balance USING p_company_id;
  END IF;

  IF to_regclass('public.initial_balances') IS NOT NULL THEN
    EXECUTE $q$
      SELECT
        COALESCE(json_agg(json_build_object(
          'id', ib.id,
          'accountId', ib.account_id,
          'accountName', ib.account_name,
          'date', ib.date,
          'value', ib.value,
          'bankName', ib.account_name
        ) ORDER BY ib.account_name), '[]'::json),
        COALESCE(SUM(ib.value), 0)
      FROM public.initial_balances ib
      WHERE ib.company_id = $1
    $q$ INTO v_initial_balances, v_total_initial_balance USING p_company_id;
  END IF;

  IF to_regclass('public.receivables') IS NOT NULL THEN
    EXECUTE $q$
      SELECT COALESCE(SUM(GREATEST(COALESCE(r.amount, 0) - COALESCE(r.received_amount, 0), 0)), 0)
      FROM public.receivables r
      WHERE r.company_id = $1
        AND COALESCE(r.sub_type, 'sales_order') = 'sales_order'
        AND COALESCE(r.status, 'pending') NOT IN ('paid', 'received', 'cancelled', 'canceled')
    $q$ INTO v_pending_sales_receipts USING p_company_id;
  ELSIF to_regclass('public.financial_entries') IS NOT NULL THEN
    EXECUTE $q$
      SELECT COALESCE(SUM(GREATEST(
        COALESCE(NULLIF(row_to_json(fe)->>'total_amount', '')::NUMERIC, 0)
        -
        COALESCE(NULLIF(row_to_json(fe)->>'paid_amount', '')::NUMERIC, 0)
      , 0)), 0)
      FROM public.financial_entries fe
      WHERE fe.company_id = $1
        AND COALESCE(row_to_json(fe)->>'type', '') = 'receivable'
        AND COALESCE(row_to_json(fe)->>'origin_module', row_to_json(fe)->>'origin_type', '') = 'sales_order'
        AND COALESCE(row_to_json(fe)->>'status', 'pending') NOT IN ('paid', 'received', 'cancelled', 'canceled')
    $q$ INTO v_pending_sales_receipts USING p_company_id;
  END IF;

  IF to_regclass('public.logistics_loadings') IS NOT NULL THEN
    EXECUTE $q$
      SELECT COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0)
      FROM public.logistics_loadings l
      WHERE l.company_id = $1
        AND COALESCE(l.status, '') IN ('loaded', 'in_transit', 'redirected', 'waiting_unload')
    $q$ INTO v_merchandise_in_transit_value USING p_company_id;
  ELSIF to_regclass('public.ops_loadings') IS NOT NULL THEN
    EXECUTE $q$
      SELECT COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0)
      FROM public.ops_loadings l
      WHERE l.company_id = $1
        AND COALESCE(l.status, '') IN ('loaded', 'in_transit', 'redirected', 'waiting_unload')
    $q$ INTO v_merchandise_in_transit_value USING p_company_id;
  END IF;

  IF to_regclass('public.standalone_records') IS NOT NULL THEN
    EXECUTE $q$
      SELECT COALESCE(SUM(GREATEST(COALESCE(sr.original_value, 0) - COALESCE(sr.paid_value, 0) - COALESCE(sr.discount_value, 0), 0)), 0)
      FROM public.standalone_records sr
      WHERE sr.company_id = $1
        AND COALESCE(sr.sub_type, '') = 'loan_granted'
        AND COALESCE(sr.status, 'pending') NOT IN ('paid', 'received', 'cancelled', 'canceled')
    $q$ INTO v_loans_granted USING p_company_id;

    EXECUTE $q$
      SELECT COALESCE(SUM(GREATEST(COALESCE(sr.original_value, 0) - COALESCE(sr.paid_value, 0) - COALESCE(sr.discount_value, 0), 0)), 0)
      FROM public.standalone_records sr
      WHERE sr.company_id = $1
        AND COALESCE(sr.sub_type, '') = 'loan_taken'
        AND COALESCE(sr.status, 'pending') NOT IN ('paid', 'received', 'cancelled', 'canceled')
    $q$ INTO v_loans_taken USING p_company_id;
  END IF;

  IF to_regclass('public.advances') IS NOT NULL THEN
    EXECUTE $q$
      SELECT COALESCE(SUM(COALESCE(a.remaining_amount, 0)), 0)
      FROM public.advances a
      WHERE a.company_id = $1
        AND COALESCE(a.recipient_type, '') IN ('supplier', 'shareholder')
        AND COALESCE(a.status, 'open') NOT IN ('settled', 'cancelled', 'canceled')
    $q$ INTO v_advances_given USING p_company_id;

    EXECUTE $q$
      SELECT COALESCE(SUM(COALESCE(a.remaining_amount, 0)), 0)
      FROM public.advances a
      WHERE a.company_id = $1
        AND COALESCE(a.recipient_type, '') = 'client'
        AND COALESCE(a.status, 'open') NOT IN ('settled', 'cancelled', 'canceled')
    $q$ INTO v_advances_taken USING p_company_id;
  END IF;

  IF to_regclass('public.assets') IS NOT NULL THEN
    EXECUTE $q$
      SELECT COALESCE(SUM(COALESCE(ast.acquisition_value, 0)), 0)
      FROM public.assets ast
      WHERE ast.company_id = $1
        AND COALESCE(ast.status, 'active') = 'active'
    $q$ INTO v_total_fixed_assets_value USING p_company_id;
  END IF;

  IF to_regclass('public.standalone_receipts') IS NOT NULL THEN
    EXECUTE $q$
      SELECT COALESCE(SUM(GREATEST(COALESCE(sr.original_value, 0) - COALESCE(sr.paid_value, 0) - COALESCE(sr.discount_value, 0), 0)), 0)
      FROM public.standalone_receipts sr
      WHERE sr.company_id = $1
        AND COALESCE(sr.is_asset_receipt, false) = true
        AND COALESCE(sr.status, 'pending') NOT IN ('paid', 'received', 'cancelled', 'canceled')
    $q$ INTO v_pending_asset_sales_receipts USING p_company_id;
  END IF;

  IF to_regclass('public.shareholders') IS NOT NULL THEN
    EXECUTE $q$
      SELECT COALESCE(SUM(ABS(COALESCE(s.current_balance, 0))), 0)
      FROM public.shareholders s
      WHERE s.company_id = $1
        AND COALESCE(s.current_balance, 0) < 0
    $q$ INTO v_shareholder_receivables USING p_company_id;

    EXECUTE $q$
      SELECT COALESCE(SUM(COALESCE(s.current_balance, 0)), 0)
      FROM public.shareholders s
      WHERE s.company_id = $1
        AND COALESCE(s.current_balance, 0) > 0
    $q$ INTO v_shareholder_payables USING p_company_id;
  END IF;

  IF to_regclass('public.payables') IS NOT NULL THEN
    EXECUTE $q$
      SELECT COALESCE(SUM(GREATEST(COALESCE(p.amount, 0) - COALESCE(p.paid_amount, 0), 0)), 0)
      FROM public.payables p
      WHERE p.company_id = $1
        AND COALESCE(p.sub_type, '') = 'purchase_order'
        AND COALESCE(p.status, 'pending') NOT IN ('paid', 'received', 'cancelled', 'canceled')
    $q$ INTO v_pending_purchase_payments USING p_company_id;

    EXECUTE $q$
      SELECT COALESCE(SUM(GREATEST(COALESCE(p.amount, 0) - COALESCE(p.paid_amount, 0), 0)), 0)
      FROM public.payables p
      WHERE p.company_id = $1
        AND COALESCE(p.sub_type, '') = 'freight'
        AND COALESCE(p.status, 'pending') NOT IN ('paid', 'received', 'cancelled', 'canceled')
    $q$ INTO v_pending_freight_payments USING p_company_id;

    EXECUTE $q$
      SELECT COALESCE(SUM(GREATEST(COALESCE(p.amount, 0) - COALESCE(p.paid_amount, 0), 0)), 0)
      FROM public.payables p
      WHERE p.company_id = $1
        AND COALESCE(p.sub_type, '') = 'commission'
        AND COALESCE(p.status, 'pending') NOT IN ('paid', 'received', 'cancelled', 'canceled')
    $q$ INTO v_commissions_to_pay USING p_company_id;
  ELSIF to_regclass('public.financial_entries') IS NOT NULL THEN
    EXECUTE $q$
      SELECT COALESCE(SUM(GREATEST(
        COALESCE(NULLIF(row_to_json(fe)->>'total_amount', '')::NUMERIC, 0)
        -
        COALESCE(NULLIF(row_to_json(fe)->>'paid_amount', '')::NUMERIC, 0)
      , 0)), 0)
      FROM public.financial_entries fe
      WHERE fe.company_id = $1
        AND COALESCE(row_to_json(fe)->>'type', '') = 'payable'
        AND COALESCE(row_to_json(fe)->>'origin_module', row_to_json(fe)->>'origin_type', '') = 'purchase_order'
        AND COALESCE(row_to_json(fe)->>'status', 'pending') NOT IN ('paid', 'received', 'cancelled', 'canceled')
    $q$ INTO v_pending_purchase_payments USING p_company_id;

    EXECUTE $q$
      SELECT COALESCE(SUM(GREATEST(
        COALESCE(NULLIF(row_to_json(fe)->>'total_amount', '')::NUMERIC, 0)
        -
        COALESCE(NULLIF(row_to_json(fe)->>'paid_amount', '')::NUMERIC, 0)
      , 0)), 0)
      FROM public.financial_entries fe
      WHERE fe.company_id = $1
        AND COALESCE(row_to_json(fe)->>'type', '') = 'payable'
        AND COALESCE(row_to_json(fe)->>'origin_module', row_to_json(fe)->>'origin_type', '') = 'freight'
        AND COALESCE(row_to_json(fe)->>'status', 'pending') NOT IN ('paid', 'received', 'cancelled', 'canceled')
    $q$ INTO v_pending_freight_payments USING p_company_id;

    EXECUTE $q$
      SELECT COALESCE(SUM(GREATEST(
        COALESCE(NULLIF(row_to_json(fe)->>'total_amount', '')::NUMERIC, 0)
        -
        COALESCE(NULLIF(row_to_json(fe)->>'paid_amount', '')::NUMERIC, 0)
      , 0)), 0)
      FROM public.financial_entries fe
      WHERE fe.company_id = $1
        AND COALESCE(row_to_json(fe)->>'type', '') = 'payable'
        AND COALESCE(row_to_json(fe)->>'origin_module', row_to_json(fe)->>'origin_type', '') = 'commission'
        AND COALESCE(row_to_json(fe)->>'status', 'pending') NOT IN ('paid', 'received', 'cancelled', 'canceled')
    $q$ INTO v_commissions_to_pay USING p_company_id;
  END IF;

  v_total_assets :=
    v_total_bank_balance +
    v_pending_sales_receipts +
    v_merchandise_in_transit_value +
    v_loans_granted +
    v_advances_given +
    v_total_fixed_assets_value +
    v_pending_asset_sales_receipts +
    v_shareholder_receivables;

  v_total_liabilities :=
    v_pending_purchase_payments +
    v_pending_freight_payments +
    v_loans_taken +
    v_commissions_to_pay +
    v_advances_taken +
    v_shareholder_payables;

  v_net_balance := v_total_assets - v_total_liabilities;

  SELECT json_build_object(
    'bankBalances', v_bank_balances,
    'totalBankBalance', v_total_bank_balance,
    'initialBalances', v_initial_balances,
    'totalInitialBalance', v_total_initial_balance,
    'totalInitialMonthBalance', v_total_initial_balance,
    'initialMonthBalances', v_initial_balances,

    'pendingSalesReceipts', v_pending_sales_receipts,
    'merchandiseInTransitValue', v_merchandise_in_transit_value,
    'loansGranted', v_loans_granted,
    'advancesGiven', v_advances_given,
    'totalFixedAssetsValue', v_total_fixed_assets_value,
    'pendingAssetSalesReceipts', v_pending_asset_sales_receipts,
    'shareholderReceivables', v_shareholder_receivables,

    'pendingPurchasePayments', v_pending_purchase_payments,
    'pendingFreightPayments', v_pending_freight_payments,
    'loansTaken', v_loans_taken,
    'commissionsToPay', v_commissions_to_pay,
    'advancesTaken', v_advances_taken,
    'shareholderPayables', v_shareholder_payables,

    'totalAssets', v_total_assets,
    'totalLiabilities', v_total_liabilities,
    'netBalance', v_net_balance
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_cashier_report(UUID) TO authenticated;
