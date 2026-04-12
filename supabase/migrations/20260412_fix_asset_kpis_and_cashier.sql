-- ============================================================================
-- 📊 MIGRATION: SQL-First KPIs for Assets and Cashier Update
-- Data: 2026-04-12
-- Objetivo: Restaurar RPCs de Ativos e atualizar o Caixa para incluir Patrimônio.
-- ============================================================================

-- 1. RPC: Resumo Geral do Módulo de Ativos (Patrimônio)
-- Restaurando de 2026-04-09
CREATE OR REPLACE FUNCTION public.rpc_asset_summary(p_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_fixed_value NUMERIC(15,2) := 0;
  v_total_sold_open NUMERIC(15,2) := 0;
  v_total_pending_receipt NUMERIC(15,2) := 0;
  v_active_count INTEGER := 0;
  v_sold_count INTEGER := 0;
  result JSON;
BEGIN
  -- A) Bens Ativos
  SELECT 
    COALESCE(SUM(acquisition_value), 0),
    COUNT(*)
  INTO v_total_fixed_value, v_active_count
  FROM public.assets
  WHERE company_id = p_company_id AND status = 'active';

  -- B) Bens Vendidos com Pendência Financeira
  SELECT 
    COALESCE(SUM(a.sale_value), 0),
    COUNT(DISTINCT a.id)
  INTO v_total_sold_open, v_sold_count
  FROM public.assets a
  INNER JOIN public.admin_expenses ae ON ae.asset_id = a.id
  WHERE a.company_id = p_company_id 
    AND a.status = 'sold'
    AND ae.status NOT IN ('paid', 'received', 'cancelled', 'canceled');

  -- C) Total Pendente de Recebimento (Financeiro Puro)
  SELECT 
    COALESCE(SUM(original_value - paid_value - discount_value), 0)
  INTO v_total_pending_receipt
  FROM public.admin_expenses
  WHERE company_id = p_company_id
    AND asset_id IS NOT NULL
    AND status NOT IN ('paid', 'received', 'cancelled', 'canceled');

  SELECT json_build_object(
    'totalFixedValue', v_total_fixed_value,
    'totalSoldOpen', v_total_sold_open,
    'totalPendingReceipt', v_total_pending_receipt,
    'activeCount', v_active_count,
    'soldCount', v_sold_count
  ) INTO result;

  RETURN result;
END;
$$;

-- 2. RPC: Estatísticas Detalhadas de um Ativo Específico
CREATE OR REPLACE FUNCTION public.rpc_asset_detail_stats(p_asset_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_value NUMERIC(15,2) := 0;
  v_total_received NUMERIC(15,2) := 0;
  v_total_pending NUMERIC(15,2) := 0;
  v_progress NUMERIC(5,2) := 0;
  result JSON;
BEGIN
  -- Obter valor de venda
  SELECT COALESCE(sale_value, 0) INTO v_sale_value 
  FROM public.assets 
  WHERE id = p_asset_id;

  -- Obter total recebido (via admin_expenses vinculado)
  SELECT COALESCE(SUM(paid_value), 0) INTO v_total_received
  FROM public.admin_expenses
  WHERE asset_id = p_asset_id;

  v_total_pending := GREATEST(0, v_sale_value - v_total_received);
  
  IF v_sale_value > 0 THEN
    v_progress := (v_total_received / v_sale_value) * 100;
  END IF;

  SELECT json_build_object(
    'totalSold', v_sale_value,
    'totalReceived', v_total_received,
    'totalPending', v_total_pending,
    'progress', v_progress
  ) INTO result;

  RETURN result;
END;
$$;

-- 3. UPDATED RPC: rpc_cashier_report
-- Agora inclui Patrimônio, Empréstimos, Haveres e Adiantamentos
CREATE OR REPLACE FUNCTION public.rpc_cashier_report(p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
  v_my_company_id UUID;
  v_bank_balances JSON := '[]'::json;
  v_total_bank_balance NUMERIC := 0;
  v_opening_data JSON;
  v_pending_sales_receipts NUMERIC := 0;
  v_merchandise_in_transit_value NUMERIC := 0;
  
  -- Novos campos de Ativos (Bens e Créditos)
  v_total_fixed_assets_value NUMERIC := 0;
  v_asset_sales_receivable NUMERIC := 0;
  v_loan_credits NUMERIC := 0;
  v_advances_credits NUMERIC := 0;
  v_shareholder_credits NUMERIC := 0;
  
  -- Passivos
  v_pending_purchase_payments NUMERIC := 0;
  v_pending_freight_payments NUMERIC := 0;
  v_commissions_to_pay NUMERIC := 0;
  v_loan_debts NUMERIC := 0;
  v_shareholder_debts NUMERIC := 0;
  v_client_advances NUMERIC := 0; -- Adiantamento de Clientes (Passivo)
  
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

  -- 2. SALDOS DE ABERTURA DO MÊS
  v_opening_data := public.rpc_get_opening_balances(p_company_id, date_trunc('month', CURRENT_DATE)::date);

  -- 3. RECEBÍVEIS (Vendas de Grãos)
  SELECT COALESCE(SUM(fe.remaining_amount), 0) INTO v_pending_sales_receipts FROM public.financial_entries fe
  WHERE fe.company_id = p_company_id AND fe.type = 'receivable' AND COALESCE(fe.origin_type, '') = 'sales_order' AND fe.status NOT IN ('paid', 'cancelled');

  -- 4. OBRIGAÇÕES (Grãos, Fretes, Comissões)
  SELECT 
    COALESCE(SUM(CASE WHEN fe.origin_type = 'purchase_order' THEN fe.remaining_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fe.origin_type = 'freight' THEN fe.remaining_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN fe.origin_type = 'commission' THEN fe.remaining_amount ELSE 0 END), 0)
  INTO v_pending_purchase_payments, v_pending_freight_payments, v_commissions_to_pay
  FROM public.financial_entries fe WHERE fe.company_id = p_company_id AND fe.type = 'payable' AND fe.status NOT IN ('paid', 'cancelled');

  -- 5. MERCADORIA EM TRÂNSITO
  SELECT COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0) INTO v_merchandise_in_transit_value FROM public.ops_loadings l
  WHERE l.company_id = p_company_id AND COALESCE(l.status, '') IN ('loaded', 'in_transit', 'redirected', 'waiting_unload');

  -- 6. PATRIMÔNIO (NOVO: Bens Ativos)
  SELECT COALESCE(SUM(acquisition_value), 0) INTO v_total_fixed_assets_value
  FROM public.assets WHERE company_id = p_company_id AND status = 'active';

  -- 7. VENDAS DE BENS A RECEBER (NOVO)
  SELECT COALESCE(SUM(original_value - paid_value - discount_value), 0) INTO v_asset_sales_receivable
  FROM public.admin_expenses WHERE company_id = p_company_id AND asset_id IS NOT NULL AND status NOT IN ('paid', 'received', 'cancelled', 'canceled');

  -- 8. EMPRÉSTIMOS (NOVO)
  -- Concedidos (Ativo)
  SELECT COALESCE(SUM(principal_amount - paid_amount), 0) INTO v_loan_credits
  FROM public.loans WHERE company_id = p_company_id AND type = 'granted' AND status = 'open';
  -- Tomados (Passivo)
  SELECT COALESCE(SUM(principal_amount - paid_amount), 0) INTO v_loan_debts
  FROM public.loans WHERE company_id = p_company_id AND type = 'taken' AND status = 'open';

  -- 9. ADIANTAMENTOS CONCEDIDOS (NOVO: Ativo)
  SELECT COALESCE(SUM(amount - settled_amount), 0) INTO v_advances_credits
  FROM public.advances WHERE company_id = p_company_id AND status = 'open';

  -- 10. HAVERES / OBRIGAÇÕES COM SÓCIOS (NOVO)
  SELECT 
    COALESCE(SUM(CASE WHEN current_balance > 0 THEN current_balance ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN current_balance < 0 THEN ABS(current_balance) ELSE 0 END), 0)
  INTO v_shareholder_credits, v_shareholder_debts
  FROM public.shareholders WHERE company_id = p_company_id;

  -- 11. CÁLCULO FINAL
  v_total_assets := v_total_bank_balance + v_pending_sales_receipts + v_merchandise_in_transit_value + 
                    v_total_fixed_assets_value + v_asset_sales_receivable + v_loan_credits + 
                    v_advances_credits + v_shareholder_credits;
                    
  v_total_liabilities := v_pending_purchase_payments + v_pending_freight_payments + v_commissions_to_pay + 
                         v_loan_debts + v_shareholder_debts + v_client_advances;
                         
  v_net_balance := v_total_assets - v_total_liabilities;

  SELECT json_build_object(
    'bankBalances', v_bank_balances, 
    'totalBankBalance', v_total_bank_balance,
    'initialMonthBalances', v_opening_data->'initialMonthBalances',
    'totalInitialMonthBalance', v_opening_data->'totalInitialMonthBalance',
    'pendingSalesReceipts', v_pending_sales_receipts, 
    'merchandiseInTransitValue', v_merchandise_in_transit_value,
    'totalFixedAssetsValue', v_total_fixed_assets_value,
    'assetSalesReceivable', v_asset_sales_receivable,
    'loanCredits', v_loan_credits,
    'advancesCredits', v_advances_credits,
    'shareholderCredits', v_shareholder_credits,
    'pendingPurchasePayments', v_pending_purchase_payments, 
    'pendingFreightPayments', v_pending_freight_payments, 
    'commissionsToPay', v_commissions_to_pay,
    'loanDebts', v_loan_debts,
    'shareholderDebts', v_shareholder_debts,
    'clientAdvances', v_client_advances,
    'totalAssets', v_total_assets, 
    'totalLiabilities', v_total_liabilities, 
    'netBalance', v_net_balance
  ) INTO result;
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_asset_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_asset_detail_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cashier_report(UUID) TO authenticated;

COMMENT ON FUNCTION public.rpc_asset_summary IS 'Retorna indicadores globais de patrimônio para uma empresa.';
COMMENT ON FUNCTION public.rpc_cashier_report IS 'Gera o relatório consolidado do Caixa, incluindo ativos físicos e financeiros.';
