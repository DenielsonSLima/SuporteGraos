-- Migration: expand_cashier_report_metrics
-- Description: Adds month summary metrics (purchased vs paid) and distribution details.

CREATE OR REPLACE FUNCTION public.rpc_cashier_report(p_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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

  -- NOVAS VARIÁVEIS PARA O RESUMO DO MÊS
  -- Usando DATE_TRUNC no timezone da aplicação ou UTC para evitar saltos de dia
  v_start_of_month DATE := DATE_TRUNC('month', CURRENT_DATE AT TIME ZONE 'UTC')::DATE;
  v_end_of_month DATE := (DATE_TRUNC('month', CURRENT_DATE AT TIME ZONE 'UTC') + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  v_month_purchased_total NUMERIC := 0;
  v_month_paid_total NUMERIC := 0;
  
  v_expense_distribution JSON := '{}'::json;
  v_revenue_distribution JSON := '{}'::json;

  result JSON;
BEGIN
  -- ┌─────────────────────────────────────────────┐
  -- │ SEGURANÇA: Validar company_id               │
  -- └─────────────────────────────────────────────┘
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

  -- ┌─────────────────────────────────────────────┐
  -- │ SALDOS BANCÁRIOS (accounts)                 │
  -- └─────────────────────────────────────────────┘
  IF to_regclass('public.accounts') IS NOT NULL THEN
    SELECT
      COALESCE(json_agg(json_build_object(
        'id', a.id,
        'bankName', a.account_name,
        'owner', a.owner,
        'balance', COALESCE(a.balance, 0)
      ) ORDER BY a.account_name), '[]'::json),
      COALESCE(SUM(a.balance), 0)
    INTO v_bank_balances, v_total_bank_balance
    FROM public.accounts a
    WHERE a.company_id = p_company_id
      AND COALESCE(a.is_active, true) = true;
  END IF;

  -- ┌─────────────────────────────────────────────┐
  -- │ SALDOS INICIAIS (initial_balances)          │
  -- └─────────────────────────────────────────────┘
  IF to_regclass('public.initial_balances') IS NOT NULL THEN
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
    INTO v_initial_balances, v_total_initial_balance
    FROM public.initial_balances ib
    WHERE ib.company_id = p_company_id;
  END IF;

  -- ┌─────────────────────────────────────────────┐
  -- │ RECEBÍVEIS DE VENDAS (financial_entries)    │
  -- └─────────────────────────────────────────────┘
  IF to_regclass('public.financial_entries') IS NOT NULL THEN
    SELECT COALESCE(SUM(GREATEST(
      COALESCE(fe.total_amount, 0) - COALESCE(fe.paid_amount, 0)
    , 0)), 0)
    INTO v_pending_sales_receipts
    FROM public.financial_entries fe
    WHERE fe.company_id = p_company_id
      AND fe.type = 'receivable'
      AND COALESCE(fe.origin_type, '') = 'sales_order'
      AND COALESCE(fe.status, 'open') NOT IN ('paid', 'received', 'cancelled', 'canceled');
  END IF;

  -- ┌─────────────────────────────────────────────┐
  -- │ MERCADORIA EM TRÂNSITO (ops_loadings)       │
  -- └─────────────────────────────────────────────┘
  IF to_regclass('public.ops_loadings') IS NOT NULL THEN
    SELECT COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0)
    INTO v_merchandise_in_transit_value
    FROM public.ops_loadings l
    WHERE l.company_id = p_company_id
      AND COALESCE(l.status, '') IN ('loaded', 'in_transit', 'redirected', 'waiting_unload');
  END IF;

  -- ┌─────────────────────────────────────────────┐
  -- │ EMPRÉSTIMOS (admin_expenses + financial_entries) │
  -- └─────────────────────────────────────────────┘
  -- Legacy: admin_expenses
  IF to_regclass('public.admin_expenses') IS NOT NULL THEN
    SELECT COALESCE(SUM(GREATEST(
      COALESCE(ae.original_value, 0) - COALESCE(ae.paid_value, 0) - COALESCE(ae.discount_value, 0)
    , 0)), 0)
    INTO v_loans_granted
    FROM public.admin_expenses ae
    WHERE ae.company_id = p_company_id
      AND COALESCE(ae.sub_type, '') = 'loan_granted'
      AND COALESCE(ae.status, 'pending') NOT IN ('paid', 'received', 'cancelled', 'canceled');

    SELECT COALESCE(SUM(GREATEST(
      COALESCE(ae.original_value, 0) - COALESCE(ae.paid_value, 0) - COALESCE(ae.discount_value, 0)
    , 0)), 0)
    INTO v_loans_taken
    FROM public.admin_expenses ae
    WHERE ae.company_id = p_company_id
      AND COALESCE(ae.sub_type, '') = 'loan_taken'
      AND COALESCE(ae.status, 'pending') NOT IN ('paid', 'received', 'cancelled', 'canceled');
  END IF;

  -- New System: financial_entries (origin_type = 'loan')
  IF to_regclass('public.financial_entries') IS NOT NULL THEN
    v_loans_granted := v_loans_granted + COALESCE((
      SELECT SUM(GREATEST(COALESCE(fe.total_amount, 0) - COALESCE(fe.paid_amount, 0), 0))
      FROM public.financial_entries fe
      WHERE fe.company_id = p_company_id
        AND fe.type = 'receivable'
        AND fe.origin_type = 'loan'
        AND COALESCE(fe.status, 'open') NOT IN ('paid', 'received', 'cancelled', 'canceled')
    ), 0);

    v_loans_taken := v_loans_taken + COALESCE((
      SELECT SUM(GREATEST(COALESCE(fe.total_amount, 0) - COALESCE(fe.paid_amount, 0), 0))
      FROM public.financial_entries fe
      WHERE fe.company_id = p_company_id
        AND fe.type = 'payable'
        AND fe.origin_type = 'loan'
        AND COALESCE(fe.status, 'open') NOT IN ('paid', 'received', 'cancelled', 'canceled')
    ), 0);
  END IF;

  -- ┌─────────────────────────────────────────────┐
  -- │ ADIANTAMENTOS (advances)                    │
  -- └─────────────────────────────────────────────┘
  IF to_regclass('public.advances') IS NOT NULL THEN
    SELECT COALESCE(SUM(COALESCE(a.remaining_amount, 0)), 0)
    INTO v_advances_given
    FROM public.advances a
    WHERE a.company_id = p_company_id
      AND COALESCE(a.recipient_type, '') IN ('supplier', 'shareholder')
      AND COALESCE(a.status, 'open') NOT IN ('settled', 'cancelled', 'canceled');

    SELECT COALESCE(SUM(COALESCE(a.remaining_amount, 0)), 0)
    INTO v_advances_taken
    FROM public.advances a
    WHERE a.company_id = p_company_id
      AND COALESCE(a.recipient_type, '') = 'client'
      AND COALESCE(a.status, 'open') NOT IN ('settled', 'cancelled', 'canceled');
  END IF;

  -- ┌─────────────────────────────────────────────┐
  -- │ PATRIMÔNIO - BENS ATIVOS (assets)           │
  -- └─────────────────────────────────────────────┘
  IF to_regclass('public.assets') IS NOT NULL THEN
    SELECT COALESCE(SUM(COALESCE(ast.acquisition_value, 0)), 0)
    INTO v_total_fixed_assets_value
    FROM public.assets ast
    WHERE ast.company_id = p_company_id
      AND COALESCE(ast.status, 'active') = 'active';
  END IF;

  -- ┌─────────────────────────────────────────────┐
  -- │ RECEBÍVEIS DE VENDAS DE BENS (admin_expenses)│
  -- └─────────────────────────────────────────────┘
  IF to_regclass('public.admin_expenses') IS NOT NULL THEN
    SELECT COALESCE(SUM(GREATEST(
      COALESCE(ae.original_value, 0) - COALESCE(ae.paid_value, 0) - COALESCE(ae.discount_value, 0)
    , 0)), 0)
    INTO v_pending_asset_sales_receipts
    FROM public.admin_expenses ae
    WHERE ae.company_id = p_company_id
      AND (
        COALESCE(ae.is_asset_receipt, false) = true
        OR COALESCE(ae.category, '') = 'Venda de Ativo'
        OR (COALESCE(ae.sub_type, '') = 'receipt' AND ae.asset_id IS NOT NULL)
      )
      AND COALESCE(ae.status, 'pending') NOT IN ('paid', 'received', 'cancelled', 'canceled');
  END IF;

  -- ┌─────────────────────────────────────────────┐
  -- │ SÓCIOS (shareholders)                       │
  -- └─────────────────────────────────────────────┘
  IF to_regclass('public.shareholders') IS NOT NULL THEN
    SELECT COALESCE(SUM(ABS(COALESCE(s.current_balance, 0))), 0)
    INTO v_shareholder_receivables
    FROM public.shareholders s
    WHERE s.company_id = p_company_id
      AND COALESCE(s.current_balance, 0) < 0;

    SELECT COALESCE(SUM(COALESCE(s.current_balance, 0)), 0)
    INTO v_shareholder_payables
    FROM public.shareholders s
    WHERE s.company_id = p_company_id
      AND COALESCE(s.current_balance, 0) > 0;
  END IF;

  -- ┌─────────────────────────────────────────────┐
  -- │ CONTAS A PAGAR (financial_entries payable)   │
  -- └─────────────────────────────────────────────┘
  IF to_regclass('public.financial_entries') IS NOT NULL THEN
    -- Fornecedores (purchase_order)
    SELECT COALESCE(SUM(GREATEST(
      COALESCE(fe.total_amount, 0) - COALESCE(fe.paid_amount, 0)
    , 0)), 0)
    INTO v_pending_purchase_payments
    FROM public.financial_entries fe
    WHERE fe.company_id = p_company_id
      AND fe.type = 'payable'
      AND COALESCE(fe.origin_type, '') = 'purchase_order'
      AND COALESCE(fe.status, 'open') NOT IN ('paid', 'received', 'cancelled', 'canceled');

    -- Fretes
    SELECT COALESCE(SUM(GREATEST(
      COALESCE(fe.total_amount, 0) - COALESCE(fe.paid_amount, 0)
    , 0)), 0)
    INTO v_pending_freight_payments
    FROM public.financial_entries fe
    WHERE fe.company_id = p_company_id
      AND fe.type = 'payable'
      AND COALESCE(fe.origin_type, '') = 'freight'
      AND COALESCE(fe.status, 'open') NOT IN ('paid', 'received', 'cancelled', 'canceled');

    -- Comissões
    SELECT COALESCE(SUM(GREATEST(
      COALESCE(fe.total_amount, 0) - COALESCE(fe.paid_amount, 0)
    , 0)), 0)
    INTO v_commissions_to_pay
    FROM public.financial_entries fe
    WHERE fe.company_id = p_company_id
      AND fe.type = 'payable'
      AND COALESCE(fe.origin_type, '') = 'commission'
      AND COALESCE(fe.status, 'open') NOT IN ('paid', 'received', 'cancelled', 'canceled');
  END IF;

  -- ┌─────────────────────────────────────────────┐
  -- │ NOVOS CÁLCULOS: RESUMO DO MÊS               │
  -- └─────────────────────────────────────────────┘
  -- 1. Valor Comprado no Mês (Entries do tipo Payable / purchase_order criadas este mês)
  SELECT COALESCE(SUM(fe.total_amount), 0)
  INTO v_month_purchased_total
  FROM public.financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.origin_type = 'purchase_order'
    AND fe.created_date >= v_start_of_month
    AND fe.created_date <= v_end_of_month;

  -- 2. Valor Pago no Mês (Transações de saída executadas este mês)
  SELECT COALESCE(SUM(ft.amount), 0)
  INTO v_month_paid_total
  FROM public.financial_transactions ft
  WHERE ft.company_id = p_company_id
    AND ft.type = 'debit'
    AND ft.transaction_date >= v_start_of_month
    AND ft.transaction_date <= v_end_of_month;

  -- 3. Distribuição de Despesas (Agrupado por origin_type da entry)
  SELECT json_build_object(
    'purchases', COALESCE(SUM(CASE WHEN COALESCE(fe.origin_type, 'other') = 'purchase_order' THEN ft.amount ELSE 0 END), 0),
    'freight', COALESCE(SUM(CASE WHEN COALESCE(fe.origin_type, 'other') = 'freight' THEN ft.amount ELSE 0 END), 0),
    'expenses', COALESCE(SUM(CASE WHEN COALESCE(fe.origin_type, 'other') = 'expense' THEN ft.amount ELSE 0 END), 0),
    'others', COALESCE(SUM(CASE WHEN COALESCE(fe.origin_type, 'other') NOT IN ('purchase_order', 'freight', 'expense') THEN ft.amount ELSE 0 END), 0)
  )
  INTO v_expense_distribution
  FROM public.financial_transactions ft
  LEFT JOIN public.financial_entries fe ON ft.entry_id = fe.id
  WHERE ft.company_id = p_company_id
    AND ft.type = 'debit'
    AND ft.transaction_date >= v_start_of_month
    AND ft.transaction_date <= v_end_of_month;

  -- 4. Distribuição de Receitas
  SELECT json_build_object(
    'opening_receivables', COALESCE((
      SELECT SUM(remaining_amount) 
      FROM public.financial_entries 
      WHERE company_id = p_company_id 
        AND type = 'receivable' 
        AND created_date < v_start_of_month 
        AND status NOT IN ('paid', 'received', 'cancelled', 'canceled')
    ), 0),
    'future_receivables', COALESCE((
      SELECT SUM(remaining_amount) 
      FROM public.financial_entries 
      WHERE company_id = p_company_id 
        AND type = 'receivable' 
        AND due_date > v_end_of_month 
        AND status NOT IN ('paid', 'received', 'cancelled', 'canceled')
    ), 0)
  )
  INTO v_revenue_distribution;

  -- ┌─────────────────────────────────────────────┐
  -- │ TOTAIS                                       │
  -- └─────────────────────────────────────────────┘
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

  -- ┌─────────────────────────────────────────────┐
  -- │ RESULTADO JSON                               │
  -- └─────────────────────────────────────────────┘
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
    'netBalance', v_net_balance,

    -- NOVOS CAMPOS
    'monthPurchasedTotal', v_month_purchased_total,
    'monthPaidTotal', v_month_paid_total,
    'expenseDistribution', v_expense_distribution,
    'revenueDistribution', v_revenue_distribution
  ) INTO result;

  RETURN result;
END;
$function$;
