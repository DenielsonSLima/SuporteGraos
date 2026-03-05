-- ============================================================================
-- Migration: Fix Dashboard RPC + Supabase Performance Advisor Warnings
-- Data: 2026-03-01
-- ============================================================================
-- CORRIGE:
--   1. rpc_dashboard_data → populando KPIs operacionais reais (antes hardcoded 0)
--      + adicionando netWorth no retorno (frontend NÃO faz cálculos)
--   2. Auth RLS Initialization Plan → my_company_id() usa (SELECT auth.uid())
--   3. Auth RLS Initialization Plan → policies de companies/app_users com (SELECT ...)
--   4. Multiple Permissive Policies → consolida 2 UPDATE policies em app_users
--   5. Duplicate Index → remove constraint duplicada em initial_balances
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 1. FIX: my_company_id() → usar (SELECT auth.uid()) para cache interno
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.app_users
  WHERE auth_user_id = (SELECT auth.uid())
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. FIX: RLS policies em companies → wrapper (SELECT ...) para evitar
--    re-execução por linha (Auth RLS Initialization Plan warning)
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "companies_select" ON public.companies;
DROP POLICY IF EXISTS "companies_update" ON public.companies;
DROP POLICY IF EXISTS "companies_delete" ON public.companies;
DROP POLICY IF EXISTS "companies_insert" ON public.companies;

CREATE POLICY "companies_select" ON public.companies
  FOR SELECT USING (id = (SELECT public.my_company_id()));

CREATE POLICY "companies_update" ON public.companies
  FOR UPDATE USING (id = (SELECT public.my_company_id()));

CREATE POLICY "companies_delete" ON public.companies
  FOR DELETE USING (id = (SELECT public.my_company_id()));

CREATE POLICY "companies_insert" ON public.companies
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ════════════════════════════════════════════════════════════════════════════
-- 3. FIX: RLS policies em app_users → wrapper (SELECT ...) +
--    consolidar 2 UPDATE policies (Multiple Permissive Policies warning)
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "app_users_select" ON public.app_users;
DROP POLICY IF EXISTS "app_users_update_self" ON public.app_users;
DROP POLICY IF EXISTS "app_users_update_admin" ON public.app_users;
DROP POLICY IF EXISTS "app_users_update" ON public.app_users;
DROP POLICY IF EXISTS "app_users_insert_service" ON public.app_users;

-- SELECT: vê apenas usuários da mesma empresa (cached)
CREATE POLICY "app_users_select" ON public.app_users
  FOR SELECT USING (
    company_id = (SELECT public.my_company_id())
  );

-- UPDATE: próprio usuário OU admin da empresa (1 policy, não 2)
CREATE POLICY "app_users_update" ON public.app_users
  FOR UPDATE USING (
    auth_user_id = (SELECT auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.app_users AS u
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND u.role = 'admin'
        AND u.active = true
        AND u.company_id = app_users.company_id
    )
  );

-- INSERT: apenas admin (service_role)
CREATE POLICY "app_users_insert_service" ON public.app_users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users AS u
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND u.role = 'admin'
        AND u.active = true
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- 4. FIX: Duplicate Index em initial_balances
--    A migration 005 cria CONSTRAINT "initial_balances_unique_account"
--    A migration 20250702 cria CONSTRAINT "initial_balances_company_account_unique"
--    Ambas em (company_id, account_id) → drop a duplicada
-- ════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'initial_balances_company_account_unique'
  ) THEN
    ALTER TABLE public.initial_balances
      DROP CONSTRAINT initial_balances_company_account_unique;
    RAISE NOTICE 'Dropped duplicate constraint initial_balances_company_account_unique';
  END IF;
END
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. FIX: rpc_dashboard_data → KPIs operacionais reais + netWorth no retorno
--    Antes: operational era hardcoded{0,0,0,...}
--    Agora: consulta ops_loadings, ops_purchase_orders, ops_sales_orders (30d)
--    + financial.netWorth = totalAssets - totalLiabilities (SERVER-SIDE)
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.rpc_dashboard_data(p_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
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
  -- A) FINANCIAL CARDS
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
  -- B) OPERATIONAL KPIs (últimos 30 dias) — antes hardcoded 0!
  -- ══════════════════════════════════════════════════════════════════════

  -- Contagem de pedidos (compra + venda) nos últimos 30 dias
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

  -- Volume + médias de preço nos últimos 30 dias (de carregamentos não cancelados)
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
  -- C) HISTÓRICO PATRIMONIAL (6 meses)
  --    assets      = saldo bancário + recebíveis pendentes + mercadoria em trânsito
  --    liabilities = contas a pagar pendentes
  --    net_worth   = assets − liabilities
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

      -- Saldo bancário acumulado por mês
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

      -- Recebíveis pendentes por mês (entradas criadas até month_end e ainda não pagas naquele mês)
      receivables_history AS (
        SELECT
          mg.i,
          COALESCE(SUM(fe.total_amount), 0) AS pending_receivables
        FROM month_grid mg
        LEFT JOIN financial_entries fe
          ON fe.company_id = $1
          AND fe.type LIKE '%%receivable%%'
          AND fe.status NOT IN ('cancelled', 'canceled')
          AND fe.created_date <= mg.month_end
          AND (fe.paid_date IS NULL OR fe.paid_date > mg.month_end)
        GROUP BY mg.i
      ),

      -- Contas a pagar pendentes por mês
      payables_history AS (
        SELECT
          mg.i,
          COALESCE(SUM(fe.total_amount), 0) AS pending_payables
        FROM month_grid mg
        LEFT JOIN financial_entries fe
          ON fe.company_id = $1
          AND fe.type LIKE '%%payable%%'
          AND fe.status NOT IN ('cancelled', 'canceled')
          AND fe.created_date <= mg.month_end
          AND (fe.paid_date IS NULL OR fe.paid_date > mg.month_end)
        GROUP BY mg.i
      ),

      -- Mercadoria em trânsito por mês
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

      -- Composição patrimonial completa
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
  ELSE
    -- Sem tabela de carregamentos: patrimônio sem trânsito
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
        COALESCE(SUM(fe.total_amount), 0) AS pending_receivables
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
        COALESCE(SUM(fe.total_amount), 0) AS pending_payables
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

  -- Crescimento percentual (primeiro vs último mês)
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

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO
-- ════════════════════════════════════════════════════════════════════════════
SELECT 'MIGRATION_20260301_DASHBOARD_RLS_PERF_ADVISOR_OK' AS status;
