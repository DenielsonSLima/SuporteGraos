-- ============================================================================
-- MIGRATION: 20260522203000_fix_advances_double_counting.sql
-- Objetivo: Corrigir contagem dupla de adiantamentos em views e RPCs,
--           garantindo que adiantamentos filhos (consumos) sejam ignorados.
-- ============================================================================

SET search_path = public;

-- 1. Redefinir a View v_advances_summaries
CREATE OR REPLACE VIEW public.v_advances_summaries AS
 SELECT a.company_id,
    a.recipient_id AS partner_id,
    p.name AS partner_name,
    sum(
        CASE
            WHEN (a.recipient_type = ANY (ARRAY['supplier'::text, 'shareholder'::text])) THEN a.remaining_amount
            ELSE (0)::numeric
        END) AS total_given,
    sum(
        CASE
            WHEN (a.recipient_type = 'client'::text) THEN a.remaining_amount
            ELSE (0)::numeric
        END) AS total_taken,
    sum(
        CASE
            WHEN (a.recipient_type = ANY (ARRAY['supplier'::text, 'shareholder'::text])) THEN a.remaining_amount
            ELSE (- a.remaining_amount)
        END) AS net_balance
   FROM public.advances a
   JOIN public.parceiros_parceiros p ON a.recipient_id = p.id
  WHERE a.status IN ('open', 'partially_settled')
    AND a.parent_id IS NULL -- ✅ Ignorar adiantamentos de consumo (filhos)
  GROUP BY a.company_id, a.recipient_id, p.name;


-- 2. Redefinir a RPC rpc_logistics_kpi_totals_v3
CREATE OR REPLACE FUNCTION public.rpc_logistics_kpi_totals_v3(
  p_company_id UUID,
  p_carrier_name TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_total_advances numeric;
BEGIN
  -- 1. Calcula saldo de adiantamentos globais apenas de adiantamentos principais
  SELECT COALESCE(SUM(
    CASE 
      WHEN recipient_type IN ('supplier', 'shareholder') THEN remaining_amount 
      WHEN recipient_type = 'client' THEN -remaining_amount 
      ELSE 0 
    END
  ), 0)
  INTO v_total_advances
  FROM public.advances a
  LEFT JOIN public.parceiros_parceiros p ON a.recipient_id = p.id
  WHERE a.company_id = p_company_id
  AND a.status IN ('open', 'partially_settled')
  AND a.parent_id IS NULL -- ✅ Ignorar adiantamentos filhos (consumos)
  AND (p_carrier_name IS NULL OR p_carrier_name = '' OR p.name = p_carrier_name)
  AND (p_start_date IS NULL OR a.advance_date >= p_start_date)
  AND (p_end_date IS NULL OR a.advance_date <= p_end_date);

  -- 2. Calcula métricas das cargas
  SELECT jsonb_build_object(
    'total_freight_value', COALESCE(SUM(total_freight), 0),
    'total_paid', COALESCE(SUM(paid_value), 0) + v_total_advances,
    'total_pending', COALESCE(SUM(balance_value), 0),
    'total_volume_ton', COALESCE(SUM(weight) / 1000, 0),
    'active_count', COUNT(*) FILTER (WHERE unload_weight_kg IS NULL OR unload_weight_kg = 0),
    'total_count', COUNT(*)
  )
  INTO v_result
  FROM public.v_logistics_freights
  WHERE company_id = p_company_id
  AND status <> 'canceled'
  AND (p_carrier_name IS NULL OR p_carrier_name = '' OR carrier_name = p_carrier_name)
  AND (p_start_date IS NULL OR date >= p_start_date)
  AND (p_end_date IS NULL OR date <= p_end_date)
  AND (p_search IS NULL OR p_search = '' OR (
      vehicle_plate ILIKE '%' || p_search || '%' OR 
      driver_name ILIKE '%' || p_search || '%' OR 
      carrier_name ILIKE '%' || p_search || '%'
  ));

  -- Fallback
  IF v_result IS NULL OR (v_result->>'total_count')::int = 0 THEN
     SELECT jsonb_build_object(
        'total_freight_value', 0,
        'total_paid', v_total_advances,
        'total_pending', 0,
        'total_volume_ton', 0,
        'active_count', 0,
        'total_count', 0
      ) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;


-- 3. Redefinir a RPC rpc_get_cashier_assets
CREATE OR REPLACE FUNCTION public.rpc_get_cashier_assets(
  p_company_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bank_balances JSONB := '[]'::jsonb;
  v_total_bank_balance NUMERIC := 0;
  v_total_initial_balance NUMERIC := 0;
  v_initial_balances JSONB := '[]'::jsonb;
  v_pending_sales_receipts NUMERIC := 0;
  v_merchandise_in_transit_value NUMERIC := 0;
  v_loans_granted NUMERIC := 0;
  v_advances_given NUMERIC := 0;
  v_total_fixed_assets_value NUMERIC := 0;
  v_pending_asset_sales_receipts NUMERIC := 0;
  v_shareholder_receivables NUMERIC := 0;
  v_total_assets NUMERIC := 0;
  
  v_start_of_period DATE;
BEGIN
  v_start_of_period := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE)::DATE);

  -- 1. Saldos Bancários Atuais
  SELECT 
    COALESCE(json_agg(json_build_object(
      'id', a.id,
      'bankName', a.account_name,
      'owner', '',
      'balance', COALESCE(a.balance, 0)
    )), '[]'::jsonb),
    COALESCE(SUM(COALESCE(a.balance, 0)), 0)
  INTO v_bank_balances, v_total_bank_balance
  FROM public.accounts a
  WHERE a.company_id = p_company_id AND a.is_active = true;

  -- 2. Saldos Iniciais do Período
  SELECT 
    COALESCE(json_agg(json_build_object(
      'accountId', a.id,
      'accountName', a.account_name,
      'value', COALESCE(ib.initial_balance, 0)
    )), '[]'::jsonb),
    COALESCE(SUM(COALESCE(ib.initial_balance, 0)), 0)
  INTO v_initial_balances, v_total_initial_balance
  FROM public.accounts a
  LEFT JOIN public.account_initial_balances ib ON ib.account_id = a.id AND ib.reference_date = v_start_of_period
  WHERE a.company_id = p_company_id;

  -- 3. Recebíveis de Vendas
  SELECT COALESCE(SUM(GREATEST(fe.total_amount - fe.paid_amount, 0)), 0)
  INTO v_pending_sales_receipts
  FROM public.financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'receivable'
    AND fe.origin_type = 'sales_order'
    AND fe.status NOT IN ('paid', 'received', 'cancelled', 'canceled');

  -- 4. Mercadoria em Trânsito
  IF to_regclass('public.ops_loadings') IS NOT NULL THEN
    SELECT COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0)
    INTO v_merchandise_in_transit_value
    FROM public.ops_loadings l
    WHERE l.company_id = p_company_id
      AND l.status IN ('loaded', 'in_transit', 'redirected', 'waiting_unload');
  END IF;

  -- 5. Empréstimos Concedidos
  v_loans_granted := COALESCE((
    SELECT SUM(GREATEST(fe.total_amount - fe.paid_amount, 0))
    FROM public.financial_entries fe
    WHERE fe.company_id = p_company_id
      AND fe.type = 'receivable'
      AND fe.origin_type = 'loan'
      AND fe.status NOT IN ('paid', 'received', 'cancelled', 'canceled')
  ), 0);

  IF to_regclass('public.admin_expenses') IS NOT NULL THEN
    v_loans_granted := v_loans_granted + COALESCE((
      SELECT SUM(GREATEST(COALESCE(ae.original_value, 0) - COALESCE(ae.paid_value, 0), 0))
      FROM public.admin_expenses ae
      WHERE ae.company_id = p_company_id
        AND ae.sub_type = 'loan_granted'
        AND ae.status NOT IN ('paid', 'received', 'cancelled', 'canceled')
    ), 0);
  END IF;

  -- 6. Adiantamentos Concedidos (Apenas pais)
  IF to_regclass('public.advances') IS NOT NULL THEN
    SELECT COALESCE(SUM(COALESCE(a.remaining_amount, 0)), 0)
    INTO v_advances_given
    FROM public.advances a
    WHERE a.company_id = p_company_id
      AND a.recipient_type IN ('supplier', 'shareholder')
      AND a.parent_id IS NULL -- ✅ Ignorar adiantamentos de consumo (filhos)
      AND a.status NOT IN ('settled', 'cancelled', 'canceled');
  END IF;

  -- 7. Patrimônio
  IF to_regclass('public.assets') IS NOT NULL THEN
    SELECT COALESCE(SUM(COALESCE(ast.acquisition_value, 0)), 0)
    INTO v_total_fixed_assets_value
    FROM public.assets ast
    WHERE ast.company_id = p_company_id
      AND COALESCE(ast.status, 'active') = 'active';
  END IF;

  -- 8. Recebíveis de Venda de Bens
  IF to_regclass('public.admin_expenses') IS NOT NULL THEN
    SELECT COALESCE(SUM(GREATEST(COALESCE(ae.original_value, 0) - COALESCE(ae.paid_value, 0), 0)), 0)
    INTO v_pending_asset_sales_receipts
    FROM public.admin_expenses ae
    WHERE ae.company_id = p_company_id
      AND (ae.is_asset_receipt = true OR ae.category_id IN (SELECT id FROM public.expense_categories WHERE name = 'Venda de Ativo'))
      AND ae.status NOT IN ('paid', 'received', 'cancelled', 'canceled');
  END IF;

  -- 9. Haveres de Sócios
  SELECT COALESCE(SUM(ABS(s.current_balance)), 0)
  INTO v_shareholder_receivables
  FROM public.shareholders s
  WHERE s.company_id = p_company_id
    AND s.current_balance < 0;

  v_total_assets := 
    v_total_bank_balance + 
    v_pending_sales_receipts + 
    v_merchandise_in_transit_value + 
    v_loans_granted + 
    v_advances_given + 
    v_total_fixed_assets_value + 
    v_pending_asset_sales_receipts + 
    v_shareholder_receivables;

  RETURN jsonb_build_object(
    'bankBalances', v_bank_balances,
    'totalBankBalance', v_total_bank_balance,
    'totalInitialBalance', v_total_initial_balance,
    'initialBalances', v_initial_balances,
    'pendingSalesReceipts', v_pending_sales_receipts,
    'merchandiseInTransitValue', v_merchandise_in_transit_value,
    'loansGranted', v_loans_granted,
    'advancesGiven', v_advances_given,
    'totalFixedAssetsValue', v_total_fixed_assets_value,
    'pendingAssetSalesReceipts', v_pending_asset_sales_receipts,
    'shareholderReceivables', v_shareholder_receivables,
    'totalAssets', v_total_assets
  );
END;
$$;


-- 4. Redefinir a RPC rpc_get_cashier_liabilities
CREATE OR REPLACE FUNCTION public.rpc_get_cashier_liabilities(
  p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pending_purchase_payments NUMERIC := 0;
  v_pending_freight_payments NUMERIC := 0;
  v_commissions_to_pay NUMERIC := 0;
  v_loans_taken NUMERIC := 0;
  v_advances_taken NUMERIC := 0;
  v_shareholder_payables NUMERIC := 0;
  v_total_liabilities NUMERIC := 0;
BEGIN
  -- 1. Contas a Pagar (Grãos)
  SELECT COALESCE(SUM(GREATEST(fe.total_amount - fe.paid_amount, 0)), 0)
  INTO v_pending_purchase_payments
  FROM public.financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.origin_type = 'purchase_order'
    AND fe.status NOT IN ('paid', 'received', 'cancelled', 'canceled');

  -- 2. Fretes a Pagar
  SELECT COALESCE(SUM(GREATEST(fe.total_amount - fe.paid_amount, 0)), 0)
  INTO v_pending_freight_payments
  FROM public.financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.origin_type = 'freight'
    AND fe.status NOT IN ('paid', 'received', 'cancelled', 'canceled');

  -- 3. Comissões a Pagar
  SELECT COALESCE(SUM(GREATEST(fe.total_amount - fe.paid_amount, 0)), 0)
  INTO v_commissions_to_pay
  FROM public.financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.origin_type = 'commission'
    AND fe.status NOT IN ('paid', 'received', 'cancelled', 'canceled');

  -- 4. Empréstimos Tomados
  SELECT COALESCE(SUM(remaining_amount), 0)
  INTO v_loans_taken
  FROM public.loans
  WHERE company_id = p_company_id
    AND status NOT IN ('paid', 'cancelled', 'canceled');

  v_loans_taken := v_loans_taken + COALESCE((
    SELECT SUM(GREATEST(fe.total_amount - fe.paid_amount, 0))
    FROM public.financial_entries fe
    WHERE fe.company_id = p_company_id
      AND fe.type = 'payable'
      AND fe.origin_type = 'loan'
      AND fe.status NOT IN ('paid', 'received', 'cancelled', 'canceled')
  ), 0);

  IF to_regclass('public.admin_expenses') IS NOT NULL THEN
    v_loans_taken := v_loans_taken + COALESCE((
      SELECT SUM(GREATEST(COALESCE(ae.original_value, 0) - COALESCE(ae.paid_value, 0), 0))
      FROM public.admin_expenses ae
      WHERE ae.company_id = p_company_id
        AND ae.sub_type = 'loan_taken'
        AND ae.status NOT IN ('paid', 'received', 'cancelled', 'canceled')
    ), 0);
  END IF;

  -- 5. Adiantamentos de Clientes (Apenas pais)
  IF to_regclass('public.advances') IS NOT NULL THEN
    SELECT COALESCE(SUM(COALESCE(a.remaining_amount, 0)), 0)
    INTO v_advances_taken
    FROM public.advances a
    WHERE a.company_id = p_company_id
      AND a.recipient_type = 'client'
      AND a.parent_id IS NULL -- ✅ Ignorar adiantamentos de consumo (filhos)
      AND a.status NOT IN ('settled', 'cancelled', 'canceled');
  END IF;

  -- 6. Obrigações com Sócios
  SELECT COALESCE(SUM(s.current_balance), 0)
  INTO v_shareholder_payables
  FROM public.shareholders s
  WHERE s.company_id = p_company_id
    AND s.current_balance > 0;

  v_total_liabilities := 
    v_pending_purchase_payments + 
    v_pending_freight_payments + 
    v_commissions_to_pay + 
    v_loans_taken + 
    v_advances_taken + 
    v_shareholder_payables;

  RETURN jsonb_build_object(
    'pendingPurchasePayments', v_pending_purchase_payments,
    'pendingFreightPayments', v_pending_freight_payments,
    'commissionsToPay', v_commissions_to_pay,
    'loansTaken', v_loans_taken,
    'advancesTaken', v_advances_taken,
    'shareholderPayables', v_shareholder_payables,
    'totalLiabilities', v_total_liabilities
  );
END;
$$;


-- 5. Redefinir a RPC rpc_dashboard_data
CREATE OR REPLACE FUNCTION public.rpc_dashboard_data(p_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_company UUID;
  v_total_bank            NUMERIC := 0;
  v_pending_receivables   NUMERIC := 0;
  v_pending_payables      NUMERIC := 0;
  v_total_assets          NUMERIC := 0;
  v_total_liabilities     NUMERIC := 0;
  v_merchandise_in_transit NUMERIC := 0;
  v_net_worth             NUMERIC := 0;
  v_loans_granted         NUMERIC := 0;
  v_advances_given        NUMERIC := 0;
  v_total_fixed_assets    NUMERIC := 0;
  v_shareholder_receivables NUMERIC := 0;
  v_loans_taken           NUMERIC := 0;
  v_commissions_to_pay    NUMERIC := 0;
  v_advances_taken        NUMERIC := 0;
  v_shareholder_payables  NUMERIC := 0;
  v_orders_last_30        INTEGER := 0;
  v_volume_sc             NUMERIC := 0;
  v_volume_ton            NUMERIC := 0;
  v_avg_purchase_price    NUMERIC := 0;
  v_avg_sales_price       NUMERIC := 0;
  v_avg_freight_ton       NUMERIC := 0;
  v_avg_cost_sc           NUMERIC := 0;
  v_avg_profit_sc         NUMERIC := 0;
  v_loading_source        TEXT;
  v_growth_percent        NUMERIC := 0;
  v_history               JSON;
  v_chart                 JSON;
  result JSON;
BEGIN
  SELECT au.company_id INTO v_caller_company
  FROM app_users au
  WHERE au.auth_user_id = (SELECT auth.uid())
  LIMIT 1;

  IF v_caller_company IS NULL OR v_caller_company <> p_company_id THEN
    RAISE EXCEPTION 'Access denied: caller does not belong to company %', p_company_id;
  END IF;

  IF to_regclass('public.logistics_loadings') IS NOT NULL THEN
    v_loading_source := 'public.logistics_loadings';
  ELSIF to_regclass('public.ops_loadings') IS NOT NULL THEN
    v_loading_source := 'public.ops_loadings';
  ELSE
    v_loading_source := NULL;
  END IF;

  SELECT COALESCE(SUM(a.balance), 0) INTO v_total_bank
  FROM accounts a
  WHERE a.company_id = p_company_id AND a.is_active = true;

  SELECT COALESCE(SUM(GREATEST(COALESCE(fe.total_amount, 0) - COALESCE(fe.paid_amount, 0), 0)), 0)
    INTO v_pending_receivables
  FROM financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'receivable'
    AND COALESCE(fe.origin_type, '') = 'sales_order'
    AND fe.status NOT IN ('paid', 'received', 'cancelled', 'canceled');

  IF v_loading_source IS NOT NULL THEN
    EXECUTE format($q$
      SELECT COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0)
      FROM %s l
      WHERE l.company_id = $1
        AND COALESCE(l.status, '') IN ('loaded', 'in_transit', 'redirected', 'waiting_unload')
    $q$, v_loading_source) INTO v_merchandise_in_transit USING p_company_id;
  END IF;

  SELECT COALESCE(SUM(COALESCE(acquisition_value, 0)), 0) INTO v_total_fixed_assets
  FROM assets
  WHERE company_id = p_company_id AND COALESCE(status, 'active') = 'active';

  SELECT 
    COALESCE(SUM(CASE WHEN sub_type = 'loan_granted' THEN (COALESCE(original_value, 0) - COALESCE(paid_value, 0) - COALESCE(discount_value, 0)) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN sub_type = 'loan_taken' THEN (COALESCE(original_value, 0) - COALESCE(paid_value, 0) - COALESCE(discount_value, 0)) ELSE 0 END), 0)
    INTO v_loans_granted, v_loans_taken
  FROM admin_expenses
  WHERE company_id = p_company_id
    AND sub_type IN ('loan_granted', 'loan_taken')
    AND status NOT IN ('paid', 'received', 'cancelled', 'canceled');

  v_loans_granted := v_loans_granted + COALESCE((
    SELECT SUM(GREATEST(COALESCE(fe.total_amount, 0) - COALESCE(fe.paid_amount, 0), 0))
    FROM financial_entries fe
    WHERE fe.company_id = p_company_id
      AND fe.type = 'receivable'
      AND fe.origin_type = 'loan'
      AND COALESCE(fe.status, 'open') NOT IN ('paid', 'received', 'cancelled', 'canceled')
  ), 0);

  v_loans_taken := v_loans_taken + COALESCE((
    SELECT SUM(GREATEST(COALESCE(fe.total_amount, 0) - COALESCE(fe.paid_amount, 0), 0))
    FROM financial_entries fe
    WHERE fe.company_id = p_company_id
      AND fe.type = 'payable'
      AND fe.origin_type = 'loan'
      AND COALESCE(fe.status, 'open') NOT IN ('paid', 'received', 'cancelled', 'canceled')
  ), 0);

  -- Adiantamentos (Apenas pais)
  SELECT 
    COALESCE(SUM(CASE WHEN recipient_type IN ('supplier', 'shareholder') THEN remaining_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN recipient_type = 'client' THEN remaining_amount ELSE 0 END), 0)
    INTO v_advances_given, v_advances_taken
  FROM advances
  WHERE company_id = p_company_id
    AND parent_id IS NULL -- ✅ Ignorar adiantamentos de consumo (filhos)
    AND status NOT IN ('settled', 'cancelled', 'canceled');

  SELECT 
    COALESCE(SUM(CASE WHEN current_balance < 0 THEN ABS(current_balance) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END), 0)
    INTO v_shareholder_receivables, v_shareholder_payables
  FROM shareholders
  WHERE company_id = p_company_id;

  SELECT 
    COALESCE(SUM(CASE WHEN origin_type IN ('purchase_order', 'freight') THEN (COALESCE(fe.total_amount, 0) - COALESCE(fe.paid_amount, 0)) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN origin_type = 'commission' THEN (COALESCE(fe.total_amount, 0) - COALESCE(fe.paid_amount, 0)) ELSE 0 END), 0)
    INTO v_pending_payables, v_commissions_to_pay
  FROM financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.status NOT IN ('paid', 'received', 'cancelled', 'canceled');

  v_total_assets := v_total_bank + v_pending_receivables + v_merchandise_in_transit + v_total_fixed_assets + v_loans_granted + v_advances_given + v_shareholder_receivables;
  v_total_liabilities := v_pending_payables + v_loans_taken + v_commissions_to_pay + v_advances_taken + v_shareholder_payables;
  v_net_worth := v_total_assets - v_total_liabilities;

  SELECT COALESCE(purchase_count, 0) + COALESCE(sales_count, 0) INTO v_orders_last_30
  FROM (
    SELECT
      (SELECT COUNT(*)::int FROM ops_purchase_orders WHERE company_id = p_company_id AND order_date >= CURRENT_DATE - 30) AS purchase_count,
      (SELECT COUNT(*)::int FROM ops_sales_orders WHERE company_id = p_company_id AND order_date >= CURRENT_DATE - 30) AS sales_count
  ) counts;

  SELECT
    COALESCE(SUM(l.weight_kg) / 60, 0),
    COALESCE(SUM(l.weight_kg) / 1000, 0),
    CASE WHEN SUM(l.weight_kg) > 0 THEN ROUND(SUM(l.total_purchase_value) / (SUM(l.weight_kg) / 60), 2) ELSE 0 END,
    CASE WHEN SUM(l.weight_kg) > 0 THEN ROUND(SUM(l.total_sales_value) / (SUM(l.weight_kg) / 60), 2) ELSE 0 END,
    CASE WHEN SUM(l.weight_kg) > 0 THEN ROUND(SUM(l.total_freight_value) / (SUM(l.weight_kg) / 1000), 2) ELSE 0 END,
    CASE WHEN SUM(l.weight_kg) > 0 THEN ROUND((SUM(l.total_purchase_value) + SUM(l.total_freight_value)) / (SUM(l.weight_kg) / 60), 2) ELSE 0 END,
    CASE WHEN SUM(l.weight_kg) > 0 THEN ROUND((SUM(l.total_sales_value) - SUM(l.total_purchase_value) - SUM(l.total_freight_value)) / (SUM(l.weight_kg) / 60), 2) ELSE 0 END
  INTO v_volume_sc, v_volume_ton, v_avg_purchase_price, v_avg_sales_price, v_avg_freight_ton, v_avg_cost_sc, v_avg_profit_sc
  FROM ops_loadings l
  WHERE l.company_id = p_company_id AND l.status NOT IN ('canceled', 'cancelled') AND l.loading_date >= CURRENT_DATE - 30;

  IF v_loading_source IS NOT NULL THEN
    EXECUTE format($dyn$
      WITH months AS (SELECT generate_series(0, 5) AS i),
      month_grid AS (SELECT i, date_trunc('month', (CURRENT_DATE - (i || ' months')::interval))::date AS month_start, (date_trunc('month', (CURRENT_DATE - (i || ' months')::interval)) + interval '1 month - 1 day')::date AS month_end, to_char(date_trunc('month', (CURRENT_DATE - (i || ' months')::interval)), 'Mon') AS month_name FROM months),
      bank_history AS (SELECT mg.i, COALESCE(SUM(COALESCE((SELECT SUM(ib.value) FROM initial_balances ib WHERE ib.company_id = $1 AND ib.date <= mg.month_end), 0) + COALESCE((SELECT SUM(CASE WHEN lower(ft.type) IN ('in', 'credit') THEN ft.amount WHEN lower(ft.type) IN ('out', 'debit') THEN -ft.amount ELSE 0 END) FROM financial_transactions ft WHERE ft.company_id = $1 AND ft.transaction_date <= mg.month_end), 0)), 0) AS bank_assets FROM month_grid mg GROUP BY mg.i),
      assets_history AS (SELECT mg.i, COALESCE((SELECT SUM(COALESCE(a.acquisition_value, 0)) FROM assets a WHERE a.company_id = $1 AND a.acquisition_date <= mg.month_end AND (a.status = 'active' OR a.write_off_date > mg.month_end)), 0) AS fixed_assets FROM month_grid mg),
      receivables_history AS (SELECT mg.i, COALESCE((SELECT SUM(fe.total_amount) FROM financial_entries fe WHERE fe.company_id = $1 AND fe.type = 'receivable' AND COALESCE(fe.status, 'open') NOT IN ('canceled', 'cancelled') AND fe.created_date <= mg.month_end), 0) - COALESCE((SELECT SUM(ft.amount) FROM financial_transactions ft JOIN financial_entries fe ON fe.id = ft.entry_id WHERE fe.company_id = $1 AND fe.type = 'receivable' AND ft.transaction_date <= mg.month_end), 0) AS pending_receivables FROM month_grid mg),
      payables_history AS (SELECT mg.i, COALESCE((SELECT SUM(fe.total_amount) FROM financial_entries fe WHERE fe.company_id = $1 AND fe.type = 'payable' AND COALESCE(fe.status, 'open') NOT IN ('canceled', 'cancelled') AND fe.created_date <= mg.month_end), 0) - COALESCE((SELECT SUM(ft.amount) FROM financial_transactions ft JOIN financial_entries fe ON fe.id = ft.entry_id WHERE fe.company_id = $1 AND fe.type = 'payable' AND ft.transaction_date <= mg.month_end), 0) AS pending_payables FROM month_grid mg),
      transit_history AS (SELECT mg.i, COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0) AS transit_value FROM month_grid mg LEFT JOIN %s l ON l.company_id = $1 AND COALESCE(l.status, '') IN ('loaded', 'in_transit', 'redirected', 'waiting_unload') AND l.loading_date <= mg.month_end GROUP BY mg.i),
      hist AS (SELECT mg.i, mg.month_name, (bh.bank_assets + rh.pending_receivables + th.transit_value + ah.fixed_assets) AS assets, GREATEST(ph.pending_payables, 0) AS liabilities, (bh.bank_assets + rh.pending_receivables + th.transit_value + ah.fixed_assets - GREATEST(ph.pending_payables, 0)) AS net_worth FROM month_grid mg JOIN bank_history bh ON bh.i = mg.i JOIN receivables_history rh ON rh.i = mg.i JOIN payables_history ph ON ph.i = mg.i JOIN transit_history th ON th.i = mg.i JOIN assets_history ah ON ah.i = mg.i),
      hist_with_change AS (SELECT i, month_name, assets, liabilities, net_worth, COALESCE(CASE WHEN LAG(net_worth) OVER (ORDER BY i DESC) = 0 THEN 0 ELSE ((net_worth - LAG(net_worth) OVER (ORDER BY i DESC)) / ABS(LAG(net_worth) OVER (ORDER BY i DESC))) * 100 END, 0) AS monthly_change FROM hist)
      SELECT json_agg(json_build_object('name', month_name, 'netWorth', net_worth, 'assets', assets, 'liabilities', liabilities, 'monthlyChange', monthly_change) ORDER BY i DESC)
      FROM hist_with_change
    $dyn$, v_loading_source) INTO v_history USING p_company_id;
  ELSE
    SELECT '[]'::json INTO v_history;
  END IF;

  WITH hist_values AS (SELECT (elem->>'netWorth')::NUMERIC AS net_worth, ROW_NUMBER() OVER () AS rn FROM json_array_elements(COALESCE(v_history, '[]'::json)) elem),
  first_nonzero AS (SELECT net_worth FROM hist_values WHERE net_worth <> 0 ORDER BY rn ASC LIMIT 1),
  last_value AS (SELECT net_worth FROM hist_values ORDER BY rn DESC LIMIT 1)
  SELECT COALESCE(CASE WHEN fn.net_worth IS NULL OR fn.net_worth = 0 THEN 0 ELSE ROUND(((lv.net_worth - fn.net_worth) / ABS(fn.net_worth)) * 100, 1) END, 0)
  INTO v_growth_percent FROM first_nonzero fn, last_value lv;

  WITH month_grid AS (SELECT i, date_trunc('month', (CURRENT_DATE - (i || ' months')::interval))::date AS month_start, to_char(date_trunc('month', (CURRENT_DATE - (i || ' months')::interval)), 'Mon') AS month_name FROM (SELECT generate_series(0, 2) AS i) m),
  tx AS (SELECT date_trunc('month', ft.transaction_date)::date AS month_start, SUM(CASE WHEN lower(ft.type) IN ('in', 'credit') THEN ft.amount ELSE 0 END) AS revenue, SUM(CASE WHEN lower(ft.type) IN ('out', 'debit') THEN ft.amount ELSE 0 END) AS expense FROM financial_transactions ft WHERE ft.company_id = p_company_id AND ft.transaction_date >= date_trunc('month', CURRENT_DATE - interval '2 months') GROUP BY 1)
  SELECT json_agg(json_build_object('name', month_name, 'revenue', COALESCE(tx.revenue, 0), 'expense', COALESCE(tx.expense, 0)) ORDER BY i DESC)
  INTO v_chart FROM month_grid mg LEFT JOIN tx ON tx.month_start = mg.month_start;

  result := json_build_object(
    'operational', json_build_object('ordersLast30Days', v_orders_last_30, 'volumeSc', v_volume_sc, 'volumeTon', v_volume_ton, 'avgPurchasePrice', v_avg_purchase_price, 'avgSalesPrice', v_avg_sales_price, 'avgFreightPriceTon', v_avg_freight_ton, 'avgCostPerSc', v_avg_cost_sc, 'avgProfitPerSc', v_avg_profit_sc),
    'financialPending', json_build_object('receivables', '[]'::json, 'tradePayables', '[]'::json, 'expenses', '[]'::json),
    'financial', json_build_object('totalBankBalance', v_total_bank, 'totalLiabilities', v_total_liabilities, 'pendingSalesReceipts', v_pending_receivables, 'merchandiseInTransitValue', v_merchandise_in_transit, 'totalAssets', v_total_assets, 'netWorth', v_net_worth),
    'chart', COALESCE(v_chart, '[]'::json),
    'netWorth', json_build_object('history', COALESCE(v_history, '[]'::json), 'growthPercent', v_growth_percent)
  );

  RETURN result;
END;
$$;
