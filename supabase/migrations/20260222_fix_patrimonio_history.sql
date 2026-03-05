-- ============================================================================
-- Fix: Evolução Patrimonial — incluir recebíveis, pagáveis e trânsito
-- ============================================================================
-- Antes: hist CTE usava apenas bank_assets e hardcoded liabilities = 0
-- Agora: assets = bank + receivables + transit, liabilities = payables
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_dashboard_data(p_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_bank        NUMERIC := 0;
  v_pending_receivables NUMERIC := 0;
  v_pending_payables  NUMERIC := 0;
  v_total_assets      NUMERIC := 0;
  v_total_liabilities NUMERIC := 0;
  v_merchandise_in_transit NUMERIC := 0;
  v_growth_percent    NUMERIC := 0;
  v_history           JSON;
  v_chart             JSON;
  v_loading_source    TEXT;
  result              JSON;
BEGIN
  -- ═══════ Detectar tabela de carregamentos ═══════
  IF to_regclass('public.logistics_loadings') IS NOT NULL THEN
    v_loading_source := 'public.logistics_loadings';
  ELSIF to_regclass('public.ops_loadings') IS NOT NULL THEN
    v_loading_source := 'public.ops_loadings';
  ELSE
    -- Dummy: sem carregamentos → 0 em trânsito
    v_loading_source := '(SELECT NULL::UUID AS company_id, NULL::TEXT AS status, 0::NUMERIC AS total_sales_value WHERE false)';
  END IF;

  -- ═══════ KPIs atuais (cards) ═══════
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

  EXECUTE format($q$
    SELECT COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0)
    FROM %s l
    WHERE l.company_id = $1
      AND COALESCE(l.status, '') IN ('loaded', 'in_transit', 'redirected', 'waiting_unload')
  $q$, v_loading_source) INTO v_merchandise_in_transit USING p_company_id;

  v_total_assets      := v_total_bank + v_pending_receivables + v_merchandise_in_transit;
  v_total_liabilities := v_pending_payables;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- HISTÓRICO PATRIMONIAL (6 meses)
  -- assets      = saldo bancário + recebíveis pendentes + mercadoria em trânsito
  -- liabilities = contas a pagar pendentes
  -- net_worth   = assets − liabilities
  -- ═══════════════════════════════════════════════════════════════════════════
  EXECUTE format($dyn$
    WITH months AS (
      SELECT generate_series(0, 5) AS i
    ),
    month_grid AS (
      SELECT
        i,
        date_trunc('month', (CURRENT_DATE - (i || ' months')::interval))::date AS month_start,
        (date_trunc('month', (CURRENT_DATE - (i || ' months')::interval))
          + interval '1 month - 1 day')::date AS month_end,
        to_char(date_trunc('month', (CURRENT_DATE - (i || ' months')::interval)), 'Mon') AS month_name
      FROM months
    ),

    -- ── Saldo bancário acumulado por mês ──
    accounts_active AS (
      SELECT a.id, a.company_id
      FROM accounts a
      WHERE a.company_id = $1 AND a.is_active = true
    ),
    bank_history AS (
      SELECT
        mg.i,
        mg.month_name,
        COALESCE(SUM(
          COALESCE((
            SELECT SUM(ib.value)
            FROM initial_balances ib
            WHERE ib.company_id = aa.company_id
              AND ib.account_id = aa.id
              AND ib.date <= mg.month_end
          ), 0)
          +
          COALESCE((
            SELECT SUM(
              CASE
                WHEN lower(ft.type) IN ('in', 'credit') THEN ft.amount
                WHEN lower(ft.type) IN ('out', 'debit')  THEN -ft.amount
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

    -- ── Recebíveis pendentes acumulados por mês ──
    receivables_history AS (
      SELECT
        mg.i,
        COALESCE(SUM(fe.remaining_amount), 0) AS pending_receivables
      FROM month_grid mg
      LEFT JOIN financial_entries fe
        ON fe.company_id = $1
        AND fe.type LIKE '%%receivable%%'
        AND fe.status <> 'paid'
        AND fe.created_date <= mg.month_end
      GROUP BY mg.i
    ),

    -- ── Contas a pagar pendentes acumuladas por mês ──
    payables_history AS (
      SELECT
        mg.i,
        COALESCE(SUM(fe.remaining_amount), 0) AS pending_payables
      FROM month_grid mg
      LEFT JOIN financial_entries fe
        ON fe.company_id = $1
        AND fe.type LIKE '%%payable%%'
        AND fe.status <> 'paid'
        AND fe.created_date <= mg.month_end
      GROUP BY mg.i
    ),

    -- ── Mercadoria em trânsito por mês (só aparece a partir do mês de carregamento) ──
    transit_history AS (
      SELECT
        mg.i,
        COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0) AS transit_value
      FROM month_grid mg
      LEFT JOIN %s l
        ON l.company_id = $1
        AND COALESCE(l.status, '') IN ('loaded', 'in_transit', 'redirected', 'waiting_unload')
        AND l.loading_date <= mg.month_end
      GROUP BY mg.i
    ),

    -- ── Composição patrimonial completa ──
    hist AS (
      SELECT
        bh.i,
        bh.month_name,
        bh.bank_assets
          + COALESCE(rh.pending_receivables, 0)
          + COALESCE(th.transit_value, 0)               AS assets,
        COALESCE(ph.pending_payables, 0)                AS liabilities,
        bh.bank_assets
          + COALESCE(rh.pending_receivables, 0)
          + COALESCE(th.transit_value, 0)
          - COALESCE(ph.pending_payables, 0)            AS net_worth
      FROM bank_history bh
      LEFT JOIN receivables_history rh ON rh.i = bh.i
      LEFT JOIN payables_history   ph ON ph.i = bh.i
      LEFT JOIN transit_history    th ON th.i = bh.i
    ),

    hist_with_change AS (
      SELECT
        i, month_name, assets, liabilities, net_worth,
        COALESCE(
          CASE
            WHEN LAG(net_worth) OVER (ORDER BY i DESC) = 0 THEN 0
            ELSE ((net_worth - LAG(net_worth) OVER (ORDER BY i DESC))
                  / ABS(LAG(net_worth) OVER (ORDER BY i DESC))) * 100
          END,
        0) AS monthly_change
      FROM hist
    )
    SELECT json_agg(json_build_object(
        'name',          month_name,
        'netWorth',      net_worth,
        'assets',        assets,
        'liabilities',   liabilities,
        'monthlyChange', monthly_change
      ) ORDER BY i DESC)
    FROM hist_with_change
  $dyn$, v_loading_source) INTO v_history USING p_company_id;

  -- ═══════ Growth percent (primeiro vs último mês) ═══════
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

  -- ═══════ Gráfico receita × despesa (3 meses) ═══════
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
      SUM(CASE WHEN lower(ft.type) IN ('out', 'debit')  THEN ft.amount ELSE 0 END) AS expense
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

  -- ═══════ Resultado final ═══════
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
      'merchandiseInTransitValue', v_merchandise_in_transit,
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
