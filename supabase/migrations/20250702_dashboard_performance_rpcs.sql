-- ============================================================================
-- Dashboard & Performance RPCs (SQL-first)
-- Frontend apenas exibe dados retornados pelo banco.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- RPC: rpc_dashboard_data
-- Retorna payload completo para Dashboard:
--   operational, financialPending, financial, chart, netWorth
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_dashboard_data(p_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_bank NUMERIC := 0;
  v_pending_receivables NUMERIC := 0;
  v_pending_payables NUMERIC := 0;
  v_total_assets NUMERIC := 0;
  v_total_liabilities NUMERIC := 0;
  v_growth_percent NUMERIC := 0;
  v_history JSON;
  v_chart JSON;
  result JSON;
BEGIN
  SELECT COALESCE(SUM(a.balance), 0)
    INTO v_total_bank
  FROM accounts a
  WHERE a.company_id = p_company_id
    AND a.is_active = true;

  SELECT COALESCE(SUM(fe.remaining_amount), 0)
    INTO v_pending_receivables
  FROM financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type LIKE '%receivable%'
    AND fe.status <> 'paid';

  SELECT COALESCE(SUM(fe.remaining_amount), 0)
    INTO v_pending_payables
  FROM financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type LIKE '%payable%'
    AND fe.status <> 'paid';

  v_total_assets := v_total_bank + v_pending_receivables;
  v_total_liabilities := v_pending_payables;

  WITH months AS (
    SELECT generate_series(0, 5) AS i
  ),
  month_grid AS (
    SELECT
      i,
      date_trunc('month', (CURRENT_DATE - (i || ' months')::interval))::date AS month_start,
      to_char(date_trunc('month', (CURRENT_DATE - (i || ' months')::interval)), 'Mon') AS month_name
    FROM months
  ),
  tx AS (
    SELECT
      date_trunc('month', ft.transaction_date)::date AS month_start,
      SUM(CASE WHEN ft.type = 'IN' THEN ft.amount ELSE 0 END) AS month_in,
      SUM(CASE WHEN ft.type = 'OUT' THEN ft.amount ELSE 0 END) AS month_out
    FROM financial_transactions ft
    WHERE ft.company_id = p_company_id
      AND ft.transaction_date >= date_trunc('month', CURRENT_DATE - interval '5 months')
    GROUP BY 1
  ),
  hist AS (
    SELECT
      mg.i,
      mg.month_name,
      COALESCE(tx.month_in, 0) + v_total_bank + v_pending_receivables AS assets,
      COALESCE(tx.month_out, 0) + v_pending_payables AS liabilities,
      (COALESCE(tx.month_in, 0) + v_total_bank + v_pending_receivables) -
      (COALESCE(tx.month_out, 0) + v_pending_payables) AS net_worth
    FROM month_grid mg
    LEFT JOIN tx ON tx.month_start = mg.month_start
  ),
  hist_with_change AS (
    SELECT
      i,
      month_name,
      assets,
      liabilities,
      net_worth,
      COALESCE(
        CASE
          WHEN LAG(net_worth) OVER (ORDER BY i DESC) = 0 THEN 0
          ELSE ((net_worth - LAG(net_worth) OVER (ORDER BY i DESC)) / ABS(LAG(net_worth) OVER (ORDER BY i DESC))) * 100
        END,
      0) AS monthly_change
    FROM hist
  )
  SELECT json_agg(json_build_object(
      'name', month_name,
      'netWorth', net_worth,
      'assets', assets,
      'liabilities', liabilities,
      'monthlyChange', monthly_change
    ) ORDER BY i DESC)
  INTO v_history
  FROM hist_with_change;

  WITH first_last AS (
    SELECT
      (SELECT net_worth FROM (
        SELECT i, net_worth FROM (
          SELECT generate_series(0, 5) AS i
        ) s
        LEFT JOIN (
          SELECT
            generate_series(0,5) AS j,
            v_total_assets - v_total_liabilities AS net_worth
        ) nw ON nw.j = s.i
        ORDER BY i DESC
        LIMIT 1
      ) a) AS first_value,
      (v_total_assets - v_total_liabilities) AS last_value
  )
  SELECT COALESCE(
    CASE WHEN first_value = 0 THEN 0
         ELSE ((last_value - first_value) / ABS(first_value)) * 100
    END,
    0
  )
  INTO v_growth_percent
  FROM first_last;

  WITH months AS (
    SELECT generate_series(0, 2) AS i
  ),
  month_grid AS (
    SELECT
      i,
      date_trunc('month', (CURRENT_DATE - (i || ' months')::interval))::date AS month_start,
      to_char(date_trunc('month', (CURRENT_DATE - (i || ' months')::interval)), 'Mon') AS month_name
    FROM months
  ),
  tx AS (
    SELECT
      date_trunc('month', ft.transaction_date)::date AS month_start,
      SUM(CASE WHEN ft.type = 'IN' THEN ft.amount ELSE 0 END) AS revenue,
      SUM(CASE WHEN ft.type = 'OUT' THEN ft.amount ELSE 0 END) AS expense
    FROM financial_transactions ft
    WHERE ft.company_id = p_company_id
      AND ft.transaction_date >= date_trunc('month', CURRENT_DATE - interval '2 months')
    GROUP BY 1
  )
  SELECT json_agg(json_build_object(
      'name', month_name,
      'revenue', COALESCE(tx.revenue, 0),
      'expense', COALESCE(tx.expense, 0),
      'avgPurchasePrice', 0,
      'avgSalesPrice', 0
    ) ORDER BY i DESC)
  INTO v_chart
  FROM month_grid mg
  LEFT JOIN tx ON tx.month_start = mg.month_start;

  result := json_build_object(
    'operational', json_build_object(
      'ordersLast30Days', 0,
      'volumeSc', 0,
      'volumeTon', 0,
      'avgPurchasePrice', 0,
      'avgSalesPrice', 0,
      'avgFreightPriceTon', 0,
      'avgCostPerSc', 0,
      'avgProfitPerSc', 0
    ),
    'financialPending', json_build_object(
      'receivables', '[]'::json,
      'tradePayables', '[]'::json,
      'expenses', '[]'::json
    ),
    'financial', json_build_object(
      'totalBankBalance', v_total_bank,
      'totalLiabilities', v_total_liabilities,
      'pendingSalesReceipts', v_pending_receivables,
      'merchandiseInTransitValue', 0,
      'totalAssets', v_total_assets
    ),
    'chart', COALESCE(v_chart, '[]'::json),
    'netWorth', json_build_object(
      'history', COALESCE(v_history, '[]'::json),
      'growthPercent', v_growth_percent
    )
  );

  RETURN result;
END;
$$;

-- ----------------------------------------------------------------------------
-- RPC: rpc_performance_report
-- Retorna payload completo do PerformanceReport
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_performance_report(
  p_company_id UUID,
  p_months_back INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_months INTEGER := COALESCE(NULLIF(p_months_back, 0), 12);
  v_total_revenue NUMERIC := 0;
  v_total_debits NUMERIC := 0;
  v_balance NUMERIC := 0;
  v_monthly_history JSON;
  v_price_trend JSON;
  result JSON;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN ft.type = 'IN' THEN ft.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ft.type = 'OUT' THEN ft.amount ELSE 0 END), 0)
  INTO v_total_revenue, v_total_debits
  FROM financial_transactions ft
  WHERE ft.company_id = p_company_id
    AND ft.transaction_date >= date_trunc('month', CURRENT_DATE - ((v_months - 1) || ' months')::interval);

  v_balance := v_total_revenue - v_total_debits;

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
  tx AS (
    SELECT
      date_trunc('month', ft.transaction_date)::date AS month_start,
      SUM(CASE WHEN ft.type = 'IN' THEN ft.amount ELSE 0 END) AS revenue,
      SUM(CASE WHEN ft.type = 'OUT' THEN ft.amount ELSE 0 END) AS debits
    FROM financial_transactions ft
    WHERE ft.company_id = p_company_id
      AND ft.transaction_date >= date_trunc('month', CURRENT_DATE - ((v_months - 1) || ' months')::interval)
    GROUP BY 1
  )
  SELECT json_agg(json_build_object(
      'name', month_name,
      'fullDate', full_date,
      'revenue', COALESCE(tx.revenue, 0),
      'freightCost', 0,
      'purchaseCost', 0,
      'otherExpenses', COALESCE(tx.debits, 0),
      'netResult', COALESCE(tx.revenue, 0) - COALESCE(tx.debits, 0),
      'totalQuantitySc', 0,
      'avgPurchaseCostSc', 0,
      'avgFreightCostSc', 0,
      'avgOtherCostSc', 0,
      'avgTotalCostSc', 0
    ) ORDER BY i DESC)
  INTO v_monthly_history
  FROM month_grid mg
  LEFT JOIN tx ON tx.month_start = mg.month_start;

  SELECT json_agg(json_build_object(
      'name', (elem->>'name'),
      'avgPurchasePrice', 0,
      'avgSalesPrice', 0
    ))
  INTO v_price_trend
  FROM json_array_elements(COALESCE(v_monthly_history, '[]'::json)) elem;

  result := json_build_object(
    'totalRevenue', v_total_revenue,
    'totalDebits', v_total_debits,
    'balance', v_balance,
    'avgProfitPerSc', 0,
    'globalMarginPercent', CASE WHEN v_total_revenue = 0 THEN 0 ELSE (v_balance / v_total_revenue) * 100 END,
    'totalVolumeTon', 0,
    'totalVolumeSc', 0,
    'avgPurchasePrice', 0,
    'avgSalesPrice', 0,
    'avgFreightPriceTon', 0,
    'avgTotalCostPerSc', 0,
    'avgFreightCostSc', 0,
    'avgPureOpCostSc', 0,
    'avgOtherExpensesMonthly', CASE WHEN v_months = 0 THEN 0 ELSE v_total_debits / v_months END,
    'totalRedirectCosts', 0,
    'monthlyHistory', COALESCE(v_monthly_history, '[]'::json),
    'priceTrendHistory', COALESCE(v_price_trend, '[]'::json),
    'harvests', '[]'::json,
    'expenseBreakdown', json_build_array(
      json_build_object('label', 'Despesas Fixas', 'total', 0, 'type', 'fixed', 'items', '[]'::json),
      json_build_object('label', 'Despesas Variáveis', 'total', 0, 'type', 'variable', 'items', '[]'::json),
      json_build_object('label', 'Custos Administrativos', 'total', v_total_debits, 'type', 'administrative', 'items', '[]'::json)
    ),
    'topProfitOrders', '[]'::json,
    'topLossOrders', '[]'::json,
    'bestMonths', COALESCE((
      SELECT json_agg(x)
      FROM (
        SELECT elem
        FROM json_array_elements(COALESCE(v_monthly_history, '[]'::json)) elem
        ORDER BY (elem->>'netResult')::numeric DESC
        LIMIT 3
      ) x
    ), '[]'::json),
    'worstMonths', COALESCE((
      SELECT json_agg(x)
      FROM (
        SELECT elem
        FROM json_array_elements(COALESCE(v_monthly_history, '[]'::json)) elem
        ORDER BY (elem->>'netResult')::numeric ASC
        LIMIT 3
      ) x
    ), '[]'::json)
  );

  RETURN result;
END;
$$;

SELECT 'DASHBOARD_AND_PERFORMANCE_RPCS_CREATED' AS status;
