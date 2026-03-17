-- ============================================================================
-- Migration: Split Cashier RPC - Part 1: Assets
-- Data: 2026-03-14
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_get_cashier_assets(
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
  v_bank_balances JSONB := '[]'::jsonb;
  v_total_bank_balance NUMERIC := 0;
  v_total_initial_balance NUMERIC := 0;
  v_initial_balances JSONB := '[]'::jsonb;
  v_pending_sales_receipts NUMERIC := 0;
  v_merchandise_in_transit_value NUMERIC := 0;
  v_loans_granted NUMERIC := 0;
  v_advances_given NUMERIC := 0;
  v_total_fixed_assets_value NUMERIC := 0;
  v_pending_asset_sales_receipts NUMERIC := 0;
  v_shareholder_receivables NUMERIC := 0;
  v_total_assets NUMERIC := 0;
  
  v_start_of_period DATE;
BEGIN
  v_start_of_period := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE)::DATE);

  -- 1. Saldos Bancários Atuais
  SELECT 
    COALESCE(json_agg(json_build_object(
      'id', a.id,
      'bankName', a.account_name,
      'owner', '',
      'balance', COALESCE(a.balance, 0)
    )), '[]'::jsonb),
    COALESCE(SUM(COALESCE(a.balance, 0)), 0)
  INTO v_bank_balances, v_total_bank_balance
  FROM public.accounts a
  WHERE a.company_id = p_company_id AND a.is_active = true;

  -- 2. Saldos Iniciais do Período
  SELECT 
    COALESCE(json_agg(json_build_object(
      'accountId', a.id,
      'accountName', a.account_name,
      'value', COALESCE(ib.initial_balance, 0)
    )), '[]'::jsonb),
    COALESCE(SUM(COALESCE(ib.initial_balance, 0)), 0)
  INTO v_initial_balances, v_total_initial_balance

  FROM public.accounts a
  LEFT JOIN public.account_initial_balances ib ON ib.account_id = a.id AND ib.reference_date = v_start_of_period
  WHERE a.company_id = p_company_id;

  -- 3. Recebíveis de Vendas (financial_entries)
  SELECT COALESCE(SUM(GREATEST(fe.total_amount - fe.paid_amount, 0)), 0)
  INTO v_pending_sales_receipts
  FROM public.financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'receivable'
    AND fe.origin_type = 'sales_order'
    AND fe.status NOT IN ('paid', 'received', 'cancelled', 'canceled');

  -- 4. Mercadoria em Trânsito
  IF to_regclass('public.ops_loadings') IS NOT NULL THEN
    SELECT COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0)
    INTO v_merchandise_in_transit_value
    FROM public.ops_loadings l
    WHERE l.company_id = p_company_id
      AND l.status IN ('loaded', 'in_transit', 'redirected', 'waiting_unload');
  END IF;

  -- 5. Empréstimos Concedidos (Loans Granted)
  -- De public.loans (onde lender_id é NULL ou estamos no ativo se houver flag, mas loans geralmente é passivo. 
  -- Contudo, o sistema pode ter empréstimos concedidos em financial_entries origin_type='loan' + type='receivable')
  
  -- De financial_entries
  v_loans_granted := COALESCE((
    SELECT SUM(GREATEST(fe.total_amount - fe.paid_amount, 0))
    FROM public.financial_entries fe
    WHERE fe.company_id = p_company_id
      AND fe.type = 'receivable'
      AND fe.origin_type = 'loan'
      AND fe.status NOT IN ('paid', 'received', 'cancelled', 'canceled')
  ), 0);

  -- De admin_expenses (Legacy)
  IF to_regclass('public.admin_expenses') IS NOT NULL THEN
    v_loans_granted := v_loans_granted + COALESCE((
      SELECT SUM(GREATEST(COALESCE(ae.original_value, 0) - COALESCE(ae.paid_value, 0), 0))
      FROM public.admin_expenses ae
      WHERE ae.company_id = p_company_id
        AND ae.sub_type = 'loan_granted'
        AND ae.status NOT IN ('paid', 'received', 'cancelled', 'canceled')
    ), 0);
  END IF;

  -- 6. Adiantamentos Concedidos
  IF to_regclass('public.advances') IS NOT NULL THEN
    SELECT COALESCE(SUM(COALESCE(a.remaining_amount, 0)), 0)
    INTO v_advances_given
    FROM public.advances a
    WHERE a.company_id = p_company_id
      AND a.recipient_type IN ('supplier', 'shareholder')
      AND a.status NOT IN ('settled', 'cancelled', 'canceled');
  END IF;

  -- 7. Patrimônio (Fixed Assets)
  IF to_regclass('public.assets') IS NOT NULL THEN
    SELECT COALESCE(SUM(COALESCE(ast.acquisition_value, 0)), 0)
    INTO v_total_fixed_assets_value
    FROM public.assets ast
    WHERE ast.company_id = p_company_id
      AND COALESCE(ast.status, 'active') = 'active';
  END IF;

  -- 8. Recebíveis de Venda de Bens (Legacy admin_expenses)
  IF to_regclass('public.admin_expenses') IS NOT NULL THEN
    SELECT COALESCE(SUM(GREATEST(COALESCE(ae.original_value, 0) - COALESCE(ae.paid_value, 0), 0)), 0)
    INTO v_pending_asset_sales_receipts
    FROM public.admin_expenses ae
    WHERE ae.company_id = p_company_id
      AND (ae.is_asset_receipt = true OR ae.category_id IN (SELECT id FROM public.expense_categories WHERE name = 'Venda de Ativo'))
      AND ae.status NOT IN ('paid', 'received', 'cancelled', 'canceled');
  END IF;

  -- 9. Haveres de Sócios (Saldo Devedor)
  SELECT COALESCE(SUM(ABS(s.current_balance)), 0)
  INTO v_shareholder_receivables
  FROM public.shareholders s
  WHERE s.company_id = p_company_id
    AND s.current_balance < 0;

  -- Total Ativos
  v_total_assets := 
    v_total_bank_balance + 
    v_pending_sales_receipts + 
    v_merchandise_in_transit_value + 
    v_loans_granted + 
    v_advances_given + 
    v_total_fixed_assets_value + 
    v_pending_asset_sales_receipts + 
    v_shareholder_receivables;

  RETURN jsonb_build_object(
    'bankBalances', v_bank_balances,
    'totalBankBalance', v_total_bank_balance,
    'totalInitialBalance', v_total_initial_balance,
    'initialBalances', v_initial_balances,
    'pendingSalesReceipts', v_pending_sales_receipts,
    'merchandiseInTransitValue', v_merchandise_in_transit_value,
    'loansGranted', v_loans_granted,
    'advancesGiven', v_advances_given,
    'totalFixedAssetsValue', v_total_fixed_assets_value,
    'pendingAssetSalesReceipts', v_pending_asset_sales_receipts,
    'shareholderReceivables', v_shareholder_receivables,
    'totalAssets', v_total_assets
  );
END;
$$;

-- Permissões para acesso via API
GRANT EXECUTE ON FUNCTION public.rpc_get_cashier_assets(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_cashier_assets(UUID, DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_cashier_assets(UUID, DATE, DATE) TO service_role;


