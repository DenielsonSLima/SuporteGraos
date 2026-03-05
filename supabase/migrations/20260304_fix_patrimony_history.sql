-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Fix patrimony history — use loading_date instead of order date
-- Data: 2026-03-04
-- Problema: O histórico patrimonial usava financial_entries.created_date (data do
--   pedido) para atribuir passivos/recebíveis a meses. Quando um carregamento do
--   mês seguinte dispara rebuild, o total_amount sobe mas created_date fica no
--   mês do pedido, inflando retroativamente o passivo do mês anterior.
-- Solução: Usar ops_loadings.loading_date como referência temporal no cálculo
--   histórico patrimonial. Pagamentos são descontados via financial_transactions.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.rpc_dashboard_data(p_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Auth guard
  v_caller_company UUID;

  -- Financial
  v_total_bank            NUMERIC := 0;
  v_pending_receivables   NUMERIC := 0;
  v_pending_payables      NUMERIC := 0;
  v_total_assets          NUMERIC := 0;
  v_total_liabilities     NUMERIC := 0;
  v_merchandise_in_transit NUMERIC := 0;
  v_net_worth             NUMERIC := 0;

  -- Operational KPIs (30 days)
  v_orders_last_30        INTEGER := 0;
  v_volume_sc             NUMERIC := 0;
  v_volume_ton            NUMERIC := 0;
  v_avg_purchase_price    NUMERIC := 0;
  v_avg_sales_price       NUMERIC := 0;
  v_avg_freight_ton       NUMERIC := 0;
  v_avg_cost_sc           NUMERIC := 0;
  v_avg_profit_sc         NUMERIC := 0;

  -- Patrimônio
  v_loading_source        TEXT;
  v_growth_percent        NUMERIC := 0;
  v_history               JSON;
  v_chart                 JSON;

  result JSON;
BEGIN
  -- ══════════════════════════════════════════════════════════════════════
  -- GUARD: Validar que o caller pertence à empresa solicitada
  -- ══════════════════════════════════════════════════════════════════════
  SELECT au.company_id INTO v_caller_company
  FROM app_users au
  WHERE au.auth_user_id = (SELECT auth.uid())
  LIMIT 1;

  IF v_caller_company IS NULL OR v_caller_company <> p_company_id THEN
    RAISE EXCEPTION 'Access denied: caller does not belong to company %', p_company_id;
  END IF;

  -- ══════════════════════════════════════════════════════════════════════
  -- Detectar tabela de carregamentos (compatibilidade)
  -- ══════════════════════════════════════════════════════════════════════
  IF to_regclass('public.logistics_loadings') IS NOT NULL THEN
    v_loading_source := 'public.logistics_loadings';
  ELSIF to_regclass('public.ops_loadings') IS NOT NULL THEN
    v_loading_source := 'public.ops_loadings';
  ELSE
    v_loading_source := NULL;
  END IF;

  -- ══════════════════════════════════════════════════════════════════════
  -- A) FINANCIAL CARDS (valores ATUAIS — corretos como estão)
  -- ══════════════════════════════════════════════════════════════════════

  -- Saldo bancário total
  SELECT COALESCE(SUM(a.balance), 0)
    INTO v_total_bank
  FROM accounts a
  WHERE a.company_id = p_company_id
    AND a.is_active = true;

  -- Contas a receber (pendentes)
  SELECT COALESCE(SUM(fe.remaining_amount), 0)
    INTO v_pending_receivables
  FROM financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type LIKE '%receivable%'
    AND fe.status <> 'paid';

  -- Contas a pagar (pendentes)
  SELECT COALESCE(SUM(fe.remaining_amount), 0)
    INTO v_pending_payables
  FROM financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type LIKE '%payable%'
    AND fe.status <> 'paid';

  -- Mercadoria em trânsito
  IF v_loading_source IS NOT NULL THEN
    EXECUTE format($q$
      SELECT COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0)
      FROM %s l
      WHERE l.company_id = $1
        AND COALESCE(l.status, '') IN ('loaded', 'in_transit', 'redirected', 'waiting_unload')
    $q$, v_loading_source) INTO v_merchandise_in_transit USING p_company_id;
  END IF;

  v_total_assets      := v_total_bank + v_pending_receivables + v_merchandise_in_transit;
  v_total_liabilities := v_pending_payables;
  v_net_worth         := v_total_assets - v_total_liabilities;

  -- ══════════════════════════════════════════════════════════════════════
  -- B) OPERATIONAL KPIs (últimos 30 dias)
  -- ══════════════════════════════════════════════════════════════════════

  SELECT COALESCE(purchase_count, 0) + COALESCE(sales_count, 0)
  INTO v_orders_last_30
  FROM (
    SELECT
      (SELECT COUNT(*)::int FROM ops_purchase_orders
       WHERE company_id = p_company_id
         AND order_date >= CURRENT_DATE - 30) AS purchase_count,
      (SELECT COUNT(*)::int FROM ops_sales_orders
       WHERE company_id = p_company_id
         AND order_date >= CURRENT_DATE - 30) AS sales_count
  ) counts;

  SELECT
    COALESCE(SUM(l.weight_kg) / 60, 0),
    COALESCE(SUM(l.weight_kg) / 1000, 0),
    CASE WHEN SUM(l.weight_kg) > 0
         THEN ROUND(SUM(l.total_purchase_value) / (SUM(l.weight_kg) / 60), 2)
         ELSE 0 END,
    CASE WHEN SUM(l.weight_kg) > 0
         THEN ROUND(SUM(l.total_sales_value) / (SUM(l.weight_kg) / 60), 2)
         ELSE 0 END,
    CASE WHEN SUM(l.weight_kg) > 0
         THEN ROUND(SUM(l.total_freight_value) / (SUM(l.weight_kg) / 1000), 2)
         ELSE 0 END,
    CASE WHEN SUM(l.weight_kg) > 0
         THEN ROUND((SUM(l.total_purchase_value) + SUM(l.total_freight_value)) / (SUM(l.weight_kg) / 60), 2)
         ELSE 0 END,
    CASE WHEN SUM(l.weight_kg) > 0
         THEN ROUND(
           (SUM(l.total_sales_value) - SUM(l.total_purchase_value) - SUM(l.total_freight_value))
           / (SUM(l.weight_kg) / 60), 2)
         ELSE 0 END
  INTO v_volume_sc, v_volume_ton, v_avg_purchase_price, v_avg_sales_price,
       v_avg_freight_ton, v_avg_cost_sc, v_avg_profit_sc
  FROM ops_loadings l
  WHERE l.company_id = p_company_id
    AND l.status NOT IN ('canceled', 'cancelled')
    AND l.loading_date >= CURRENT_DATE - 30;

  -- ══════════════════════════════════════════════════════════════════════
  -- C) HISTÓRICO PATRIMONIAL (6 meses) — CORRIGIDO
  --    Agora usa ops_loadings.loading_date como referência temporal em vez
  --    de financial_entries.created_date (que era a data do pedido).
  --    Pagamentos são descontados via financial_transactions.transaction_date.
  -- ══════════════════════════════════════════════════════════════════════
  IF v_loading_source IS NOT NULL THEN
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
      -- ── RECEBÍVEIS: baseado em loading_date (entregues) ──
      receivables_history AS (
        SELECT
          mg.i,
          -- Bruto: soma de sales_value dos carregamentos ENTREGUES até o fim do mês
          COALESCE((
            SELECT SUM(l.total_sales_value)
            FROM %s l
            WHERE l.company_id = $1
              AND l.status NOT IN ('canceled', 'cancelled')
              AND l.unload_weight_kg IS NOT NULL
              AND l.loading_date <= mg.month_end
          ), 0)
          -- Menos pagamentos recebidos em entries do tipo receivable até o fim do mês
          - COALESCE((
            SELECT SUM(ft.amount)
            FROM financial_transactions ft
            JOIN financial_entries fe ON fe.id = ft.entry_id
            WHERE fe.company_id = $1
              AND fe.type LIKE '%%%%receivable%%%%'
              AND lower(ft.type) IN ('in', 'credit')
              AND ft.transaction_date <= mg.month_end
          ), 0) AS pending_receivables
        FROM month_grid mg
        GROUP BY mg.i, mg.month_end
      ),
      -- ── PASSIVOS: baseado em loading_date ──
      payables_history AS (
        SELECT
          mg.i,
          -- Bruto: soma de (purchase + freight) dos carregamentos até o fim do mês
          COALESCE((
            SELECT SUM(l.total_purchase_value + l.total_freight_value)
            FROM %s l
            WHERE l.company_id = $1
              AND l.status NOT IN ('canceled', 'cancelled')
              AND l.loading_date <= mg.month_end
          ), 0)
          -- Menos pagamentos feitos em entries do tipo payable até o fim do mês
          - COALESCE((
            SELECT SUM(ft.amount)
            FROM financial_transactions ft
            JOIN financial_entries fe ON fe.id = ft.entry_id
            WHERE fe.company_id = $1
              AND fe.type LIKE '%%%%payable%%%%'
              AND lower(ft.type) IN ('out', 'debit')
              AND ft.transaction_date <= mg.month_end
          ), 0) AS pending_payables
        FROM month_grid mg
        GROUP BY mg.i, mg.month_end
      ),
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
    $dyn$, v_loading_source, v_loading_source, v_loading_source) INTO v_history USING p_company_id;
  ELSE
    -- Fallback sem tabela de loadings (usa financial_entries diretamente)
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
    accounts_active AS (
      SELECT a.id, a.company_id
      FROM accounts a
      WHERE a.company_id = p_company_id AND a.is_active = true
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
    receivables_history AS (
      SELECT
        mg.i,
        COALESCE(SUM(fe.remaining_amount), 0) AS pending_receivables
      FROM month_grid mg
      LEFT JOIN financial_entries fe
        ON fe.company_id = p_company_id
        AND fe.type LIKE '%receivable%'
        AND fe.status NOT IN ('cancelled', 'canceled')
        AND fe.created_date <= mg.month_end
        AND (fe.paid_date IS NULL OR fe.paid_date > mg.month_end)
      GROUP BY mg.i
    ),
    payables_history AS (
      SELECT
        mg.i,
        COALESCE(SUM(fe.remaining_amount), 0) AS pending_payables
      FROM month_grid mg
      LEFT JOIN financial_entries fe
        ON fe.company_id = p_company_id
        AND fe.type LIKE '%payable%'
        AND fe.status NOT IN ('cancelled', 'canceled')
        AND fe.created_date <= mg.month_end
        AND (fe.paid_date IS NULL OR fe.paid_date > mg.month_end)
      GROUP BY mg.i
    ),
    hist AS (
      SELECT
        bh.i,
        bh.month_name,
        bh.bank_assets
          + COALESCE(rh.pending_receivables, 0) AS assets,
        COALESCE(ph.pending_payables, 0)        AS liabilities,
        bh.bank_assets
          + COALESCE(rh.pending_receivables, 0)
          - COALESCE(ph.pending_payables, 0)    AS net_worth
      FROM bank_history bh
      LEFT JOIN receivables_history rh ON rh.i = bh.i
      LEFT JOIN payables_history   ph ON ph.i = bh.i
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
    INTO v_history
    FROM hist_with_change;
  END IF;

  -- Crescimento percentual: primeiro mês COM DADOS vs último mês
  -- (ignora meses zerados no início para não dividir por zero)
  WITH hist_values AS (
    SELECT
      (elem->>'netWorth')::NUMERIC AS net_worth,
      ROW_NUMBER() OVER () AS rn
    FROM json_array_elements(COALESCE(v_history, '[]'::json)) elem
  ),
  first_nonzero AS (
    SELECT hv.net_worth
    FROM hist_values hv
    WHERE hv.net_worth <> 0
    ORDER BY hv.rn ASC
    LIMIT 1
  ),
  last_value AS (
    SELECT hv.net_worth
    FROM hist_values hv
    ORDER BY hv.rn DESC
    LIMIT 1
  )
  SELECT COALESCE(
    CASE
      WHEN fn.net_worth IS NULL OR fn.net_worth = 0 THEN 0
      ELSE ROUND(((lv.net_worth - fn.net_worth) / ABS(fn.net_worth)) * 100, 1)
    END,
    0
  )
  INTO v_growth_percent
  FROM first_nonzero fn, last_value lv;

  -- ══════════════════════════════════════════════════════════════════════
  -- D) GRÁFICO DE 3 MESES
  -- ══════════════════════════════════════════════════════════════════════
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

  -- ══════════════════════════════════════════════════════════════════════
  -- E) RESULTADO FINAL
  -- ══════════════════════════════════════════════════════════════════════
  result := json_build_object(
    'operational', json_build_object(
      'ordersLast30Days', v_orders_last_30,
      'volumeSc', ROUND(v_volume_sc, 2),
      'volumeTon', ROUND(v_volume_ton, 2),
      'avgPurchasePrice', v_avg_purchase_price,
      'avgSalesPrice', v_avg_sales_price,
      'avgFreightPriceTon', v_avg_freight_ton,
      'avgCostPerSc', v_avg_cost_sc,
      'avgProfitPerSc', v_avg_profit_sc
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
      'totalAssets', v_total_assets,
      'netWorth', v_net_worth
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

-- Manter permissões
REVOKE ALL ON FUNCTION public.rpc_dashboard_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_dashboard_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_dashboard_data(UUID) TO service_role;

SELECT 'MIGRATION_20260304_FIX_PATRIMONY_HISTORY_OK' AS status;
