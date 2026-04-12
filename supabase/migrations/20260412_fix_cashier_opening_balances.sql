-- Migration: fix(cashier): implement automatic opening balances calculation
-- Date: 2026-04-12

-- 1. Helper function to calculate account balance at a specific date
CREATE OR REPLACE FUNCTION public.fn_get_account_balance_at_date(p_account_id uuid, p_date date)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_initial NUMERIC := 0;
  v_tx_sum NUMERIC := 0;
BEGIN
  -- 1. Pega o valor inicial implantado (se houver)
  SELECT COALESCE(SUM(value), 0) INTO v_initial 
  FROM public.initial_balances 
  WHERE account_id = p_account_id;

  -- 2. Soma as transações antes da data solicitada
  SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) INTO v_tx_sum
  FROM public.financial_transactions
  WHERE account_id = p_account_id AND transaction_date < p_date;

  RETURN v_initial + v_tx_sum;
END;
$function$;

-- 2. RPC to fetch opening balances for a given company and date
CREATE OR REPLACE FUNCTION public.rpc_get_opening_balances(p_company_id uuid, p_date date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_balances JSON;
  v_total NUMERIC := 0;
BEGIN
  WITH balances AS (
    SELECT 
      a.id,
      a.account_name as "bankName",
      a.owner,
      public.fn_get_account_balance_at_date(a.id, p_date) as value
    FROM public.accounts a
    WHERE a.company_id = p_company_id AND a.is_active = true
  )
  SELECT 
    json_agg(b ORDER BY b."bankName"),
    COALESCE(SUM(b.value), 0)
  INTO v_balances, v_total
  FROM balances b
  WHERE b.value <> 0; -- Apenas contas que tinham saldo na data

  RETURN json_build_object(
    'initialMonthBalances', COALESCE(v_balances, '[]'::json),
    'totalInitialMonthBalance', v_total
  );
END;
$function$;

-- 3. Update main cashier report RPC to integrate opening balances
CREATE OR REPLACE FUNCTION public.rpc_cashier_report(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_my_company_id UUID;
  v_bank_balances JSON := '[]'::json;
  v_total_bank_balance NUMERIC := 0;
  v_opening_data JSON;
  v_pending_sales_receipts NUMERIC := 0;
  v_merchandise_in_transit_value NUMERIC := 0;
  v_total_fixed_assets_value NUMERIC := 0;
  v_pending_purchase_payments NUMERIC := 0;
  v_pending_freight_payments NUMERIC := 0;
  v_commissions_to_pay NUMERIC := 0;
  v_total_assets NUMERIC := 0; 
  v_total_liabilities NUMERIC := 0; 
  v_net_balance NUMERIC := 0;
  result JSON;
BEGIN
  v_my_company_id := public.fn_ops_my_company_id();
  IF p_company_id IS DISTINCT FROM v_my_company_id THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  -- 1. SALDOS BANCÁRIOS ATUAIS
  SELECT COALESCE(json_agg(json_build_object('id', a.id, 'bankName', a.account_name, 'owner', a.owner, 'balance', COALESCE(a.balance, 0)) ORDER BY a.account_name), '[]'::json), COALESCE(SUM(a.balance), 0)
  INTO v_bank_balances, v_total_bank_balance FROM public.accounts a WHERE a.company_id = p_company_id AND COALESCE(a.is_active, true) = true;

  -- 2. SALDOS DE ABERTURA DO MÊS (Dia 1 do mês atual)
  v_opening_data := public.rpc_get_opening_balances(p_company_id, date_trunc('month', CURRENT_DATE)::date);

  -- 3. RECEBÍVEIS
  SELECT COALESCE(SUM(fe.remaining_amount), 0) INTO v_pending_sales_receipts FROM public.financial_entries fe
  WHERE fe.company_id = p_company_id AND fe.type = 'receivable' AND COALESCE(fe.origin_type, '') = 'sales_order' AND fe.status NOT IN ('paid', 'cancelled');

  -- 4. OBRIGAÇÕES
  SELECT 
    COALESCE(SUM(CASE WHEN fe.origin_type = 'purchase_order' THEN fe.remaining_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fe.origin_type = 'freight' THEN fe.remaining_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fe.origin_type = 'commission' THEN fe.remaining_amount ELSE 0 END), 0)
  INTO v_pending_purchase_payments, v_pending_freight_payments, v_commissions_to_pay
  FROM public.financial_entries fe WHERE fe.company_id = p_company_id AND fe.type = 'payable' AND fe.status NOT IN ('paid', 'cancelled');

  -- 5. MERCADORIA EM TRÂNSITO
  SELECT COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0) INTO v_merchandise_in_transit_value FROM public.ops_loadings l
  WHERE l.company_id = p_company_id AND COALESCE(l.status, '') IN ('loaded', 'in_transit', 'redirected', 'waiting_unload');

  v_total_assets := v_total_bank_balance + v_pending_sales_receipts + v_merchandise_in_transit_value;
  v_total_liabilities := v_pending_purchase_payments + v_pending_freight_payments + v_commissions_to_pay;
  v_net_balance := v_total_assets - v_total_liabilities;

  SELECT json_build_object(
    'bankBalances', v_bank_balances, 
    'totalBankBalance', v_total_bank_balance,
    'initialMonthBalances', v_opening_data->'initialMonthBalances',
    'totalInitialMonthBalance', v_opening_data->'totalInitialMonthBalance',
    'pendingSalesReceipts', v_pending_sales_receipts, 
    'merchandiseInTransitValue', v_merchandise_in_transit_value,
    'pendingPurchasePayments', v_pending_purchase_payments, 
    'pendingFreightPayments', v_pending_freight_payments, 
    'commissionsToPay', v_commissions_to_pay,
    'totalAssets', v_total_assets, 
    'totalLiabilities', v_total_liabilities, 
    'netBalance', v_net_balance
  ) INTO result;
  
  RETURN result;
END;
$function$;
