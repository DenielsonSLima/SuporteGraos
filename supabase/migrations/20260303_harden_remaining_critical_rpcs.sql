-- ============================================================================
-- Migration: Harden remaining critical RPCs (auth + tenant validation)
-- Data: 2026-03-03
-- ============================================================================
-- CORRIGE:
--   1) rpc_performance_report: valida auth.uid() pertence ao p_company_id
--   2) rpc_set_initial_balance: valida auth.uid() pertence à empresa da conta
--   3) rpc_remove_initial_balance: valida auth.uid() pertence à empresa do saldo
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 1) Hardening: rpc_performance_report
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.rpc_performance_report(p_company_id uuid, p_months_back integer DEFAULT NULL::integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_caller_company_id UUID;
  v_months      INTEGER := COALESCE(NULLIF(p_months_back, 0), 120);
  v_date_from   DATE    := date_trunc('month', CURRENT_DATE - ((v_months - 1) || ' months')::interval)::date;

  -- Agregados globais
  v_total_revenue        NUMERIC := 0;
  v_total_purchase_cost  NUMERIC := 0;
  v_total_freight_cost   NUMERIC := 0;
  v_total_admin_expenses NUMERIC := 0;
  v_total_debits         NUMERIC := 0;
  v_balance              NUMERIC := 0;

  -- Volumes
  v_total_weight_kg      NUMERIC := 0;
  v_total_weight_sc      NUMERIC := 0;
  v_total_weight_ton     NUMERIC := 0;

  -- Médias
  v_avg_purchase_price   NUMERIC := 0;
  v_avg_sales_price      NUMERIC := 0;
  v_avg_freight_ton      NUMERIC := 0;
  v_avg_total_cost_sc    NUMERIC := 0;
  v_avg_freight_cost_sc  NUMERIC := 0;
  v_avg_pure_op_cost_sc  NUMERIC := 0;
  v_avg_profit_per_sc    NUMERIC := 0;
  v_global_margin        NUMERIC := 0;
  v_avg_other_monthly    NUMERIC := 0;
  v_total_redirect       NUMERIC := 0;

  -- JSON arrays
  v_monthly_history      JSON;
  v_price_trend          JSON;
  v_harvests             JSON;
  v_expense_breakdown    JSON;
  v_top_profit           JSON;
  v_top_loss             JSON;
  v_best_months          JSON;
  v_worst_months         JSON;

  result JSON;
BEGIN
  -- Guard: usuário autenticado precisa pertencer à empresa solicitada
  SELECT au.company_id
    INTO v_caller_company_id
  FROM public.app_users au
  WHERE au.auth_user_id = (SELECT auth.uid())
    AND au.active = true
  LIMIT 1;

  IF v_caller_company_id IS NULL OR v_caller_company_id <> p_company_id THEN
    RAISE EXCEPTION 'Access denied: caller does not belong to company %', p_company_id;
  END IF;

  -- ========================================================================
  -- 1. AGREGADOS GLOBAIS DE CARREGAMENTOS
  -- ========================================================================
  SELECT
    COALESCE(SUM(l.total_sales_value), 0),
    COALESCE(SUM(l.total_purchase_value), 0),
    COALESCE(SUM(l.total_freight_value), 0),
    COALESCE(SUM(l.weight_kg), 0),
    COALESCE(SUM(CASE WHEN (l.metadata->>'isRedirected')::boolean = true
                      THEN COALESCE((l.metadata->>'redirectDisplacementValue')::numeric, 0)
                      ELSE 0 END), 0)
  INTO v_total_revenue, v_total_purchase_cost, v_total_freight_cost,
       v_total_weight_kg, v_total_redirect
  FROM ops_loadings l
  WHERE l.company_id = p_company_id
    AND l.status NOT IN ('canceled', 'cancelled')
    AND l.loading_date >= v_date_from;

  v_total_weight_sc  := CASE WHEN v_total_weight_kg > 0 THEN v_total_weight_kg / 60 ELSE 0 END;
  v_total_weight_ton := CASE WHEN v_total_weight_kg > 0 THEN v_total_weight_kg / 1000 ELSE 0 END;

  -- ========================================================================
  -- 2. DESPESAS ADMINISTRATIVAS
  -- ========================================================================
  SELECT COALESCE(SUM(ae.amount), 0)
  INTO v_total_admin_expenses
  FROM admin_expenses ae
  WHERE ae.company_id = p_company_id
    AND ae.status != 'cancelled'
    AND COALESCE(ae.expense_date, ae.due_date, CURRENT_DATE) >= v_date_from;

  -- ========================================================================
  -- 3. TOTAIS DERIVADOS
  -- ========================================================================
  v_total_debits := v_total_purchase_cost + v_total_freight_cost + v_total_admin_expenses;
  v_balance      := v_total_revenue - v_total_debits;

  -- Médias
  IF v_total_weight_sc > 0 THEN
    v_avg_purchase_price  := v_total_purchase_cost / v_total_weight_sc;
    v_avg_sales_price     := v_total_revenue / v_total_weight_sc;
    v_avg_freight_cost_sc := v_total_freight_cost / v_total_weight_sc;
    v_avg_total_cost_sc   := v_total_debits / v_total_weight_sc;
    v_avg_pure_op_cost_sc := v_total_admin_expenses / v_total_weight_sc;
    v_avg_profit_per_sc   := v_balance / v_total_weight_sc;
  END IF;

  IF v_total_weight_ton > 0 THEN
    v_avg_freight_ton := v_total_freight_cost / v_total_weight_ton;
  END IF;

  IF v_total_revenue > 0 THEN
    v_global_margin := (v_balance / v_total_revenue) * 100;
  END IF;

  v_avg_other_monthly := CASE WHEN v_months > 0 THEN v_total_admin_expenses / v_months ELSE 0 END;

  -- ========================================================================
  -- 4. HISTÓRICO MENSAL
  -- ========================================================================
  WITH months AS (
    SELECT generate_series(0, v_months - 1) AS i
  ),
  month_grid AS (
    SELECT
      i,
      date_trunc('month', (CURRENT_DATE - (i || ' months')::interval))::date AS month_start,
      to_char(date_trunc('month', (CURRENT_DATE - (i || ' months')::interval)), 'Mon') AS month_name,
      to_char(date_trunc('month', (CURRENT_DATE - (i || ' months')::interval)), 'YYYY-MM') AS full_date
    FROM months
  ),
  loading_monthly AS (
    SELECT
      date_trunc('month', l.loading_date)::date AS month_start,
      COALESCE(SUM(l.total_sales_value), 0) AS revenue,
      COALESCE(SUM(l.total_purchase_value), 0) AS purchase_cost,
      COALESCE(SUM(l.total_freight_value), 0) AS freight_cost,
      COALESCE(SUM(l.weight_kg), 0) AS total_kg
    FROM ops_loadings l
    WHERE l.company_id = p_company_id
      AND l.status NOT IN ('canceled', 'cancelled')
      AND l.loading_date >= v_date_from
    GROUP BY 1
  ),
  expense_monthly AS (
    SELECT
      date_trunc('month', COALESCE(ae.expense_date, ae.due_date, CURRENT_DATE))::date AS month_start,
      COALESCE(SUM(ae.amount), 0) AS other_expenses
    FROM admin_expenses ae
    WHERE ae.company_id = p_company_id
      AND ae.status != 'cancelled'
      AND COALESCE(ae.expense_date, ae.due_date, CURRENT_DATE) >= v_date_from
    GROUP BY 1
  )
  SELECT json_agg(
    json_build_object(
      'name', mg.month_name,
      'fullDate', mg.full_date,
      'revenue', COALESCE(lm.revenue, 0),
      'purchaseCost', COALESCE(lm.purchase_cost, 0),
      'freightCost', COALESCE(lm.freight_cost, 0),
      'otherExpenses', COALESCE(em.other_expenses, 0),
      'netResult', COALESCE(lm.revenue, 0) - COALESCE(lm.purchase_cost, 0)
                    - COALESCE(lm.freight_cost, 0) - COALESCE(em.other_expenses, 0),
      'totalQuantitySc', CASE WHEN COALESCE(lm.total_kg, 0) > 0
                              THEN ROUND(lm.total_kg / 60, 2) ELSE 0 END,
      'avgPurchaseCostSc', CASE WHEN COALESCE(lm.total_kg, 0) > 0
                                THEN ROUND(lm.purchase_cost / (lm.total_kg / 60), 2) ELSE 0 END,
      'avgFreightCostSc', CASE WHEN COALESCE(lm.total_kg, 0) > 0
                               THEN ROUND(lm.freight_cost / (lm.total_kg / 60), 2) ELSE 0 END,
      'avgOtherCostSc', CASE WHEN COALESCE(lm.total_kg, 0) > 0
                             THEN ROUND(COALESCE(em.other_expenses, 0) / (lm.total_kg / 60), 2) ELSE 0 END,
      'avgTotalCostSc', CASE WHEN COALESCE(lm.total_kg, 0) > 0
                             THEN ROUND((COALESCE(lm.purchase_cost, 0) + COALESCE(lm.freight_cost, 0) + COALESCE(em.other_expenses, 0))
                                        / (lm.total_kg / 60), 2) ELSE 0 END
    ) ORDER BY mg.i DESC
  )
  INTO v_monthly_history
  FROM month_grid mg
  LEFT JOIN loading_monthly lm ON lm.month_start = mg.month_start
  LEFT JOIN expense_monthly em ON em.month_start = mg.month_start;

  -- ========================================================================
  -- 5. PRICE TREND (preço médio de compra e venda por mês)
  -- ========================================================================
  WITH months AS (
    SELECT generate_series(0, v_months - 1) AS i
  ),
  month_grid AS (
    SELECT
      i,
      date_trunc('month', (CURRENT_DATE - (i || ' months')::interval))::date AS month_start,
      to_char(date_trunc('month', (CURRENT_DATE - (i || ' months')::interval)), 'Mon') AS month_name
    FROM months
  ),
  price_monthly AS (
    SELECT
      date_trunc('month', l.loading_date)::date AS month_start,
      CASE WHEN SUM(l.weight_kg) > 0
           THEN ROUND(SUM(l.total_purchase_value) / (SUM(l.weight_kg) / 60), 2)
           ELSE 0 END AS avg_purchase,
      CASE WHEN SUM(l.weight_kg) > 0
           THEN ROUND(SUM(l.total_sales_value) / (SUM(l.weight_kg) / 60), 2)
           ELSE 0 END AS avg_sales
    FROM ops_loadings l
    WHERE l.company_id = p_company_id
      AND l.status NOT IN ('canceled', 'cancelled')
      AND l.loading_date >= v_date_from
    GROUP BY 1
  )
  SELECT json_agg(
    json_build_object(
      'name', mg.month_name,
      'avgPurchasePrice', COALESCE(pm.avg_purchase, 0),
      'avgSalesPrice', COALESCE(pm.avg_sales, 0)
    ) ORDER BY mg.i DESC
  )
  INTO v_price_trend
  FROM month_grid mg
  LEFT JOIN price_monthly pm ON pm.month_start = mg.month_start;

  -- ========================================================================
  -- 6. HARVEST BREAKDOWN (por safra + UF)
  -- ========================================================================
  SELECT COALESCE(json_agg(row_to_json(h)), '[]'::json)
  INTO v_harvests
  FROM (
    SELECT
      COALESCE(po.metadata->>'loadingState', 'N/I') AS uf,
      ROUND(SUM(l.weight_kg) / 1000, 2) AS "volumeTon",
      ROUND(SUM(l.weight_kg) / 60, 2) AS "volumeSc",
      CASE WHEN SUM(l.weight_kg) > 0
           THEN ROUND(SUM(l.total_purchase_value) / (SUM(l.weight_kg) / 60), 2) ELSE 0 END AS "avgPurchasePrice",
      CASE WHEN SUM(l.weight_kg) > 0
           THEN ROUND(SUM(l.total_sales_value) / (SUM(l.weight_kg) / 60), 2) ELSE 0 END AS "avgSalesPrice",
      CASE WHEN SUM(l.weight_kg) > 0
           THEN ROUND(SUM(l.total_freight_value) / (SUM(l.weight_kg) / 1000), 2) ELSE 0 END AS "avgFreightPrice",
      ROUND(SUM(l.total_purchase_value), 2) AS "totalPurchase",
      ROUND(SUM(l.total_sales_value), 2) AS "totalSales",
      ROUND(SUM(l.total_freight_value), 2) AS "totalFreight"
    FROM ops_loadings l
    LEFT JOIN ops_purchase_orders po ON po.id = l.purchase_order_id
    WHERE l.company_id = p_company_id
      AND l.status NOT IN ('canceled', 'cancelled')
      AND l.loading_date >= v_date_from
    GROUP BY COALESCE(po.metadata->>'loadingState', 'N/I')
    ORDER BY SUM(l.weight_kg) DESC
  ) h;

  -- ========================================================================
  -- 7. EXPENSE BREAKDOWN (despesas por tipo)
  -- ========================================================================
  WITH expense_cats AS (
    SELECT
      COALESCE(ec.name, 'Outros') AS cat_name,
      COALESCE(ec.type, 'variable') AS cat_type,
      SUM(ae.amount) AS total
    FROM admin_expenses ae
    LEFT JOIN expense_categories ec ON ec.id = ae.category_id
    WHERE ae.company_id = p_company_id
      AND ae.status != 'cancelled'
      AND COALESCE(ae.expense_date, ae.due_date, CURRENT_DATE) >= v_date_from
    GROUP BY ec.name, ec.type
  ),
  grouped AS (
    SELECT
      CASE
        WHEN cat_type = 'fixed' THEN 'Despesas Fixas'
        WHEN cat_type = 'variable' THEN 'Despesas Variáveis'
        ELSE 'Custos Administrativos'
      END AS label,
      CASE
        WHEN cat_type = 'fixed' THEN 'fixed'
        WHEN cat_type = 'variable' THEN 'variable'
        ELSE 'administrative'
      END AS type_key,
      json_agg(json_build_object(
        'name', cat_name,
        'value', total,
        'percentage', CASE WHEN v_total_admin_expenses > 0
                          THEN ROUND((total / v_total_admin_expenses) * 100, 1)
                          ELSE 0 END
      )) AS items,
      SUM(total) AS group_total
    FROM expense_cats
    GROUP BY cat_type
  )
  SELECT COALESCE(json_agg(json_build_object(
    'label', g.label,
    'total', g.group_total,
    'type', g.type_key,
    'items', g.items
  )), json_build_array(
    json_build_object('label', 'Despesas Fixas', 'total', 0, 'type', 'fixed', 'items', '[]'::json),
    json_build_object('label', 'Despesas Variáveis', 'total', 0, 'type', 'variable', 'items', '[]'::json),
    json_build_object('label', 'Custos Administrativos', 'total', 0, 'type', 'administrative', 'items', '[]'::json)
  ))
  INTO v_expense_breakdown
  FROM grouped g;

  -- ========================================================================
  -- 8. TOP PROFIT / LOSS ORDERS (por carregamento, receita - custo)
  -- ========================================================================
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO v_top_profit
  FROM (
    SELECT
      l.id::text AS id,
      COALESCE(po.number, '') AS "orderNumber",
      COALESCE(po.partner_name, l.metadata->>'supplierName', '') AS "partnerName",
      ROUND(l.total_sales_value - l.total_purchase_value - l.total_freight_value, 2) AS profit,
      CASE WHEN l.total_sales_value > 0
           THEN ROUND(((l.total_sales_value - l.total_purchase_value - l.total_freight_value) / l.total_sales_value) * 100, 1)
           ELSE 0 END AS margin
    FROM ops_loadings l
    LEFT JOIN ops_purchase_orders po ON po.id = l.purchase_order_id
    WHERE l.company_id = p_company_id
      AND l.status NOT IN ('canceled', 'cancelled')
      AND l.loading_date >= v_date_from
      AND l.total_sales_value > 0
    ORDER BY (l.total_sales_value - l.total_purchase_value - l.total_freight_value) DESC
    LIMIT 5
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO v_top_loss
  FROM (
    SELECT
      l.id::text AS id,
      COALESCE(po.number, '') AS "orderNumber",
      COALESCE(po.partner_name, l.metadata->>'supplierName', '') AS "partnerName",
      ROUND(l.total_sales_value - l.total_purchase_value - l.total_freight_value, 2) AS profit,
      CASE WHEN l.total_sales_value > 0
           THEN ROUND(((l.total_sales_value - l.total_purchase_value - l.total_freight_value) / l.total_sales_value) * 100, 1)
           ELSE 0 END AS margin
    FROM ops_loadings l
    LEFT JOIN ops_purchase_orders po ON po.id = l.purchase_order_id
    WHERE l.company_id = p_company_id
      AND l.status NOT IN ('canceled', 'cancelled')
      AND l.loading_date >= v_date_from
      AND l.total_sales_value > 0
    ORDER BY (l.total_sales_value - l.total_purchase_value - l.total_freight_value) ASC
    LIMIT 5
  ) t;

  -- ========================================================================
  -- 9. BEST / WORST MONTHS
  -- ========================================================================
  SELECT COALESCE(json_agg(x.elem), '[]'::json)
  INTO v_best_months
  FROM (
    SELECT elem
    FROM json_array_elements(COALESCE(v_monthly_history, '[]'::json)) elem
    WHERE (elem->>'netResult')::numeric != 0
    ORDER BY (elem->>'netResult')::numeric DESC
    LIMIT 3
  ) x;

  SELECT COALESCE(json_agg(x.elem), '[]'::json)
  INTO v_worst_months
  FROM (
    SELECT elem
    FROM json_array_elements(COALESCE(v_monthly_history, '[]'::json)) elem
    WHERE (elem->>'netResult')::numeric != 0
    ORDER BY (elem->>'netResult')::numeric ASC
    LIMIT 3
  ) x;

  -- ========================================================================
  -- RESULTADO FINAL
  -- ========================================================================
  result := json_build_object(
    'totalRevenue',           ROUND(v_total_revenue, 2),
    'totalDebits',            ROUND(v_total_debits, 2),
    'balance',                ROUND(v_balance, 2),
    'avgProfitPerSc',         ROUND(v_avg_profit_per_sc, 2),
    'globalMarginPercent',    ROUND(v_global_margin, 1),
    'totalVolumeTon',         ROUND(v_total_weight_ton, 2),
    'totalVolumeSc',          ROUND(v_total_weight_sc, 2),
    'avgPurchasePrice',       ROUND(v_avg_purchase_price, 2),
    'avgSalesPrice',          ROUND(v_avg_sales_price, 2),
    'avgFreightPriceTon',     ROUND(v_avg_freight_ton, 2),
    'avgTotalCostPerSc',      ROUND(v_avg_total_cost_sc, 2),
    'avgFreightCostSc',       ROUND(v_avg_freight_cost_sc, 2),
    'avgPureOpCostSc',        ROUND(v_avg_pure_op_cost_sc, 2),
    'avgOtherExpensesMonthly', ROUND(v_avg_other_monthly, 2),
    'totalRedirectCosts',     ROUND(v_total_redirect, 2),
    'monthlyHistory',         COALESCE(v_monthly_history, '[]'::json),
    'priceTrendHistory',      COALESCE(v_price_trend, '[]'::json),
    'harvests',               COALESCE(v_harvests, '[]'::json),
    'expenseBreakdown',       COALESCE(v_expense_breakdown, '[]'::json),
    'topProfitOrders',        COALESCE(v_top_profit, '[]'::json),
    'topLossOrders',          COALESCE(v_top_loss, '[]'::json),
    'bestMonths',             COALESCE(v_best_months, '[]'::json),
    'worstMonths',            COALESCE(v_worst_months, '[]'::json)
  );

  RETURN result;
END;
$function$;

-- ════════════════════════════════════════════════════════════════════════════
-- 2) Hardening: rpc_set_initial_balance
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.rpc_set_initial_balance(p_account_id uuid, p_account_name text, p_date date, p_value numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_company_id UUID;
  v_caller_company_id UUID;
  v_tx_sum NUMERIC;
BEGIN
  SELECT company_id INTO v_company_id
  FROM accounts WHERE id = p_account_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Conta nao encontrada: %', p_account_id;
  END IF;

  SELECT au.company_id
    INTO v_caller_company_id
  FROM public.app_users au
  WHERE au.auth_user_id = (SELECT auth.uid())
    AND au.active = true
  LIMIT 1;

  IF v_caller_company_id IS NULL OR v_caller_company_id <> v_company_id THEN
    RAISE EXCEPTION 'Access denied: caller does not belong to company %', v_company_id;
  END IF;

  INSERT INTO initial_balances (id, company_id, account_id, account_name, date, value)
  VALUES (gen_random_uuid(), v_company_id, p_account_id, p_account_name, p_date, p_value)
  ON CONFLICT (company_id, account_id)
  DO UPDATE SET
    account_name = EXCLUDED.account_name,
    date = EXCLUDED.date,
    value = EXCLUDED.value;

  SELECT COALESCE(SUM(
    CASE WHEN type = 'IN' THEN amount ELSE -amount END
  ), 0) INTO v_tx_sum
  FROM financial_transactions
  WHERE account_id = p_account_id;

  UPDATE accounts
  SET balance = p_value + v_tx_sum,
      updated_at = now()
  WHERE id = p_account_id;
END;
$function$;

-- ════════════════════════════════════════════════════════════════════════════
-- 3) Hardening: rpc_remove_initial_balance
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.rpc_remove_initial_balance(p_balance_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_account_id UUID;
  v_company_id UUID;
  v_caller_company_id UUID;
  v_tx_sum NUMERIC;
BEGIN
  SELECT ib.account_id, ib.company_id
    INTO v_account_id, v_company_id
  FROM initial_balances ib
  WHERE ib.id = p_balance_id;

  IF v_account_id IS NULL OR v_company_id IS NULL THEN
    RAISE EXCEPTION 'Saldo inicial nao encontrado: %', p_balance_id;
  END IF;

  SELECT au.company_id
    INTO v_caller_company_id
  FROM public.app_users au
  WHERE au.auth_user_id = (SELECT auth.uid())
    AND au.active = true
  LIMIT 1;

  IF v_caller_company_id IS NULL OR v_caller_company_id <> v_company_id THEN
    RAISE EXCEPTION 'Access denied: caller does not belong to company %', v_company_id;
  END IF;

  DELETE FROM initial_balances WHERE id = p_balance_id;

  SELECT COALESCE(SUM(
    CASE WHEN type = 'IN' THEN amount ELSE -amount END
  ), 0) INTO v_tx_sum
  FROM financial_transactions
  WHERE account_id = v_account_id;

  UPDATE accounts
  SET balance = v_tx_sum,
      updated_at = now()
  WHERE id = v_account_id;
END;
$function$;

-- ════════════════════════════════════════════════════════════════════════════
-- Verificação
-- ════════════════════════════════════════════════════════════════════════════
SELECT 'MIGRATION_20260303_HARDEN_REMAINING_CRITICAL_RPCS_OK' AS status;
