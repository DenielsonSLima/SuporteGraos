-- ATIVOS
CREATE OR REPLACE FUNCTION public.rpc_calc_caixa_bank_balances(p_company_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(balance) 
    FROM public.accounts 
    WHERE company_id = p_company_id AND COALESCE(is_active, true) = true
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.rpc_calc_caixa_sales_receivables(p_company_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(remaining_amount) 
    FROM public.financial_entries 
    WHERE company_id = p_company_id 
    AND type = 'receivable' 
    AND origin_type = 'sales_order' 
    AND status NOT IN ('paid', 'cancelled')
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.rpc_calc_caixa_assets_active(p_company_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(acquisition_value) 
    FROM public.assets 
    WHERE company_id = p_company_id 
    AND (status IS NULL OR LOWER(status) NOT IN ('sold', 'written_off', 'baixado', 'vendido'))
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.rpc_calc_caixa_assets_sales_receivable(p_company_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(original_value - paid_value - discount_value) 
    FROM public.admin_expenses 
    WHERE company_id = p_company_id 
    AND asset_id IS NOT NULL 
    AND status NOT IN ('paid', 'received', 'cancelled', 'canceled')
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.rpc_calc_caixa_shareholder_credits(p_company_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END) 
    FROM public.shareholders 
    WHERE company_id = p_company_id
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.rpc_calc_caixa_loans_granted(p_company_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(principal_amount - paid_amount) 
    FROM public.loans 
    WHERE company_id = p_company_id AND type = 'granted' AND status = 'open'
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.rpc_calc_caixa_merchandise_transit(p_company_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(COALESCE(total_sales_value, 0)) 
    FROM public.ops_loadings 
    WHERE company_id = p_company_id 
    AND status IN ('loaded', 'in_transit', 'redirected', 'waiting_unload', 'partially_unloaded')
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.rpc_calc_caixa_advances_given(p_company_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(amount - settled_amount) 
    FROM public.advances 
    WHERE company_id = p_company_id AND status = 'open' AND recipient_type != 'client'
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SOMA ATIVOS
CREATE OR REPLACE FUNCTION public.rpc_calc_caixa_total_assets(p_company_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN public.rpc_calc_caixa_bank_balances(p_company_id) +
         public.rpc_calc_caixa_sales_receivables(p_company_id) +
         public.rpc_calc_caixa_assets_active(p_company_id) +
         public.rpc_calc_caixa_assets_sales_receivable(p_company_id) +
         public.rpc_calc_caixa_shareholder_credits(p_company_id) +
         public.rpc_calc_caixa_loans_granted(p_company_id) +
         public.rpc_calc_caixa_merchandise_transit(p_company_id) +
         public.rpc_calc_caixa_advances_given(p_company_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DÉBITOS
CREATE OR REPLACE FUNCTION public.rpc_calc_caixa_payables_grain(p_company_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(remaining_amount) 
    FROM public.financial_entries 
    WHERE company_id = p_company_id 
    AND type = 'payable' 
    AND origin_type = 'purchase_order' 
    AND status NOT IN ('paid', 'cancelled')
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.rpc_calc_caixa_payables_freight(p_company_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(remaining_amount) 
    FROM public.financial_entries 
    WHERE company_id = p_company_id 
    AND type = 'payable' 
    AND origin_type = 'freight' 
    AND status NOT IN ('paid', 'cancelled')
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.rpc_calc_caixa_payables_commission(p_company_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(remaining_amount) 
    FROM public.financial_entries 
    WHERE company_id = p_company_id 
    AND type = 'payable' 
    AND origin_type = 'commission' 
    AND status NOT IN ('paid', 'cancelled')
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.rpc_calc_caixa_shareholder_debts(p_company_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(CASE WHEN current_balance < 0 THEN ABS(current_balance) ELSE 0 END) 
    FROM public.shareholders 
    WHERE company_id = p_company_id
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.rpc_calc_caixa_loans_taken(p_company_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(principal_amount - paid_amount) 
    FROM public.loans 
    WHERE company_id = p_company_id AND type = 'taken' AND status = 'open'
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.rpc_calc_caixa_advances_received(p_company_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(amount - settled_amount) 
    FROM public.advances 
    WHERE company_id = p_company_id AND status = 'open' AND recipient_type = 'client'
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SOMA DÉBITOS
CREATE OR REPLACE FUNCTION public.rpc_calc_caixa_total_liabilities(p_company_id uuid)
RETURNS numeric AS $$
BEGIN
  RETURN public.rpc_calc_caixa_payables_grain(p_company_id) +
         public.rpc_calc_caixa_payables_freight(p_company_id) +
         public.rpc_calc_caixa_payables_commission(p_company_id) +
         public.rpc_calc_caixa_shareholder_debts(p_company_id) +
         public.rpc_calc_caixa_loans_taken(p_company_id) +
         public.rpc_calc_caixa_advances_received(p_company_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC MESTRE CONSOLIDADORA
CREATE OR REPLACE FUNCTION public.rpc_get_caixa_consolidated_report(p_company_id uuid)
RETURNS json AS $$
DECLARE
  v_result json;
  v_bank_balances_list json;
  v_bank_total numeric;
  v_receivables_sales numeric;
  v_assets_active numeric;
  v_assets_receivable numeric;
  v_shareholder_credits numeric;
  v_loans_granted numeric;
  v_merch_transit numeric;
  v_advances_given numeric;
  v_total_assets numeric;
  
  v_payables_grain numeric;
  v_payables_freight numeric;
  v_payables_commission numeric;
  v_shareholder_debts numeric;
  v_loans_taken numeric;
  v_advances_received numeric;
  v_total_liabilities numeric;
  
  v_opening_data json;
  v_op_stats json;
  v_credits_det json;
  v_payments_det json;
BEGIN
  v_bank_total := public.rpc_calc_caixa_bank_balances(p_company_id);
  v_receivables_sales := public.rpc_calc_caixa_sales_receivables(p_company_id);
  v_assets_active := public.rpc_calc_caixa_assets_active(p_company_id);
  v_assets_receivable := public.rpc_calc_caixa_assets_sales_receivable(p_company_id);
  v_shareholder_credits := public.rpc_calc_caixa_shareholder_credits(p_company_id);
  v_loans_granted := public.rpc_calc_caixa_loans_granted(p_company_id);
  v_merch_transit := public.rpc_calc_caixa_merchandise_transit(p_company_id);
  v_advances_given := public.rpc_calc_caixa_advances_given(p_company_id);
  v_total_assets := public.rpc_calc_caixa_total_assets(p_company_id);
  
  v_payables_grain := public.rpc_calc_caixa_payables_grain(p_company_id);
  v_payables_freight := public.rpc_calc_caixa_payables_freight(p_company_id);
  v_payables_commission := public.rpc_calc_caixa_payables_commission(p_company_id);
  v_shareholder_debts := public.rpc_calc_caixa_shareholder_debts(p_company_id);
  v_loans_taken := public.rpc_calc_caixa_loans_taken(p_company_id);
  v_advances_received := public.rpc_calc_caixa_advances_received(p_company_id);
  v_total_liabilities := public.rpc_calc_caixa_total_liabilities(p_company_id);
  
  SELECT COALESCE(json_agg(json_build_object('id', a.id, 'bankName', a.account_name, 'owner', a.owner, 'balance', COALESCE(a.balance, 0)) ORDER BY a.account_name), '[]'::json)
  INTO v_bank_balances_list FROM public.accounts a WHERE a.company_id = p_company_id AND COALESCE(a.is_active, true) = true;
  
  v_opening_data := public.rpc_get_opening_balances(p_company_id, date_trunc('month', CURRENT_DATE)::date);
  v_op_stats := public.rpc_get_month_operational_stats(p_company_id);
  v_credits_det := public.rpc_get_month_credit_details(p_company_id);
  v_payments_det := public.rpc_get_month_payment_details(p_company_id);
  
  SELECT json_build_object(
    'bankBalances', v_bank_balances_list,
    'totalBankBalance', v_bank_total,
    'totalInitialMonthBalance', v_opening_data->'totalInitialMonthBalance',
    'initialMonthBalances', v_opening_data->'initialMonthBalances',
    'totalAssets', v_total_assets,
    'totalLiabilities', v_total_liabilities,
    'netBalance', v_total_assets - v_total_liabilities,
    'pendingSalesReceipts', v_receivables_sales,
    'totalFixedAssetsValue', v_assets_active,
    'pendingAssetSalesReceipts', v_assets_receivable,
    'shareholderReceivables', v_shareholder_credits,
    'loansGranted', v_loans_granted,
    'merchandiseInTransitValue', v_merch_transit,
    'advancesGiven', v_advances_given,
    'pendingPurchasePayments', v_payables_grain,
    'pendingFreightPayments', v_payables_freight,
    'commissionsToPay', v_payables_commission,
    'shareholderPayables', v_shareholder_debts,
    'loansTaken', v_loans_taken,
    'advancesTaken', v_advances_received,
    'monthPurchasedTotal', COALESCE((v_op_stats->>'purchased')::numeric, 0),
    'monthSoldTotal', COALESCE((v_op_stats->>'sold')::numeric, 0),
    'monthOperationalSpread', COALESCE((v_op_stats->>'sold')::numeric, 0) - (COALESCE((v_op_stats->>'purchased')::numeric, 0) + v_payables_freight),
    'creditsReceivedDetails', v_credits_det,
    'monthPaidTotal', COALESCE((v_payments_det->>'total')::numeric, 0)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
