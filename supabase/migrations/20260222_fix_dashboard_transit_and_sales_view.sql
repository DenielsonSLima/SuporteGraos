-- ============================================================================
-- Fix: Dashboard "Em Trânsito" zerado + VIEW enriquecida de Pedidos de Venda
-- ============================================================================
-- 1) rpc_dashboard_data → calcula merchandiseInTransitValue real
-- 2) vw_sales_orders_enriched → delivered_value/delivered_qty_sc/received_value
--    pré-calculados via SQL (zero cálculo no frontend)
-- ============================================================================

-- ============================================================================
-- 1) FIX: rpc_dashboard_data — Mercadoria em Trânsito
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
  v_merchandise_in_transit NUMERIC := 0;
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

  -- ═══════ MERCADORIA EM TRÂNSITO (antes hardcoded como 0) ═══════
  IF to_regclass('public.logistics_loadings') IS NOT NULL THEN
    EXECUTE $q$
      SELECT COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0)
      FROM public.logistics_loadings l
      WHERE l.company_id = $1
        AND COALESCE(l.status, '') IN ('loaded', 'in_transit', 'redirected', 'waiting_unload')
    $q$ INTO v_merchandise_in_transit USING p_company_id;
  ELSIF to_regclass('public.ops_loadings') IS NOT NULL THEN
    EXECUTE $q$
      SELECT COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0)
      FROM public.ops_loadings l
      WHERE l.company_id = $1
        AND COALESCE(l.status, '') IN ('loaded', 'in_transit', 'redirected', 'waiting_unload')
    $q$ INTO v_merchandise_in_transit USING p_company_id;
  END IF;

  v_total_assets := v_total_bank + v_pending_receivables + v_merchandise_in_transit;
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

-- ============================================================================
-- 2) VIEW: vw_sales_orders_enriched
-- Pedidos de Venda com delivered_value/delivered_qty_sc pré-calculados
-- O frontend NÃO faz reduce() — apenas exibe o que o SQL entrega.
-- ============================================================================
CREATE OR REPLACE VIEW public.vw_sales_orders_enriched AS
SELECT
  so.id,
  so.company_id,
  so.legacy_id,
  so.number,
  so.order_date,
  so.status,
  so.customer_id,
  so.customer_name,
  so.total_value,
  so.received_value,
  so.metadata,
  so.raw_payload,
  so.created_at,
  so.updated_at,

  -- ═══════ Dados de entrega (pré-calculados via ops_loadings) ═══════
  COALESCE(agg.delivered_qty_sc, 0)             AS delivered_qty_sc,
  COALESCE(agg.delivered_value, 0)              AS delivered_value,
  COALESCE(agg.load_count, 0)::int              AS load_count,

  -- ═══════ Mercadoria em trânsito (ainda não descarregada) ═══════
  COALESCE(transit.transit_count, 0)::int        AS transit_count,
  COALESCE(transit.transit_value, 0)             AS transit_value

FROM public.ops_sales_orders so

-- Agregação de carregamentos entregues (descarregados)
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int                                                  AS load_count,
    COALESCE(SUM(u.unload_weight_kg / 60.0), 0)                   AS delivered_qty_sc,
    COALESCE(SUM(
      (u.unload_weight_kg / 60.0) *
      COALESCE((ol.metadata->>'salesPrice')::numeric, (so.metadata->>'unitPrice')::numeric, 0)
    ), 0)                                                          AS delivered_value
  FROM public.ops_sales_order_unloads u
  JOIN public.ops_loadings ol ON ol.id = u.loading_id
  WHERE u.sales_order_id = so.id
    AND u.unload_weight_kg > 0
) agg ON true

-- Cargas em trânsito (não descarregadas ainda)
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int                                                  AS transit_count,
    COALESCE(SUM(
      (ol.weight_kg / 60.0) *
      COALESCE((ol.metadata->>'salesPrice')::numeric, (so.metadata->>'unitPrice')::numeric, 0)
    ), 0)                                                          AS transit_value
  FROM public.ops_loadings ol
  WHERE ol.sales_order_id = so.id
    AND ol.status IN ('loaded', 'in_transit', 'redirected', 'waiting_unload')
    AND NOT EXISTS (
      SELECT 1 FROM public.ops_sales_order_unloads u
      WHERE u.loading_id = ol.id AND u.unload_weight_kg > 0
    )
) transit ON true;

GRANT SELECT ON public.vw_sales_orders_enriched TO authenticated;

-- ============================================================================
-- EOF
-- ============================================================================
