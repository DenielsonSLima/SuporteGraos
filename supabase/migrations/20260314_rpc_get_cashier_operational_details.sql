-- ============================================================================
-- Migration: Specialized Cashier RPC - Part 4: Operational Details
-- Description: Calcula detalhadamente o card "FLUXO OPERACIONAL DO MÊS"
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_get_cashier_operational_details(
  p_company_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  
  v_month_purchased_total NUMERIC := 0;
  v_month_sold_total NUMERIC := 0;
  v_month_paid_total NUMERIC := 0;
  v_month_purchases_paid_total NUMERIC := 0; -- NOVO
  v_month_freight_paid_total NUMERIC := 0;
  v_month_expenses_paid_total NUMERIC := 0;
  v_month_refused_total NUMERIC := 0;
  v_month_operational_spread NUMERIC := 0;
  v_month_direct_diff NUMERIC := 0;
  
  v_expense_distribution JSONB := '{}'::jsonb;
BEGIN
  v_start_date := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE)::DATE);
  v_end_date := COALESCE(p_end_date, (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::DATE);

  -- 1. Valor Comprado (Entradas Payable/PO Criadas no Período)
  SELECT COALESCE(SUM(fe.total_amount), 0)
  INTO v_month_purchased_total
  FROM public.financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.origin_type = 'purchase_order'
    AND fe.created_date >= v_start_date
    AND fe.created_date <= v_end_date;

  -- 2. Valor Vendido (Romaneios Descarregados no Período)
  IF to_regclass('public.ops_loadings') IS NOT NULL THEN
    SELECT COALESCE(SUM(l.total_sales_value), 0)
    INTO v_month_sold_total
    FROM public.ops_loadings l
    WHERE l.company_id = p_company_id
      AND l.status = 'unloaded'
      AND l.loading_date >= v_start_date
      AND l.loading_date <= v_end_date;
  END IF;

  -- 3. Valor Pago Total (Débitos no Período - EXCLUINDO TRANSFERÊNCIAS)
  SELECT COALESCE(SUM(ft.amount), 0)
  INTO v_month_paid_total
  FROM public.financial_transactions ft
  WHERE ft.company_id = p_company_id
    AND ft.type IN ('debit', 'OUT', 'out', 'DEBIT')
    AND ft.transfer_id IS NULL -- EXCLUINDO TRANSFERÊNCIAS
    AND ft.transaction_date >= v_start_date
    AND ft.transaction_date <= v_end_date;

  -- 4. Detalhamento de Saídas (Compras, Fretes e Despesas)
  SELECT 
    COALESCE(SUM(CASE WHEN fe.origin_type = 'purchase_order' THEN ft.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fe.origin_type = 'freight' THEN ft.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fe.origin_type = 'expense' THEN ft.amount ELSE 0 END), 0)
  INTO v_month_purchases_paid_total, v_month_freight_paid_total, v_month_expenses_paid_total
  FROM public.financial_transactions ft
  JOIN public.financial_entries fe ON ft.entry_id = fe.id
  WHERE ft.company_id = p_company_id
    AND ft.type IN ('debit', 'OUT', 'out', 'DEBIT')
    AND ft.transaction_date >= v_start_date
    AND ft.transaction_date <= v_end_date;

  -- 5. Cálculos
  v_month_operational_spread := v_month_sold_total - v_month_purchased_total;
  v_month_direct_diff := v_month_paid_total - v_month_purchased_total;

  -- 6. Distribuição de Despesas
  SELECT json_build_object(
    'purchases', COALESCE(SUM(CASE WHEN fe.origin_type = 'purchase_order' THEN ft.amount ELSE 0 END), 0),
    'freight', COALESCE(SUM(CASE WHEN fe.origin_type = 'freight' THEN ft.amount ELSE 0 END), 0),
    'expenses', COALESCE(SUM(CASE WHEN fe.origin_type = 'expense' THEN ft.amount ELSE 0 END), 0),
    'others', COALESCE(SUM(CASE WHEN fe.origin_type NOT IN ('purchase_order', 'freight', 'expense') OR fe.id IS NULL THEN ft.amount ELSE 0 END), 0)
  )
  INTO v_expense_distribution
  FROM public.financial_transactions ft
  LEFT JOIN public.financial_entries fe ON ft.entry_id = fe.id
  WHERE ft.company_id = p_company_id
    AND ft.type IN ('debit', 'OUT', 'out', 'DEBIT')
    AND ft.transfer_id IS NULL -- EXCLUINDO TRANSFERÊNCIAS
    AND ft.transaction_date >= v_start_date
    AND ft.transaction_date <= v_end_date;

  RETURN jsonb_build_object(
    'monthPurchasedTotal', v_month_purchased_total,
    'monthSoldTotal', v_month_sold_total,
    'monthPaidTotal', v_month_paid_total,
    'monthPurchasesPaidTotal', v_month_purchases_paid_total,
    'monthFreightPaidTotal', v_month_freight_paid_total,
    'monthRefusedTotal', v_month_refused_total,
    'monthExpensesPaidTotal', v_month_expenses_paid_total,
    'monthDirectDiff', v_month_direct_diff,
    'monthOperationalSpread', v_month_operational_spread,
    'expenseDistribution', v_expense_distribution
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_cashier_operational_details(UUID, DATE, DATE) TO authenticated, anon;
