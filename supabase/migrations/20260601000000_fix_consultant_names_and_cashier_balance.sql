-- ============================================================================
-- Migration: Fix Consultant Names and Retroactive Cashier Loan Calculations
-- Date: 2026-06-01
-- ============================================================================

SET search_path = public;

-- 1. Normalise "Ronaldo Silva" to "Ronaldo Silva de Oliveira" in column and JSON metadata
UPDATE public.ops_sales_orders
SET consultant_name = 'Ronaldo Silva de Oliveira',
    metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{consultantName}', '"Ronaldo Silva de Oliveira"'),
    raw_payload = jsonb_set(COALESCE(raw_payload, '{}'::jsonb), '{consultantName}', '"Ronaldo Silva de Oliveira"')
WHERE consultant_name = 'Ronaldo Silva' OR metadata->>'consultantName' = 'Ronaldo Silva';

-- 2. Resolve "NEW" abbreviation in order numbers to "Newton Porto"
UPDATE public.ops_sales_orders
SET consultant_name = 'Newton Porto',
    metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{consultantName}', '"Newton Porto"'),
    raw_payload = jsonb_set(COALESCE(raw_payload, '{}'::jsonb), '{consultantName}', '"Newton Porto"')
WHERE number LIKE '%NEW%' AND (consultant_name IS NULL OR metadata->>'consultantName' IS NULL);

-- 3. Sync consultant_name column from metadata if it was only set in metadata
UPDATE public.ops_sales_orders
SET consultant_name = metadata->>'consultantName'
WHERE consultant_name IS NULL AND metadata->>'consultantName' IS NOT NULL AND metadata->>'consultantName' <> '';

-- 4. Sync metadata->>'consultantName' from consultant_name column if metadata was missing it
UPDATE public.ops_sales_orders
SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{consultantName}', to_jsonb(consultant_name)),
    raw_payload = jsonb_set(COALESCE(raw_payload, '{}'::jsonb), '{consultantName}', to_jsonb(consultant_name))
WHERE consultant_name IS NOT NULL AND (metadata->>'consultantName' IS NULL OR metadata->>'consultantName' = '');

-- 5. Recreate View vw_sales_orders_enriched to select consultant_name
CREATE OR REPLACE VIEW public.vw_sales_orders_enriched AS
 SELECT so.id,
    so.company_id,
    so.legacy_id,
    so.number,
    so.order_date,
    so.status,
    so.customer_id,
    so.customer_name,
    so.consultant_name, -- selected explicitly
    so.total_value,
    (COALESCE(fin.total_paid, (0)::numeric))::numeric(15,2) AS received_value,
    (COALESCE(fin.total_discount, (0)::numeric))::numeric(15,2) AS discount_value,
    (GREATEST((0)::numeric, ((COALESCE(delivered.delivered_value, (0)::numeric) - COALESCE(fin.total_paid, (0)::numeric)) - COALESCE(fin.total_discount, (0)::numeric))))::numeric(15,2) AS balance_value,
    so.metadata,
    so.raw_payload,
    so.created_at,
    so.updated_at,
    COALESCE(delivered.delivered_qty_sc, (0)::numeric) AS delivered_qty_sc,
    COALESCE(delivered.delivered_value, (0)::numeric) AS delivered_value,
    COALESCE(delivered.load_count, 0) AS load_count,
    COALESCE(delivered.total_grain_cost, (0)::numeric) AS total_grain_cost,
    COALESCE(delivered.total_freight_cost, (0)::numeric) AS total_freight_cost,
    COALESCE(delivered.total_direct_investment, (0)::numeric) AS total_direct_investment,
    COALESCE((delivered.delivered_value - delivered.total_direct_investment), (0)::numeric) AS gross_profit,
        CASE
            WHEN (COALESCE(delivered.delivered_value, (0)::numeric) > (0)::numeric) THEN (((COALESCE(delivered.delivered_value, (0)::numeric) - COALESCE(delivered.total_direct_investment, (0)::numeric)) / delivered.delivered_value) * (100)::numeric)
            ELSE (0)::numeric
        END AS margin_percent,
    COALESCE(transit.transit_count, 0) AS transit_count,
    COALESCE(transit.transit_value, (0)::numeric) AS transit_value
   FROM (((ops_sales_orders so
     LEFT JOIN LATERAL ( SELECT sum(fe.paid_amount) AS total_paid,
            sum(fe.discount_amount) AS total_discount
           FROM financial_entries fe
          WHERE (((fe.origin_id = so.id) OR (fe.origin_id = so.legacy_id)) AND (fe.origin_type = 'sales_order'::text))) fin ON (true))
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS load_count,
            COALESCE(sum((ol.unload_weight_kg / 60.0)), (0)::numeric) AS delivered_qty_sc,
            COALESCE(sum(((ol.unload_weight_kg / 60.0) * COALESCE(((ol.metadata ->> 'salesPrice'::text))::numeric, ((so.metadata ->> 'unitPrice'::text))::numeric, (0)::numeric))), (0)::numeric) AS delivered_value,
            COALESCE(sum(((ol.unload_weight_kg / 60.0) * COALESCE(((ol.metadata ->> 'purchasePricePerSc'::text))::numeric, (0)::numeric))), (0)::numeric) AS total_grain_cost,
            COALESCE(sum(((ol.unload_weight_kg / 1000.0) * COALESCE(((ol.metadata ->> 'freightPricePerTon'::text))::numeric, (0)::numeric))), (0)::numeric) AS total_freight_cost,
            COALESCE(sum((((ol.unload_weight_kg / 60.0) * COALESCE(((ol.metadata ->> 'purchasePricePerSc'::text))::numeric, (0)::numeric)) + ((ol.unload_weight_kg / 1000.0) * COALESCE(((ol.metadata ->> 'freightPricePerTon'::text))::numeric, (0)::numeric)))), (0)::numeric) AS total_direct_investment
           FROM ops_loadings ol
          WHERE (((ol.sales_order_id = so.id) OR (ol.sales_order_id = so.legacy_id)) AND (COALESCE(ol.unload_weight_kg, (0)::numeric) > (0)::numeric) AND (ol.status <> 'canceled'::text))) delivered ON (true))
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS transit_count,
            COALESCE(sum(((ol.weight_kg / 60.0) * COALESCE(((ol.metadata ->> 'salesPrice'::text))::numeric, ((so.metadata ->> 'unitPrice'::text))::numeric, (0)::numeric))), (0)::numeric) AS transit_value
           FROM ops_loadings ol
          WHERE (((ol.sales_order_id = so.id) OR (ol.sales_order_id = so.legacy_id)) AND (COALESCE(ol.unload_weight_kg, (0)::numeric) = (0)::numeric) AND (ol.status = ANY (ARRAY['loaded'::text, 'in_transit'::text, 'redirected'::text, 'waiting_unload'::text])))) transit ON (true));

-- 6. Update rpc_ops_sales_order_upsert_v2 to handle consultant_name column
CREATE OR REPLACE FUNCTION public.rpc_ops_sales_order_upsert_v2(
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_id UUID;
  v_order_date DATE;
  v_legacy_id UUID;
  v_consultant_name TEXT;
BEGIN
  v_company_id := public.fn_ops_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  v_legacy_id := NULLIF(p_payload->>'id', '')::UUID;
  v_order_date := COALESCE(NULLIF(p_payload->>'date', '')::DATE, CURRENT_DATE);

  -- Extract and normalize consultant name
  v_consultant_name := NULLIF(p_payload->>'consultantName', '');
  IF v_consultant_name = 'Ronaldo Silva' THEN
    v_consultant_name := 'Ronaldo Silva de Oliveira';
  END IF;

  SELECT id INTO v_id
  FROM public.ops_sales_orders
  WHERE company_id = v_company_id
    AND legacy_id = v_legacy_id
  LIMIT 1;

  IF v_id IS NULL THEN
    v_id := COALESCE(v_legacy_id, gen_random_uuid());
  END IF;

  INSERT INTO public.ops_sales_orders (
    id, company_id, legacy_id, number, order_date, status,
    customer_id, customer_name, consultant_name, total_value, received_value, metadata, raw_payload
  ) VALUES (
    v_id,
    v_company_id,
    v_legacy_id,
    COALESCE(NULLIF(p_payload->>'number', ''), 'SEM-NUMERO'),
    v_order_date,
    COALESCE(NULLIF(p_payload->>'status', ''), 'pending'),
    NULLIF(p_payload->>'customerId', '')::UUID,
    NULLIF(p_payload->>'customerName', ''),
    v_consultant_name,
    COALESCE((p_payload->>'totalValue')::NUMERIC, 0),
    COALESCE((p_payload->>'paidValue')::NUMERIC, 0),
    COALESCE(p_payload, '{}'::jsonb),
    COALESCE(p_payload, '{}'::jsonb)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    number = EXCLUDED.number,
    order_date = EXCLUDED.order_date,
    status = EXCLUDED.status,
    customer_id = EXCLUDED.customer_id,
    customer_name = EXCLUDED.customer_name,
    consultant_name = EXCLUDED.consultant_name,
    total_value = EXCLUDED.total_value,
    received_value = EXCLUDED.received_value,
    metadata = EXCLUDED.metadata,
    raw_payload = EXCLUDED.raw_payload,
    updated_at = now();

  PERFORM public.rpc_ops_sales_rebuild_financial_v1(COALESCE(v_legacy_id, v_id));

  RETURN v_id;
End;
$$;

-- 7. Update rpc_monthly_balance_sheet with dynamic loan calculations (retroactively adjusting for future reinforcements)
CREATE OR REPLACE FUNCTION public.rpc_monthly_balance_sheet(p_company_id uuid, p_year integer, p_month integer)
 RETURNS json
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
  v_asset_sales_receivable   NUMERIC := 0;
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
  -- Validar que o caller pertence à empresa
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

  -- A) SALDOS BANCÁRIOS (respeitando data de implantação)
  WITH active_accounts AS (
    SELECT a.id
    FROM accounts a
    WHERE a.company_id = p_company_id
      AND a.is_active = true
  ),
  initial_vals AS (
    SELECT
      ib.account_id,
      COALESCE(SUM(ib.value), 0) AS init_value,
      MIN(ib.date) AS init_date
    FROM initial_balances ib
    WHERE ib.company_id = p_company_id
      AND ib.account_id IN (SELECT id FROM active_accounts)
    GROUP BY ib.account_id
  ),
  tx_before_month AS (
    SELECT
      ft.account_id,
      SUM(
        CASE
          WHEN lower(ft.type) IN ('credit', 'in') THEN ft.amount
          WHEN lower(ft.type) IN ('debit', 'out') THEN -ft.amount
          ELSE 0
        END
      ) AS net_before
    FROM financial_transactions ft
    LEFT JOIN initial_vals iv ON iv.account_id = ft.account_id
    WHERE ft.company_id = p_company_id
      AND ft.transaction_date < v_start_of_month
      AND ft.transaction_date >= COALESCE(iv.init_date, '1900-01-01'::date)
      AND ft.account_id IN (SELECT id FROM active_accounts)
    GROUP BY ft.account_id
  ),
  tx_in_month AS (
    SELECT
      ft.account_id,
      SUM(
        CASE
          WHEN lower(ft.type) IN ('credit', 'in') THEN ft.amount
          WHEN lower(ft.type) IN ('debit', 'out') THEN -ft.amount
          ELSE 0
        END
      ) AS net_in_month
    FROM financial_transactions ft
    LEFT JOIN initial_vals iv ON iv.account_id = ft.account_id
    WHERE ft.company_id = p_company_id
      AND ft.transaction_date >= v_start_of_month
      AND ft.transaction_date <= v_end_of_month
      AND ft.transaction_date >= COALESCE(iv.init_date, '1900-01-01'::date)
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

  -- B) ATIVOS
  -- Recebíveis de Vendas (pendentes no final do mês selecionado)
  SELECT COALESCE(SUM(
    fe.total_amount - COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE ft.entry_id = fe.id
        AND ft.transaction_date <= v_end_of_month
    ), 0)
  ), 0)
  INTO v_pending_sales_receipts
  FROM public.financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'receivable'
    AND fe.origin_type = 'sales_order'
    AND fe.status NOT IN ('cancelled', 'canceled')
    AND fe.created_date <= v_end_of_month
    AND fe.total_amount > COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE ft.entry_id = fe.id
        AND ft.transaction_date <= v_end_of_month
    ), 0);

  -- Mercadoria em Trânsito (carregada até v_end_of_month, mas não descarregada até v_end_of_month)
  SELECT COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0)
  INTO v_merchandise_in_transit
  FROM public.ops_loadings l
  WHERE l.company_id = p_company_id
    AND l.loading_date <= v_end_of_month
    AND l.status NOT IN ('cancelled', 'canceled')
    AND NOT EXISTS (
      SELECT 1 
      FROM public.ops_sales_order_unloads u 
      WHERE u.loading_id = l.id
        AND u.unload_date <= v_end_of_month
    );

  -- Patrimônio (Bens Ativos no final do mês selecionado)
  SELECT COALESCE(SUM(a.acquisition_value), 0)
  INTO v_total_fixed_assets
  FROM public.assets a
  WHERE a.company_id = p_company_id
    AND a.acquisition_date <= v_end_of_month
    AND (a.status = 'active' OR a.write_off_date > v_end_of_month);

  -- Vendas de Bens (a Receber no final do mês selecionado)
  SELECT COALESCE(SUM(original_value - COALESCE(paid_value, 0) - COALESCE(discount_value, 0)), 0)
  INTO v_asset_sales_receivable
  FROM public.admin_expenses
  WHERE company_id = p_company_id
    AND asset_id IS NOT NULL
    AND status NOT IN ('cancelled', 'canceled')
    AND expense_date <= v_end_of_month;

  -- Haveres e Obrigações com Sócios (Posição retroativa calculada a partir de transações históricas)
  WITH shareholder_balances_at AS (
    SELECT 
      s.id,
      COALESCE((
        SELECT SUM(
          CASE
            WHEN st.type = 'credit' THEN st.value
            WHEN st.type = 'debit' THEN -st.value
            ELSE 0
          END
        )
        FROM public.shareholder_transactions st
        WHERE st.shareholder_id = s.id
          AND st.date <= v_end_of_month
      ), 0) AS balance_at
    FROM public.shareholders s
    WHERE s.company_id = p_company_id
  )
  SELECT 
    COALESCE(SUM(CASE WHEN balance_at < 0 THEN ABS(balance_at) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN balance_at > 0 THEN balance_at ELSE 0 END), 0)
  INTO v_shareholder_receivables, v_shareholder_payables
  FROM shareholder_balances_at;

  -- Empréstimos Concedidos (Principal - Pagamentos recebidos até v_end_of_month)
  -- NOTA: O principal_amount é dinamicamente ajustado excluindo reforços futuros (> v_end_of_month)
  SELECT COALESCE(SUM(
    (l.principal_amount - COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE (ft.metadata->>'loan_id')::uuid = l.id
        AND (ft.metadata->>'is_reinforcement')::boolean = true
        AND ft.transaction_date > v_end_of_month
    ), 0)) - COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE (ft.metadata->>'loan_id')::uuid = l.id
        AND ft.type = 'credit'
        AND ft.transaction_date <= v_end_of_month
    ), 0)
  ), 0)
  INTO v_loans_granted
  FROM public.loans l
  WHERE l.company_id = p_company_id
    AND l.type = 'granted'
    AND l.status <> 'cancelled'
    AND l.start_date <= v_end_of_month
    AND (
      l.principal_amount - COALESCE((
        SELECT SUM(ft.amount)
        FROM public.financial_transactions ft
        WHERE (ft.metadata->>'loan_id')::uuid = l.id
          AND (ft.metadata->>'is_reinforcement')::boolean = true
          AND ft.transaction_date > v_end_of_month
      ), 0)
    ) > COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE (ft.metadata->>'loan_id')::uuid = l.id
        AND ft.type = 'credit'
        AND ft.transaction_date <= v_end_of_month
    ), 0);

  -- Adiantamentos Concedidos (Restantes no final do mês selecionado)
  SELECT COALESCE(SUM(
    a.amount - COALESCE((
      SELECT SUM(child.amount)
      FROM public.advances child
      WHERE child.parent_id = a.id
        AND child.status = 'settled'
        AND child.advance_date <= v_end_of_month
    ), 0)
  ), 0)
  INTO v_advances_given
  FROM public.advances a
  WHERE a.company_id = p_company_id
    AND a.parent_id IS NULL
    AND a.recipient_type IN ('supplier', 'shareholder')
    AND a.status <> 'cancelled'
    AND a.advance_date <= v_end_of_month
    AND a.amount > COALESCE((
      SELECT SUM(child.amount)
      FROM public.advances child
      WHERE child.parent_id = a.id
        AND child.status = 'settled'
        AND child.advance_date <= v_end_of_month
    ), 0);

  v_total_assets := v_total_bank_balance + v_pending_sales_receipts
    + v_merchandise_in_transit + v_total_fixed_assets + v_asset_sales_receivable
    + v_shareholder_receivables + v_loans_granted + v_advances_given;

  -- C) PASSIVOS
  -- Fornecedores (Grãos) (pendentes no final do mês selecionado)
  SELECT COALESCE(SUM(
    fe.total_amount - COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE ft.entry_id = fe.id
        AND ft.transaction_date <= v_end_of_month
    ), 0)
  ), 0)
  INTO v_pending_purchase_payments
  FROM public.financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.origin_type = 'purchase_order'
    AND fe.status NOT IN ('paid', 'cancelled', 'canceled')
    AND fe.created_date <= v_end_of_month
    AND fe.total_amount > COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE ft.entry_id = fe.id
        AND ft.transaction_date <= v_end_of_month
    ), 0);

  -- Fretes a Pagar (pendentes no final do mês selecionado)
  SELECT COALESCE(SUM(
    fe.total_amount - COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE ft.entry_id = fe.id
        AND ft.transaction_date <= v_end_of_month
    ), 0)
  ), 0)
  INTO v_pending_freight_payments
  FROM public.financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.origin_type = 'freight'
    AND fe.status NOT IN ('paid', 'cancelled', 'canceled')
    AND fe.created_date <= v_end_of_month
    AND fe.total_amount > COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE ft.entry_id = fe.id
        AND ft.transaction_date <= v_end_of_month
    ), 0);

  -- Comissões a Pagar (pendentes no final do mês selecionado)
  SELECT COALESCE(SUM(
    fe.total_amount - COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE ft.entry_id = fe.id
        AND ft.transaction_date <= v_end_of_month
    ), 0)
  ), 0)
  INTO v_commissions_to_pay
  FROM public.financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.origin_type = 'commission'
    AND fe.status NOT IN ('paid', 'cancelled', 'canceled')
    AND fe.created_date <= v_end_of_month
    AND fe.total_amount > COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE ft.entry_id = fe.id
        AND ft.transaction_date <= v_end_of_month
    ), 0);

  -- Empréstimos Tomados (Principal - Pagamentos efetuados até v_end_of_month)
  -- NOTA: O principal_amount é dinamicamente ajustado excluindo reforços futuros (> v_end_of_month)
  SELECT COALESCE(SUM(
    (l.principal_amount - COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE (ft.metadata->>'loan_id')::uuid = l.id
        AND (ft.metadata->>'is_reinforcement')::boolean = true
        AND ft.transaction_date > v_end_of_month
    ), 0)) - COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE (ft.metadata->>'loan_id')::uuid = l.id
        AND ft.type = 'debit'
        AND ft.transaction_date <= v_end_of_month
    ), 0)
  ), 0)
  INTO v_loans_taken
  FROM public.loans l
  WHERE l.company_id = p_company_id
    AND l.type = 'taken'
    AND l.status <> 'cancelled'
    AND l.start_date <= v_end_of_month
    AND (
      l.principal_amount - COALESCE((
        SELECT SUM(ft.amount)
        FROM public.financial_transactions ft
        WHERE (ft.metadata->>'loan_id')::uuid = l.id
          AND (ft.metadata->>'is_reinforcement')::boolean = true
          AND ft.transaction_date > v_end_of_month
      ), 0)
    ) > COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE (ft.metadata->>'loan_id')::uuid = l.id
        AND ft.type = 'debit'
        AND ft.transaction_date <= v_end_of_month
    ), 0);

  -- Adiantamento de Clientes (Restantes no final do mês selecionado)
  SELECT COALESCE(SUM(
    a.amount - COALESCE((
      SELECT SUM(child.amount)
      FROM public.advances child
      WHERE child.parent_id = a.id
        AND child.status = 'settled'
        AND child.advance_date <= v_end_of_month
    ), 0)
  ), 0)
  INTO v_advances_taken
  FROM public.advances a
  WHERE a.company_id = p_company_id
    AND a.parent_id IS NULL
    AND a.recipient_type = 'client'
    AND a.status <> 'cancelled'
    AND a.advance_date <= v_end_of_month
    AND a.amount > COALESCE((
      SELECT SUM(child.amount)
      FROM public.advances child
      WHERE child.parent_id = a.id
        AND child.status = 'settled'
        AND child.advance_date <= v_end_of_month
    ), 0);

  v_total_liabilities := v_pending_purchase_payments + v_pending_freight_payments
    + v_commissions_to_pay + v_loans_taken + v_advances_taken + v_shareholder_payables;

  -- D) RESULTADO
  v_net_balance := v_total_assets - v_total_liabilities;

  result := json_build_object(
    'monthKey',                  to_char(v_start_of_month, 'YYYY-MM'),
    'monthLabel',                v_month_label,
    'referenceDate',             v_end_of_month,

    'bankBalances',              COALESCE(v_bank_balances, '[]'::json),
    'totalBankBalance',          v_total_bank_balance,
    'totalInitialBalance',       v_total_initial_balance,

    'pendingSalesReceipts',      v_pending_sales_receipts,
    'merchandiseInTransitValue', v_merchandise_in_transit,
    'totalFixedAssetsValue',     v_total_fixed_assets,
    'assetSalesReceivable',      v_asset_sales_receivable,
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
