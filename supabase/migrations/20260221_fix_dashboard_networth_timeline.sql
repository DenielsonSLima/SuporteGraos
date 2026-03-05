-- ============================================================================
-- Fix: Evolução Patrimonial mensal com corte temporal correto
-- Objetivo:
--   - Não projetar saldo atual para meses passados
--   - Considerar saldo inicial apenas a partir da sua data
--   - Suportar tipos legacy (IN/OUT) e novos (credit/debit)
-- ============================================================================

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
  -- KPIs atuais (cards)
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

  -- Histórico patrimonial (6 meses) com corte temporal mensal
  WITH months AS (
    SELECT generate_series(0, 5) AS i
  ),
  month_grid AS (
    SELECT
      i,
      date_trunc('month', (CURRENT_DATE - (i || ' months')::interval))::date AS month_start,
      (date_trunc('month', (CURRENT_DATE - (i || ' months')::interval)) + interval '1 month - 1 day')::date AS month_end,
      to_char(date_trunc('month', (CURRENT_DATE - (i || ' months')::interval)), 'Mon') AS month_name
    FROM months
  ),
  accounts_active AS (
    SELECT a.id, a.company_id
    FROM accounts a
    WHERE a.company_id = p_company_id
      AND a.is_active = true
  ),
  bank_history AS (
    SELECT
      mg.i,
      mg.month_name,
      COALESCE(SUM(
        -- saldo inicial válido até o mês
        COALESCE((
          SELECT SUM(ib.value)
          FROM initial_balances ib
          WHERE ib.company_id = aa.company_id
            AND ib.account_id = aa.id
            AND ib.date <= mg.month_end
        ), 0)
        +
        -- movimentos financeiros acumulados até o fim do mês
        COALESCE((
          SELECT SUM(
            CASE
              WHEN lower(ft.type) IN ('in', 'credit') THEN ft.amount
              WHEN lower(ft.type) IN ('out', 'debit') THEN -ft.amount
              ELSE 0
            END
          )
          FROM financial_transactions ft
          WHERE ft.company_id = aa.company_id
            AND ft.account_id = aa.id
            AND ft.transaction_date <= mg.month_end
        ), 0)
      ), 0) AS bank_assets
    FROM month_grid mg
    CROSS JOIN accounts_active aa
    GROUP BY mg.i, mg.month_name
  ),
  hist AS (
    SELECT
      bh.i,
      bh.month_name,
      bh.bank_assets AS assets,
      0::NUMERIC AS liabilities,
      bh.bank_assets AS net_worth
    FROM bank_history bh
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

  WITH hist_values AS (
    SELECT
      (elem->>'netWorth')::NUMERIC AS net_worth,
      ROW_NUMBER() OVER () AS rn
    FROM json_array_elements(COALESCE(v_history, '[]'::json)) elem
  ),
  first_last AS (
    SELECT
      (SELECT hv.net_worth FROM hist_values hv WHERE hv.rn = 1) AS first_value,
      (SELECT hv.net_worth FROM hist_values hv ORDER BY hv.rn DESC LIMIT 1) AS last_value
  )
  SELECT COALESCE(
    CASE WHEN first_value = 0 THEN 0
         ELSE ((last_value - first_value) / ABS(first_value)) * 100
    END,
    0
  )
  INTO v_growth_percent
  FROM first_last;

  -- Gráfico de 3 meses com suporte a tipos legacy + novos
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
      SUM(CASE WHEN lower(ft.type) IN ('in', 'credit') THEN ft.amount ELSE 0 END) AS revenue,
      SUM(CASE WHEN lower(ft.type) IN ('out', 'debit') THEN ft.amount ELSE 0 END) AS expense
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
