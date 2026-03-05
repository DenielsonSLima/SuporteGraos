-- ============================================================================
-- Migration: Fix RPC Auth Validation (Cross-Tenant Security)
-- Data: 2026-03-03
-- ============================================================================
-- CORRIGE 3 problemas de segurança identificados na auditoria:
--
--   1. rpc_monthly_balance_sheet → aceita p_company_id sem validar auth.uid()
--      FIX: Adiciona guard clause que valida caller pertence à empresa
--
--   2. rpc_financial_entry_totals_by_type → usa au.id = auth.uid() (ERRADO)
--      FIX: Corrige para au.auth_user_id = auth.uid()
--      (app_users.id é PK separada, auth_user_id é o link com auth.uid())
--
--   3. rpc_dashboard_data → aceita p_company_id sem validar auth.uid()
--      FIX: Adiciona guard clause que valida caller pertence à empresa
--
-- Regra 3.6 (Skill): "Validação: Sempre validar company_id"
-- Regra 8.6 (Skill): "RPCs financeiras devem validar auth.uid() internamente"
-- Regra 4.2 (Skill): "RLS é a garantia de que um user só vê dados da sua org"
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 1. FIX: rpc_monthly_balance_sheet → validar auth.uid() pertence ao company_id
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.rpc_monthly_balance_sheet(
  p_company_id UUID,
  p_year       INT,
  p_month      INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_company UUID;
  v_start_of_month DATE;
  v_end_of_month   DATE;
  v_month_label    TEXT;

  -- Saldos bancários
  v_total_bank_balance     NUMERIC := 0;
  v_total_initial_balance  NUMERIC := 0;
  v_bank_balances          JSON;

  -- Ativos
  v_pending_sales_receipts   NUMERIC := 0;
  v_merchandise_in_transit   NUMERIC := 0;
  v_total_fixed_assets       NUMERIC := 0;
  v_shareholder_receivables  NUMERIC := 0;
  v_loans_granted            NUMERIC := 0;
  v_advances_given           NUMERIC := 0;
  v_total_assets             NUMERIC := 0;

  -- Passivos
  v_pending_purchase_payments NUMERIC := 0;
  v_pending_freight_payments  NUMERIC := 0;
  v_commissions_to_pay        NUMERIC := 0;
  v_loans_taken               NUMERIC := 0;
  v_advances_taken            NUMERIC := 0;
  v_shareholder_payables      NUMERIC := 0;
  v_total_liabilities         NUMERIC := 0;

  -- Resultado
  v_net_balance NUMERIC := 0;
  result        JSON;
BEGIN
  -- ══════════════════════════════════════════════════════════════════════
  -- GUARD: Validar que o caller pertence à empresa solicitada
  -- Usa auth_user_id (não id) pois auth.uid() retorna o UUID do auth.users
  -- ══════════════════════════════════════════════════════════════════════
  SELECT au.company_id INTO v_caller_company
  FROM app_users au
  WHERE au.auth_user_id = (SELECT auth.uid())
  LIMIT 1;

  IF v_caller_company IS NULL OR v_caller_company <> p_company_id THEN
    RAISE EXCEPTION 'Access denied: caller does not belong to company %', p_company_id;
  END IF;

  v_start_of_month := make_date(p_year, p_month, 1);
  v_end_of_month   := (v_start_of_month + interval '1 month - 1 day')::date;
  v_month_label    := to_char(v_start_of_month, 'TMMonth YYYY');

  -- ══════════════════════════════════════════════════════════════════════
  -- A) SALDOS BANCÁRIOS (início e fim do mês)
  -- ══════════════════════════════════════════════════════════════════════
  WITH active_accounts AS (
    SELECT a.id
    FROM accounts a
    WHERE a.company_id = p_company_id
      AND a.is_active = true
  ),
  initial_vals AS (
    SELECT
      ib.account_id,
      COALESCE(SUM(ib.value), 0) AS init_value
    FROM initial_balances ib
    WHERE ib.company_id = p_company_id
      AND ib.account_id IN (SELECT id FROM active_accounts)
    GROUP BY ib.account_id
  ),
  tx_before_month AS (
    SELECT
      ft.account_id,
      SUM(
        CASE ft.type
          WHEN 'credit' THEN ft.amount
          WHEN 'debit'  THEN -ft.amount
          ELSE 0
        END
      ) AS net_before
    FROM financial_transactions ft
    WHERE ft.company_id = p_company_id
      AND ft.transaction_date < v_start_of_month
      AND ft.account_id IN (SELECT id FROM active_accounts)
    GROUP BY ft.account_id
  ),
  tx_in_month AS (
    SELECT
      ft.account_id,
      SUM(
        CASE ft.type
          WHEN 'credit' THEN ft.amount
          WHEN 'debit'  THEN -ft.amount
          ELSE 0
        END
      ) AS net_in_month
    FROM financial_transactions ft
    WHERE ft.company_id = p_company_id
      AND ft.transaction_date >= v_start_of_month
      AND ft.transaction_date <= v_end_of_month
      AND ft.account_id IN (SELECT id FROM active_accounts)
    GROUP BY ft.account_id
  ),
  account_balances AS (
    SELECT
      a.id,
      a.account_name AS bank_name,
      a.owner,
      COALESCE(iv.init_value, 0) + COALESCE(tbm.net_before, 0)
        AS start_balance,
      COALESCE(iv.init_value, 0) + COALESCE(tbm.net_before, 0) + COALESCE(tim.net_in_month, 0)
        AS end_balance
    FROM accounts a
    INNER JOIN active_accounts aa ON aa.id = a.id
    LEFT JOIN initial_vals iv       ON iv.account_id = a.id
    LEFT JOIN tx_before_month tbm   ON tbm.account_id = a.id
    LEFT JOIN tx_in_month tim       ON tim.account_id = a.id
    WHERE a.company_id = p_company_id
  )
  SELECT
    COALESCE(SUM(ab.end_balance), 0),
    COALESCE(json_agg(json_build_object(
      'id',           ab.id,
      'bankName',     ab.bank_name,
      'owner',        ab.owner,
      'startBalance', ab.start_balance,
      'balance',      ab.end_balance
    )), '[]'::json)
  INTO v_total_bank_balance, v_bank_balances
  FROM account_balances ab;

  -- Saldo inicial global
  SELECT COALESCE(SUM(ib.value), 0)
  INTO v_total_initial_balance
  FROM initial_balances ib
  WHERE ib.company_id = p_company_id;

  -- ══════════════════════════════════════════════════════════════════════
  -- B) ATIVOS
  -- ══════════════════════════════════════════════════════════════════════

  SELECT COALESCE(SUM(
    COALESCE(fe.remaining_amount, fe.total_amount - COALESCE(fe.paid_amount, 0))
  ), 0)
  INTO v_pending_sales_receipts
  FROM financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'receivable'
    AND fe.origin_type = 'sales_order'
    AND fe.status NOT IN ('paid', 'cancelled', 'canceled')
    AND fe.created_date <= v_end_of_month;

  SELECT COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0)
  INTO v_merchandise_in_transit
  FROM ops_loadings l
  WHERE l.company_id = p_company_id
    AND COALESCE(l.status, '') IN ('loaded', 'in_transit', 'redirected', 'waiting_unload');

  SELECT COALESCE(SUM(a.acquisition_value), 0)
  INTO v_total_fixed_assets
  FROM assets a
  WHERE a.company_id = p_company_id
    AND a.status = 'active';

  SELECT COALESCE(SUM(ABS(s.current_balance)), 0)
  INTO v_shareholder_receivables
  FROM shareholders s
  WHERE s.company_id = p_company_id
    AND s.current_balance < 0;

  v_loans_granted := 0;

  SELECT COALESCE(SUM(
    COALESCE(a.remaining_amount, a.amount - COALESCE(a.settled_amount, 0))
  ), 0)
  INTO v_advances_given
  FROM advances a
  WHERE a.company_id = p_company_id
    AND a.recipient_type = 'given'
    AND a.status NOT IN ('settled', 'cancelled');

  v_total_assets := v_total_bank_balance + v_pending_sales_receipts
    + v_merchandise_in_transit + v_total_fixed_assets
    + v_shareholder_receivables + v_loans_granted + v_advances_given;

  -- ══════════════════════════════════════════════════════════════════════
  -- C) PASSIVOS
  -- ══════════════════════════════════════════════════════════════════════

  SELECT COALESCE(SUM(
    COALESCE(fe.remaining_amount, fe.total_amount - COALESCE(fe.paid_amount, 0))
  ), 0)
  INTO v_pending_purchase_payments
  FROM financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.origin_type = 'purchase_order'
    AND fe.status NOT IN ('paid', 'cancelled', 'canceled')
    AND fe.created_date <= v_end_of_month;

  SELECT COALESCE(SUM(
    COALESCE(fe.remaining_amount, fe.total_amount - COALESCE(fe.paid_amount, 0))
  ), 0)
  INTO v_pending_freight_payments
  FROM financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.origin_type = 'freight'
    AND fe.status NOT IN ('paid', 'cancelled', 'canceled')
    AND fe.created_date <= v_end_of_month;

  v_commissions_to_pay := 0;
  v_loans_taken := 0;

  SELECT COALESCE(SUM(
    COALESCE(a.remaining_amount, a.amount - COALESCE(a.settled_amount, 0))
  ), 0)
  INTO v_advances_taken
  FROM advances a
  WHERE a.company_id = p_company_id
    AND a.recipient_type = 'received'
    AND a.status NOT IN ('settled', 'cancelled');

  SELECT COALESCE(SUM(s.current_balance), 0)
  INTO v_shareholder_payables
  FROM shareholders s
  WHERE s.company_id = p_company_id
    AND s.current_balance > 0;

  v_total_liabilities := v_pending_purchase_payments + v_pending_freight_payments
    + v_commissions_to_pay + v_loans_taken + v_advances_taken + v_shareholder_payables;

  -- ══════════════════════════════════════════════════════════════════════
  -- D) RESULTADO
  -- ══════════════════════════════════════════════════════════════════════
  v_net_balance := v_total_assets - v_total_liabilities;

  result := json_build_object(
    'monthKey',        to_char(v_start_of_month, 'YYYY-MM'),
    'monthLabel',      v_month_label,
    'referenceDate',   v_end_of_month,

    'bankBalances',              COALESCE(v_bank_balances, '[]'::json),
    'totalBankBalance',          v_total_bank_balance,
    'totalInitialBalance',       v_total_initial_balance,

    'pendingSalesReceipts',      v_pending_sales_receipts,
    'merchandiseInTransitValue', v_merchandise_in_transit,
    'totalFixedAssetsValue',     v_total_fixed_assets,
    'shareholderReceivables',    v_shareholder_receivables,
    'loansGranted',              v_loans_granted,
    'advancesGiven',             v_advances_given,
    'totalAssets',               v_total_assets,

    'pendingPurchasePayments',   v_pending_purchase_payments,
    'pendingFreightPayments',    v_pending_freight_payments,
    'commissionsToPay',          v_commissions_to_pay,
    'loansTaken',                v_loans_taken,
    'advancesTaken',             v_advances_taken,
    'shareholderPayables',       v_shareholder_payables,
    'totalLiabilities',          v_total_liabilities,

    'netBalance',                v_net_balance
  );

  RETURN result;
END;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 2. FIX: rpc_financial_entry_totals_by_type → au.id → au.auth_user_id
--    BUG: app_users.id é PK separada, auth.uid() mapeia para auth_user_id
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.rpc_financial_entry_totals_by_type(p_type text)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'total',     COALESCE(SUM(fe.total_amount), 0),
    'paid',      COALESCE(SUM(COALESCE(fe.paid_amount, 0)), 0),
    'remaining', COALESCE(SUM(COALESCE(fe.remaining_amount,
                    fe.total_amount - COALESCE(fe.paid_amount, 0))), 0)
  )
  FROM financial_entries fe
  WHERE fe.type = p_type
    AND fe.status <> 'cancelled'
    AND fe.company_id = (
      SELECT au.company_id
      FROM app_users au
      WHERE au.auth_user_id = (SELECT auth.uid())
      LIMIT 1
    );
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 3. FIX: rpc_dashboard_data → validar auth.uid() pertence ao company_id
--    Mesmo padrão de segurança aplicado ao balance_sheet
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.rpc_dashboard_data(p_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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
  -- C) HISTÓRICO PATRIMONIAL (6 meses)
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
    $dyn$, v_loading_source) INTO v_history USING p_company_id;
  ELSE
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
SELECT 'MIGRATION_20260303_FIX_RPC_AUTH_VALIDATION_OK' AS status;
