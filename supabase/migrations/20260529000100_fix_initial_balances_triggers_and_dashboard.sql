-- ============================================================================
-- 📊 MIGRATION: 20260529000100_fix_initial_balances_triggers_and_dashboard.sql
-- Objetivo: Corrigir triggers de saldo de contas bancárias e alinhar o histórico
--           de evolução patrimonial e balanço mensal com a lógica de implantação.
-- ============================================================================

SET search_path = public;

-- 1. Criar a função de trigger dedicada para a tabela initial_balances
CREATE OR REPLACE FUNCTION public.fn_update_account_balance_on_initial_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_account_id UUID;
BEGIN
  v_company_id := COALESCE(NEW.company_id, OLD.company_id);
  v_account_id := COALESCE(NEW.account_id, OLD.account_id);

  IF v_account_id IS NOT NULL THEN
    PERFORM public.fn_update_account_balance_by_id(v_account_id, v_company_id);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Associar a trigger à tabela initial_balances
DROP TRIGGER IF EXISTS trg_initial_balances_recalc_account_balance ON public.initial_balances;

CREATE TRIGGER trg_initial_balances_recalc_account_balance
AFTER INSERT OR UPDATE OR DELETE ON public.initial_balances
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_account_balance_on_initial_balance();

-- 3. Atualizar a trigger de financial_transactions para delegar para fn_update_account_balance_by_id
CREATE OR REPLACE FUNCTION public.fn_update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
BEGIN
  v_company_id := COALESCE(NEW.company_id, OLD.company_id);

  IF NEW.account_id IS NOT NULL THEN
    PERFORM public.fn_update_account_balance_by_id(NEW.account_id, v_company_id);
  END IF;

  IF OLD.account_id IS NOT NULL AND (NEW.account_id IS NULL OR NEW.account_id <> OLD.account_id) THEN
    PERFORM public.fn_update_account_balance_by_id(OLD.account_id, v_company_id);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Redefinir a RPC rpc_dashboard_data com a consolidação de saldos bancários e abate de títulos ajustada
CREATE OR REPLACE FUNCTION public.rpc_dashboard_data(p_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_company UUID;
  v_total_bank            NUMERIC := 0;
  v_total_bank_all        NUMERIC := 0;
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
  -- Verificar se o usuário pertence à empresa informada
  SELECT au.company_id INTO v_caller_company
  FROM app_users au
  WHERE au.auth_user_id = (SELECT auth.uid())
  LIMIT 1;

  IF v_caller_company IS NULL OR v_caller_company <> p_company_id THEN
    RAISE EXCEPTION 'Access denied: caller does not belong to company %', p_company_id;
  END IF;

  -- Detectar tabela de carregamentos do tenant
  IF to_regclass('public.logistics_loadings') IS NOT NULL THEN
    v_loading_source := 'public.logistics_loadings';
  ELSIF to_regclass('public.ops_loadings') IS NOT NULL THEN
    v_loading_source := 'public.ops_loadings';
  ELSE
    v_loading_source := NULL;
  END IF;

  -- 1. Saldo Disponível (Apenas contas reais, excluindo virtuais, permitindo saldo negativo)
  SELECT COALESCE(SUM(a.balance), 0) INTO v_total_bank
  FROM accounts a
  WHERE a.company_id = p_company_id 
    AND a.is_active = true
    AND a.id <> '97e8bd30-3ba1-4658-a51e-5df6ce184845'
    AND lower(a.account_name) NOT LIKE '%virtual%'
    AND lower(a.account_name) NOT LIKE '%virtuais%'
    AND lower(a.account_name) NOT LIKE '%ajuste%'
    AND lower(COALESCE(a.owner, '')) NOT LIKE '%virtual%'
    AND lower(COALESCE(a.owner, '')) NOT LIKE '%virtuais%'
    AND lower(COALESCE(a.owner, '')) NOT LIKE '%ajuste%';

  -- Saldo de todas as contas (incluindo virtuais para cálculo correto do Patrimônio Líquido)
  SELECT COALESCE(SUM(a.balance), 0) INTO v_total_bank_all
  FROM accounts a
  WHERE a.company_id = p_company_id AND a.is_active = true;

  -- 2. Recebíveis de Vendas pendentes
  SELECT COALESCE(SUM(GREATEST(COALESCE(fe.total_amount, 0) - COALESCE(fe.paid_amount, 0), 0)), 0)
    INTO v_pending_receivables
  FROM financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'receivable'
    AND COALESCE(fe.origin_type, '') = 'sales_order'
    AND fe.status NOT IN ('paid', 'received', 'cancelled', 'canceled');

  -- 3. Mercadoria em Trânsito
  IF v_loading_source IS NOT NULL THEN
    EXECUTE format($q$
      SELECT COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0)
      FROM %s l
      WHERE l.company_id = $1
        AND COALESCE(l.status, '') IN ('loaded', 'in_transit', 'redirected', 'waiting_unload')
    $q$, v_loading_source) INTO v_merchandise_in_transit USING p_company_id;
  END IF;

  -- 4. Patrimônio (Bens Ativos)
  SELECT COALESCE(SUM(COALESCE(acquisition_value, 0)), 0) INTO v_total_fixed_assets
  FROM assets
  WHERE company_id = p_company_id AND COALESCE(status, 'active') = 'active';

  -- 5. Empréstimos Concedidos e Tomados (Usa a tabela de empréstimos do novo módulo)
  SELECT COALESCE(SUM(principal_amount - paid_amount), 0) INTO v_loans_granted
  FROM public.loans
  WHERE company_id = p_company_id AND type = 'granted' AND status = 'open';

  SELECT COALESCE(SUM(principal_amount - paid_amount), 0) INTO v_loans_taken
  FROM public.loans
  WHERE company_id = p_company_id AND type = 'taken' AND status = 'open';

  -- 6. Adiantamentos Concedidos e Tomados (Apenas pais)
  SELECT 
    COALESCE(SUM(CASE WHEN recipient_type IN ('supplier', 'shareholder') THEN remaining_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN recipient_type = 'client' THEN remaining_amount ELSE 0 END), 0)
    INTO v_advances_given, v_advances_taken
  FROM advances
  WHERE company_id = p_company_id
    AND parent_id IS NULL
    AND status NOT IN ('settled', 'cancelled', 'canceled');

  -- 7. Haveres e Obrigações com Sócios
  SELECT 
    COALESCE(SUM(CASE WHEN current_balance < 0 THEN ABS(current_balance) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END), 0)
    INTO v_shareholder_receivables, v_shareholder_payables
  FROM shareholders
  WHERE company_id = p_company_id;

  -- 8. Contas a Pagar e Comissões
  SELECT 
    COALESCE(SUM(CASE WHEN origin_type IN ('purchase_order', 'freight') THEN (COALESCE(fe.total_amount, 0) - COALESCE(fe.paid_amount, 0)) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN origin_type = 'commission' THEN (COALESCE(fe.total_amount, 0) - COALESCE(fe.paid_amount, 0)) ELSE 0 END), 0)
    INTO v_pending_payables, v_commissions_to_pay
  FROM financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.status NOT IN ('paid', 'received', 'cancelled', 'canceled');

  -- 9. Totais e Patrimônio Líquido
  v_total_assets := v_total_bank_all + v_pending_receivables + v_merchandise_in_transit + v_total_fixed_assets + v_loans_granted + v_advances_given + v_shareholder_receivables;
  v_total_liabilities := v_pending_payables + v_loans_taken + v_commissions_to_pay + v_advances_taken + v_shareholder_payables;
  v_net_worth := v_total_assets - v_total_liabilities;

  -- KPIs operacionais adicionais
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

  -- 10. Histórico de Evolução do Patrimônio Líquido (Consistente com a soma de Ativos e Passivos e com os Empréstimos)
  IF v_loading_source IS NOT NULL THEN
    EXECUTE format($dyn$
      WITH months AS (SELECT generate_series(0, 5) AS i),
      month_grid AS (
        SELECT 
          i, 
          date_trunc('month', (CURRENT_DATE - (i || ' months')::interval))::date AS month_start, 
          (date_trunc('month', (CURRENT_DATE - (i || ' months')::interval)) + interval '1 month - 1 day')::date AS month_end, 
          to_char(date_trunc('month', (CURRENT_DATE - (i || ' months')::interval)), 'Mon') AS month_name 
        FROM months
      ),
      bank_history AS (
        SELECT 
          mg.i, 
          COALESCE(SUM(
            CASE 
              WHEN COALESCE(iv.init_date, '1900-01-01'::date) <= mg.month_end THEN
                COALESCE(iv.init_value, 0) + 
                COALESCE((
                  SELECT SUM(
                    CASE 
                      WHEN lower(ft.type) IN ('in', 'credit') THEN ft.amount 
                      WHEN lower(ft.type) IN ('out', 'debit') THEN -ft.amount 
                      ELSE 0 
                    END
                  )
                  FROM public.financial_transactions ft
                  WHERE ft.company_id = $1
                    AND ft.account_id = a.id
                    AND ft.transaction_date <= mg.month_end
                    AND ft.transaction_date >= COALESCE(iv.init_date, '1900-01-01'::date)
                ), 0)
              ELSE 0
            END
          ), 0) AS bank_assets
        FROM month_grid mg
        CROSS JOIN public.accounts a
        LEFT JOIN (
          SELECT 
            account_id, 
            COALESCE(SUM(value), 0) AS init_value, 
            MIN(date) AS init_date
          FROM public.initial_balances
          WHERE company_id = $1
          GROUP BY account_id
        ) iv ON iv.account_id = a.id
        WHERE a.company_id = $1 
          AND a.is_active = true
        GROUP BY mg.i
      ),
      assets_history AS (SELECT mg.i, COALESCE((SELECT SUM(COALESCE(a.acquisition_value, 0)) FROM assets a WHERE a.company_id = $1 AND a.acquisition_date <= mg.month_end AND (a.status = 'active' OR a.write_off_date > mg.month_end)), 0) AS fixed_assets FROM month_grid mg),
      receivables_history AS (
        SELECT mg.i, 
               COALESCE((SELECT SUM(fe.total_amount) FROM financial_entries fe WHERE fe.company_id = $1 AND fe.type = 'receivable' AND COALESCE(fe.origin_type, '') = 'sales_order' AND COALESCE(fe.status, 'open') NOT IN ('canceled', 'cancelled') AND fe.created_date <= mg.month_end), 0) - 
               COALESCE((SELECT SUM(ft.amount) FROM financial_transactions ft JOIN financial_entries fe ON fe.id = ft.entry_id WHERE fe.company_id = $1 AND fe.type = 'receivable' AND COALESCE(fe.origin_type, '') = 'sales_order' AND COALESCE(fe.status, 'open') NOT IN ('canceled', 'cancelled') AND ft.transaction_date <= mg.month_end), 0) AS pending_receivables 
        FROM month_grid mg
      ),
      payables_history AS (
        SELECT mg.i, 
               COALESCE((SELECT SUM(fe.total_amount) FROM financial_entries fe WHERE fe.company_id = $1 AND fe.type = 'payable' AND COALESCE(fe.origin_type, '') IN ('purchase_order', 'freight', 'commission') AND COALESCE(fe.status, 'open') NOT IN ('canceled', 'cancelled') AND fe.created_date <= mg.month_end), 0) - 
               COALESCE((SELECT SUM(ft.amount) FROM financial_transactions ft JOIN financial_entries fe ON fe.id = ft.entry_id WHERE fe.company_id = $1 AND fe.type = 'payable' AND COALESCE(fe.origin_type, '') IN ('purchase_order', 'freight', 'commission') AND COALESCE(fe.status, 'open') NOT IN ('canceled', 'cancelled') AND ft.transaction_date <= mg.month_end), 0) AS pending_payables 
        FROM month_grid mg
      ),
      transit_history AS (SELECT mg.i, COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0) AS transit_value FROM month_grid mg LEFT JOIN %s l ON l.company_id = $1 AND COALESCE(l.status, '') IN ('loaded', 'in_transit', 'redirected', 'waiting_unload') AND l.loading_date <= mg.month_end GROUP BY mg.i),
      loans_history AS (
        SELECT mg.i,
               COALESCE((
                 SELECT SUM(
                   CASE 
                     WHEN l.type = 'granted' THEN
                       COALESCE((
                         SELECT SUM(
                           CASE 
                             WHEN lower(ft.type) IN ('out', 'debit') OR (ft.metadata->>'is_reinforcement')::boolean = true OR (ft.metadata->>'is_disbursement')::boolean = true THEN ft.amount
                             WHEN lower(ft.type) IN ('in', 'credit') OR (ft.metadata->>'is_payment')::boolean = true THEN -ft.amount
                             ELSE 0
                           END
                         )
                         FROM financial_transactions ft
                         WHERE ft.company_id = $1
                           AND (ft.metadata->>'loan_id') = l.id::text
                           AND ft.transaction_date <= mg.month_end
                       ), 0)
                     ELSE 0
                   END
                 )
                 FROM public.loans l
                 WHERE l.company_id = $1 AND l.start_date <= mg.month_end
               ), 0) AS loans_granted,
               COALESCE((
                 SELECT SUM(
                   CASE 
                     WHEN l.type = 'taken' THEN
                       COALESCE((
                         SELECT SUM(
                           CASE 
                             WHEN lower(ft.type) IN ('in', 'credit') OR (ft.metadata->>'is_disbursement')::boolean = true OR (ft.metadata->>'is_reinforcement')::boolean = true THEN ft.amount
                             WHEN lower(ft.type) IN ('out', 'debit') OR (ft.metadata->>'is_payment')::boolean = true THEN -ft.amount
                             ELSE 0
                           END
                         )
                         FROM financial_transactions ft
                         WHERE ft.company_id = $1
                           AND (ft.metadata->>'loan_id') = l.id::text
                           AND ft.transaction_date <= mg.month_end
                       ), 0)
                     ELSE 0
                   END
                 )
                 FROM public.loans l
                 WHERE l.company_id = $1 AND l.start_date <= mg.month_end
               ), 0) AS loans_taken
        FROM month_grid mg
      ),
      advances_history AS (
        SELECT mg.i,
               COALESCE((
                 SELECT SUM(a.amount - COALESCE((
                   SELECT SUM(amount)
                   FROM public.advances child
                   WHERE child.parent_id = a.id
                     AND child.status = 'settled'
                     AND child.advance_date <= mg.month_end
                 ), 0))
                 FROM public.advances a
                 WHERE a.company_id = $1
                   AND a.parent_id IS NULL
                   AND a.recipient_type IN ('supplier', 'shareholder')
                   AND a.advance_date <= mg.month_end
                   AND a.status NOT IN ('cancelled', 'canceled')
               ), 0) AS advances_given,
               COALESCE((
                 SELECT SUM(a.amount - COALESCE((
                   SELECT SUM(amount)
                   FROM public.advances child
                   WHERE child.parent_id = a.id
                     AND child.status = 'settled'
                     AND child.advance_date <= mg.month_end
                 ), 0))
                 FROM public.advances a
                 WHERE a.company_id = $1
                   AND a.parent_id IS NULL
                   AND a.recipient_type = 'client'
                   AND a.advance_date <= mg.month_end
                   AND a.status NOT IN ('cancelled', 'canceled')
               ), 0) AS advances_taken
        FROM month_grid mg
      ),
      hist AS (
        SELECT mg.i, 
               mg.month_name, 
               COALESCE((SELECT SUM(amount) FROM financial_transactions WHERE company_id = $1 AND lower(type) IN ('in', 'credit') AND transfer_id IS NULL AND date_trunc('month', transaction_date) = mg.month_start), 0) AS recebido,
               GREATEST(rh.pending_receivables, 0) AS a_receber,
               COALESCE((SELECT SUM(amount) FROM financial_transactions WHERE company_id = $1 AND lower(type) IN ('out', 'debit') AND transfer_id IS NULL AND date_trunc('month', transaction_date) = mg.month_start), 0) AS pago,
               GREATEST(ph.pending_payables, 0) AS a_pagar,
               COALESCE(th.transit_value, 0) AS em_transito,
               COALESCE(bh.bank_assets, 0) AS saldo_disponivel,
               GREATEST(bh.bank_assets + rh.pending_receivables + th.transit_value + ah.fixed_assets + lh.loans_granted + adh.advances_given, 0) AS assets, 
               (GREATEST(ph.pending_payables, 0) + lh.loans_taken + adh.advances_taken) AS liabilities, 
               (GREATEST(bh.bank_assets + rh.pending_receivables + th.transit_value + ah.fixed_assets + lh.loans_granted + adh.advances_given, 0) - (GREATEST(ph.pending_payables, 0) + lh.loans_taken + adh.advances_taken)) AS net_worth 
        FROM month_grid mg 
        JOIN bank_history bh ON bh.i = mg.i 
        JOIN receivables_history rh ON rh.i = mg.i 
        JOIN payables_history ph ON ph.i = mg.i 
        JOIN transit_history th ON th.i = mg.i 
        JOIN assets_history ah ON ah.i = mg.i
        JOIN loans_history lh ON lh.i = mg.i
        JOIN advances_history adh ON adh.i = mg.i
      ),
      hist_with_change AS (
        SELECT i, month_name, recebido, a_receber, pago, a_pagar, em_transito, saldo_disponivel, assets, liabilities, net_worth, 
               COALESCE(CASE WHEN LAG(net_worth) OVER (ORDER BY i DESC) = 0 THEN 0 ELSE ((net_worth - LAG(net_worth) OVER (ORDER BY i DESC)) / ABS(LAG(net_worth) OVER (ORDER BY i DESC))) * 100 END, 0) AS monthly_change 
        FROM hist
      )
      SELECT json_agg(json_build_object(
        'name', month_name, 
        'netWorth', net_worth, 
        'assets', assets, 
        'liabilities', liabilities, 
        'recebido', recebido,
        'aReceber', a_receber,
        'pago', pago,
        'aPagar', a_pagar,
        'emTransito', em_transito,
        'saldoDisponivel', saldo_disponivel,
        'monthlyChange', monthly_change
      ) ORDER BY i DESC)
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

  -- 11. Dados do gráfico de receitas e despesas
  WITH month_grid AS (SELECT i, date_trunc('month', (CURRENT_DATE - (i || ' months')::interval))::date AS month_start, to_char(date_trunc('month', (CURRENT_DATE - (i || ' months')::interval)), 'Mon') AS month_name FROM (SELECT generate_series(0, 2) AS i) m),
  tx AS (SELECT date_trunc('month', ft.transaction_date)::date AS month_start, SUM(CASE WHEN lower(ft.type) IN ('in', 'credit') THEN ft.amount ELSE 0 END) AS revenue, SUM(CASE WHEN lower(ft.type) IN ('out', 'debit') THEN ft.amount ELSE 0 END) AS expense FROM financial_transactions ft WHERE ft.company_id = p_company_id AND ft.transaction_date >= date_trunc('month', CURRENT_DATE - interval '2 months') GROUP BY 1)
  SELECT json_agg(json_build_object('name', month_name, 'revenue', COALESCE(tx.revenue, 0), 'expense', COALESCE(tx.expense, 0)) ORDER BY i DESC)
  INTO v_chart FROM month_grid mg LEFT JOIN tx ON tx.month_start = mg.month_start;

  -- 12. Montagem do payload de retorno
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

REVOKE ALL ON FUNCTION public.rpc_dashboard_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_dashboard_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_dashboard_data(UUID) TO service_role;


-- 5. Redefinir a RPC rpc_monthly_balance_sheet com a correção da data de implantação dos saldos
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

  -- A) SALDOS BANCÁRIOS (respeitando data de implantação de cada conta)
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
      CASE 
        WHEN COALESCE(iv.init_date, '1900-01-01'::date) <= v_end_of_month THEN
          COALESCE(iv.init_value, 0) + COALESCE(tbm.net_before, 0)
        ELSE 0
      END AS start_balance,
      CASE 
        WHEN COALESCE(iv.init_date, '1900-01-01'::date) <= v_end_of_month THEN
          COALESCE(iv.init_value, 0) + COALESCE(tbm.net_before, 0) + COALESCE(tim.net_in_month, 0)
        ELSE 0
      END AS end_balance
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

  -- Saldo inicial global (limitando à data final do mês)
  SELECT COALESCE(SUM(ib.value), 0)
  INTO v_total_initial_balance
  FROM initial_balances ib
  WHERE ib.company_id = p_company_id
    AND ib.date <= v_end_of_month;

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
  SELECT COALESCE(SUM(
    l.principal_amount - COALESCE((
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
    AND l.principal_amount > COALESCE((
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
  SELECT COALESCE(SUM(
    l.principal_amount - COALESCE((
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
    AND l.principal_amount > COALESCE((
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


-- 6. Executar recalculo retroativo para todas as contas ativas do sistema
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, company_id FROM public.accounts LOOP
    PERFORM public.fn_update_account_balance_by_id(r.id, r.company_id);
  END LOOP;
END $$;
