-- ============================================================================
-- FIX: Filtros de Status no Dashboard
-- Objetivo: Alinhar o Dashboard com os labels de status reais (pending, partially_paid)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_dashboard_data(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result json;
    v_today date := CURRENT_DATE;
    v_total_bank numeric;
    v_total_payables numeric;
    v_total_receivables numeric;
    v_total_fixed_assets numeric;
    v_total_inventory numeric;
    v_operational json;
    v_chart json;
    v_history json;
    v_growth_percent numeric;
    v_current_net_worth numeric;
BEGIN
    -- 1. SALDO BANCÁRIO
    SELECT COALESCE(SUM(balance), 0) INTO v_total_bank
    FROM public.accounts
    WHERE company_id = p_company_id;

    -- 2. CONTAS A PAGAR (FIX: Agora usa NOT IN para incluir partially_paid)
    SELECT COALESCE(SUM(remaining_amount), 0) INTO v_total_payables
    FROM public.financial_entries
    WHERE company_id = p_company_id 
      AND type = 'payable' 
      AND LOWER(status) NOT IN ('paid', 'cancelled', 'reversed');

    -- 3. CONTAS A RECEBER (FIX: Agora usa NOT IN para incluir partially_paid)
    SELECT COALESCE(SUM(remaining_amount), 0) INTO v_total_receivables
    FROM public.financial_entries
    WHERE company_id = p_company_id 
      AND type = 'receivable' 
      AND LOWER(status) NOT IN ('paid', 'cancelled', 'reversed');

    -- 4. ATIVOS IMOBILIZADOS
    SELECT COALESCE(SUM(acquisition_value), 0) INTO v_total_fixed_assets
    FROM public.assets
    WHERE company_id = p_company_id AND (status IS NULL OR LOWER(status) NOT IN ('sold', 'written_off'));

    -- 5. MERCADORIA EM TRÂNSITO (ESTOQUE)
    SELECT COALESCE(SUM(total_sales_value), 0) INTO v_total_inventory
    FROM public.ops_loadings ol
    WHERE ol.company_id = p_company_id 
      AND LOWER(ol.status) NOT IN ('finished', 'completed', 'unloaded', 'canceled', 'cancelado', 'descarregado', 'finalizado')
      AND ol.unload_weight_kg IS NULL 
      AND NOT EXISTS (
          SELECT 1 FROM public.financial_entries fe 
          WHERE fe.origin_id = ol.id 
            AND fe.type = 'receivable'
      );

    -- 6. PATRIMÔNIO LÍQUIDO ATUAL
    v_current_net_worth := v_total_bank + v_total_receivables + v_total_fixed_assets + v_total_inventory - v_total_payables;

    -- 7. OPERACIONAL (ÚLTIMOS 30 DIAS)
    SELECT json_build_object(
        'ordersLast30Days', COUNT(*),
        'volumeSc', COALESCE(SUM(weight_kg / 60.0), 0),
        'volumeTon', COALESCE(SUM(weight_kg / 1000.0), 0),
        'avgPurchasePrice', COALESCE(AVG(total_purchase_value / NULLIF(weight_kg / 60.0, 0)), 0),
        'avgSalesPrice', COALESCE(AVG(total_sales_value / NULLIF(weight_kg / 60.0, 0)), 0),
        'avgFreightPriceTon', COALESCE(AVG(total_freight_value / NULLIF(weight_kg / 1000.0, 0)), 0),
        'avgCostPerSc', COALESCE(AVG((total_purchase_value + total_freight_value) / NULLIF(weight_kg / 60.0, 0)), 0),
        'avgProfitPerSc', COALESCE(AVG((total_sales_value - total_purchase_value - total_freight_value) / NULLIF(weight_kg / 60.0, 0)), 0)
    ) INTO v_operational
    FROM public.ops_loadings
    WHERE company_id = p_company_id AND created_at >= (NOW() - INTERVAL '30 days') AND status != 'canceled';

    -- 8. GRÁFICO (EVOLUÇÃO MENSAL)
    WITH months AS (
        SELECT date_trunc('month', m)::date as month_start
        FROM generate_series(date_trunc('month', v_today - INTERVAL '2 months'), date_trunc('month', v_today), INTERVAL '1 month') m
    )
    SELECT json_agg(json_build_object(
        'name', (
          CASE to_char(mg.month_start, 'Mon')
            WHEN 'Jan' THEN 'Jan' WHEN 'Feb' THEN 'Fev' WHEN 'Mar' THEN 'Mar'
            WHEN 'Apr' THEN 'Abr' WHEN 'May' THEN 'Mai' WHEN 'Jun' THEN 'Jun'
            WHEN 'Jul' THEN 'Jul' WHEN 'Aug' THEN 'Ago' WHEN 'Sep' THEN 'Set'
            WHEN 'Oct' THEN 'Out' WHEN 'Nov' THEN 'Nov' WHEN 'Dec' THEN 'Dez'
            ELSE to_char(mg.month_start, 'Mon')
          END || to_char(mg.month_start, '/YY')
        ),
        'revenue', COALESCE((SELECT SUM(total_amount) FROM financial_entries WHERE company_id = p_company_id AND type = 'receivable' AND date_trunc('month', created_date) = mg.month_start), 0),
        'expense', COALESCE((SELECT SUM(total_amount) FROM financial_entries WHERE company_id = p_company_id AND type = 'payable' AND date_trunc('month', created_date) = mg.month_start), 0),
        'avgPurchasePrice', COALESCE((SELECT AVG(total_purchase_value / NULLIF(weight_kg / 60.0, 0)) FROM ops_loadings WHERE company_id = p_company_id AND date_trunc('month', created_at) = mg.month_start), 0),
        'avgSalesPrice', COALESCE((SELECT AVG(total_sales_value / NULLIF(weight_kg / 60.0, 0)) FROM ops_loadings WHERE company_id = p_company_id AND date_trunc('month', created_at) = mg.month_start), 0)
    )) INTO v_chart
    FROM months mg;

    -- 9. HISTÓRICO DE PATRIMÔNIO (6 MESES)
    WITH months_6 AS (
        SELECT date_trunc('month', m)::date as month_start, (date_trunc('month', m) + INTERVAL '1 month' - INTERVAL '1 day')::date as month_end
        FROM generate_series(date_trunc('month', v_today - INTERVAL '5 months'), date_trunc('month', v_today), INTERVAL '1 month') m
    ),
    snapshots AS (
        SELECT 
            m6.month_start,
            (
                CASE to_char(m6.month_start, 'Mon')
                    WHEN 'Jan' THEN 'Jan' WHEN 'Feb' THEN 'Fev' WHEN 'Mar' THEN 'Mar'
                    WHEN 'Apr' THEN 'Abr' WHEN 'May' THEN 'Mai' WHEN 'Jun' THEN 'Jun'
                    WHEN 'Jul' THEN 'Jul' WHEN 'Aug' THEN 'Ago' WHEN 'Sep' THEN 'Set'
                    WHEN 'Oct' THEN 'Out' WHEN 'Nov' THEN 'Nov' WHEN 'Dec' THEN 'Dez'
                    ELSE to_char(m6.month_start, 'Mon')
                END || to_char(m6.month_start, '/YY')
            ) as name,
            COALESCE((SELECT SUM(amount) FROM financial_transactions WHERE company_id = p_company_id AND type = 'credit' AND transfer_id IS NULL AND date_trunc('month', transaction_date) = m6.month_start), 0) as recebido,
            COALESCE((SELECT SUM(total_amount - COALESCE((SELECT SUM(amount) FROM financial_transactions ft WHERE ft.entry_id = fe.id AND ft.transaction_date <= m6.month_end), 0)) 
                      FROM financial_entries fe WHERE fe.company_id = p_company_id AND fe.type = 'receivable' AND fe.created_date <= m6.month_end AND (fe.paid_date IS NULL OR fe.paid_date > m6.month_end)), 0) as aReceber,
            COALESCE((SELECT SUM(amount) FROM financial_transactions WHERE company_id = p_company_id AND type = 'debit' AND transfer_id IS NULL AND date_trunc('month', transaction_date) = m6.month_start), 0) as pago,
            COALESCE((SELECT SUM(total_amount - COALESCE((SELECT SUM(amount) FROM financial_transactions ft WHERE ft.entry_id = fe.id AND ft.transaction_date <= m6.month_end), 0)) 
                      FROM financial_entries fe WHERE fe.company_id = p_company_id AND fe.type = 'payable' AND fe.created_date <= m6.month_end AND (fe.paid_date IS NULL OR fe.paid_date > m6.month_end)), 0) as aPagar,
            
            (
                (
                  v_total_bank 
                  - COALESCE((SELECT SUM(CASE WHEN type='credit' THEN amount ELSE -amount END) FROM financial_transactions WHERE company_id = p_company_id AND transaction_date > m6.month_end), 0)
                  - COALESCE((SELECT SUM(value) FROM initial_balances WHERE company_id = p_company_id AND date > m6.month_end), 0)
                )
                + COALESCE((SELECT SUM(total_amount - COALESCE((SELECT SUM(amount) FROM financial_transactions ft WHERE ft.entry_id = fe.id AND ft.transaction_date <= m6.month_end), 0)) 
                           FROM financial_entries fe WHERE fe.company_id = p_company_id AND fe.type = 'receivable' AND fe.created_date <= m6.month_end AND (fe.paid_date IS NULL OR fe.paid_date > m6.month_end)), 0)
                + COALESCE((SELECT SUM(acquisition_value) FROM assets WHERE company_id = p_company_id AND acquisition_date <= m6.month_end AND (sale_date IS NULL OR sale_date > m6.month_end)), 0)
                + COALESCE((SELECT SUM(total_sales_value) FROM ops_loadings ol WHERE ol.company_id = p_company_id AND ol.created_at::date <= m6.month_end AND ol.status != 'canceled' AND (ol.unload_weight_kg IS NULL OR (SELECT created_date FROM financial_entries WHERE origin_id = ol.id AND type='receivable' LIMIT 1) > m6.month_end)), 0)
                - COALESCE((SELECT SUM(total_amount - COALESCE((SELECT SUM(amount) FROM financial_transactions ft WHERE ft.entry_id = fe.id AND ft.transaction_date <= m6.month_end), 0)) 
                           FROM financial_entries fe WHERE fe.company_id = p_company_id AND fe.type = 'payable' AND fe.created_date <= m6.month_end AND (fe.paid_date IS NULL OR fe.paid_date > m6.month_end)), 0)
            ) as netWorth
        FROM months_6 m6
    ),
    history_with_growth AS (
        SELECT 
            *,
            CASE 
                WHEN LAG(netWorth) OVER (ORDER BY month_start) = 0 AND netWorth > 0 THEN 100.0
                WHEN LAG(netWorth) OVER (ORDER BY month_start) = 0 AND netWorth = 0 THEN 0.0
                ELSE ((netWorth - LAG(netWorth) OVER (ORDER BY month_start)) / NULLIF(LAG(netWorth) OVER (ORDER BY month_start), 0)) * 100.0
            END as monthlyChange
        FROM snapshots
    )
    SELECT json_agg(json_build_object(
        'name', h.name,
        'recebido', h.recebido,
        'aReceber', h.aReceber,
        'pago', h.pago,
        'aPagar', h.aPagar,
        'netWorth', h.netWorth,
        'monthlyChange', h.monthlyChange
    )) INTO v_history
    FROM history_with_growth h;

    -- 10. CRESCIMENTO PERCENTUAL
    SELECT 
        CASE 
            WHEN first_nw = 0 AND last_nw > 0 THEN 100.0
            WHEN first_nw = 0 AND last_nw = 0 THEN 0.0
            ELSE ((last_nw - first_nw) / NULLIF(first_nw, 0)) * 100.0
        END INTO v_growth_percent
    FROM (
        SELECT 
            (v_history->0->>'netWorth')::numeric as first_nw, 
            (v_history->(json_array_length(v_history)-1)->>'netWorth')::numeric as last_nw
    ) growth;

    -- 11. MONTAGEM DO RESULTADO FINAL
    SELECT json_build_object(
        'operational', v_operational,
        'financialPending', json_build_object(
            'receivables', COALESCE((SELECT json_agg(t) FROM (SELECT * FROM financial_entries WHERE company_id = p_company_id AND type = 'receivable' AND LOWER(status) NOT IN ('paid', 'cancelled') ORDER BY due_date ASC LIMIT 5) t), '[]'),
            'tradePayables', COALESCE((SELECT json_agg(t) FROM (SELECT * FROM financial_entries WHERE company_id = p_company_id AND type = 'payable' AND LOWER(status) NOT IN ('paid', 'cancelled') ORDER BY due_date ASC LIMIT 5) t), '[]'),
            'expenses', '[]'::json
        ),
        'financial', json_build_object(
            'totalBankBalance', v_total_bank,
            'totalLiabilities', v_total_payables,
            'pendingSalesReceipts', v_total_receivables,
            'merchandiseInTransitValue', v_total_inventory,
            'totalAssets', v_total_bank + v_total_receivables + v_total_fixed_assets + v_total_inventory,
            'netWorth', v_current_net_worth
        ),
        'chart', v_chart,
        'netWorth', json_build_object('history', v_history, 'growthPercent', COALESCE(v_growth_percent, 0))
    ) INTO v_result;

    RETURN v_result;
END;
$function$;
