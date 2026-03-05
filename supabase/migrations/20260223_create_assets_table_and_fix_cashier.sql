-- ============================================================================
-- Criar tabela assets + adicionar colunas em admin_expenses + atualizar RPC
-- Data: 2026-02-23
-- Objetivo: O Caixa precisa exibir valores de bens ativos e vendidos.
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. CRIAR TABELA assets (se não existir)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'other',        -- vehicle, machine, property, equipment, other
  description TEXT,
  acquisition_date DATE,
  acquisition_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  origin TEXT DEFAULT 'purchase',                   -- purchase, trade_in
  origin_description TEXT,
  status TEXT NOT NULL DEFAULT 'active',             -- active, sold, write_off
  
  -- Dados de venda
  sale_date DATE,
  sale_value NUMERIC(15,2),
  buyer_name TEXT,
  buyer_id UUID,
  
  -- Dados de baixa
  write_off_date DATE,
  write_off_reason TEXT,
  write_off_notes TEXT,
  
  identifier TEXT,                                   -- Placa, Chassi, Matrícula
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Policy: Empresa só vê seus próprios ativos
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'assets' AND policyname = 'assets_company_isolation') THEN
    CREATE POLICY assets_company_isolation ON public.assets
      FOR ALL USING (company_id = public.my_company_id());
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_assets_company_id ON public.assets(company_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_company_status ON public.assets(company_id, status);

-- Grants
GRANT ALL ON public.assets TO authenticated;
GRANT SELECT ON public.assets TO anon;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.assets;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ADICIONAR COLUNAS FALTANTES EM admin_expenses
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  -- entity_name (nome da entidade/fornecedor/cliente)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_expenses' AND column_name = 'entity_name') THEN
    ALTER TABLE public.admin_expenses ADD COLUMN entity_name TEXT;
  END IF;
  
  -- driver_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_expenses' AND column_name = 'driver_name') THEN
    ALTER TABLE public.admin_expenses ADD COLUMN driver_name TEXT;
  END IF;
  
  -- category (texto)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_expenses' AND column_name = 'category') THEN
    ALTER TABLE public.admin_expenses ADD COLUMN category TEXT;
  END IF;
  
  -- issue_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_expenses' AND column_name = 'issue_date') THEN
    ALTER TABLE public.admin_expenses ADD COLUMN issue_date DATE;
  END IF;
  
  -- settlement_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_expenses' AND column_name = 'settlement_date') THEN
    ALTER TABLE public.admin_expenses ADD COLUMN settlement_date DATE;
  END IF;
  
  -- original_value
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_expenses' AND column_name = 'original_value') THEN
    ALTER TABLE public.admin_expenses ADD COLUMN original_value NUMERIC(15,2) DEFAULT 0;
  END IF;
  
  -- paid_value
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_expenses' AND column_name = 'paid_value') THEN
    ALTER TABLE public.admin_expenses ADD COLUMN paid_value NUMERIC(15,2) DEFAULT 0;
  END IF;
  
  -- discount_value
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_expenses' AND column_name = 'discount_value') THEN
    ALTER TABLE public.admin_expenses ADD COLUMN discount_value NUMERIC(15,2) DEFAULT 0;
  END IF;
  
  -- sub_type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_expenses' AND column_name = 'sub_type') THEN
    ALTER TABLE public.admin_expenses ADD COLUMN sub_type TEXT;
  END IF;
  
  -- bank_account
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_expenses' AND column_name = 'bank_account') THEN
    ALTER TABLE public.admin_expenses ADD COLUMN bank_account TEXT;
  END IF;
  
  -- notes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_expenses' AND column_name = 'notes') THEN
    ALTER TABLE public.admin_expenses ADD COLUMN notes TEXT;
  END IF;
  
  -- asset_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_expenses' AND column_name = 'asset_id') THEN
    ALTER TABLE public.admin_expenses ADD COLUMN asset_id UUID;
  END IF;
  
  -- is_asset_receipt
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_expenses' AND column_name = 'is_asset_receipt') THEN
    ALTER TABLE public.admin_expenses ADD COLUMN is_asset_receipt BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- asset_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_expenses' AND column_name = 'asset_name') THEN
    ALTER TABLE public.admin_expenses ADD COLUMN asset_name TEXT;
  END IF;
  
  -- weight_sc, weight_kg, unit_price_ton, unit_price_sc, load_count, total_ton, total_sc
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_expenses' AND column_name = 'weight_sc') THEN
    ALTER TABLE public.admin_expenses ADD COLUMN weight_sc NUMERIC(15,4);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_expenses' AND column_name = 'weight_kg') THEN
    ALTER TABLE public.admin_expenses ADD COLUMN weight_kg NUMERIC(15,4);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_expenses' AND column_name = 'unit_price_ton') THEN
    ALTER TABLE public.admin_expenses ADD COLUMN unit_price_ton NUMERIC(15,4);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_expenses' AND column_name = 'unit_price_sc') THEN
    ALTER TABLE public.admin_expenses ADD COLUMN unit_price_sc NUMERIC(15,4);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_expenses' AND column_name = 'load_count') THEN
    ALTER TABLE public.admin_expenses ADD COLUMN load_count INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_expenses' AND column_name = 'total_ton') THEN
    ALTER TABLE public.admin_expenses ADD COLUMN total_ton NUMERIC(15,4);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_expenses' AND column_name = 'total_sc') THEN
    ALTER TABLE public.admin_expenses ADD COLUMN total_sc NUMERIC(15,4);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ATUALIZAR RPC rpc_cashier_report
--    Agora lê diretamente das tabelas reais (assets + admin_expenses)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.rpc_cashier_report(p_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_my_company_id UUID;
  v_auth_user_id UUID;

  v_bank_balances JSON := '[]'::json;
  v_initial_balances JSON := '[]'::json;

  v_total_bank_balance NUMERIC := 0;
  v_total_initial_balance NUMERIC := 0;

  v_pending_sales_receipts NUMERIC := 0;
  v_merchandise_in_transit_value NUMERIC := 0;
  v_loans_granted NUMERIC := 0;
  v_advances_given NUMERIC := 0;
  v_total_fixed_assets_value NUMERIC := 0;
  v_pending_asset_sales_receipts NUMERIC := 0;
  v_shareholder_receivables NUMERIC := 0;

  v_pending_purchase_payments NUMERIC := 0;
  v_pending_freight_payments NUMERIC := 0;
  v_loans_taken NUMERIC := 0;
  v_commissions_to_pay NUMERIC := 0;
  v_advances_taken NUMERIC := 0;
  v_shareholder_payables NUMERIC := 0;

  v_total_assets NUMERIC := 0;
  v_total_liabilities NUMERIC := 0;
  v_net_balance NUMERIC := 0;

  result JSON;
BEGIN
  -- ┌─────────────────────────────────────────────┐
  -- │ SEGURANÇA: Validar company_id               │
  -- └─────────────────────────────────────────────┘
  SELECT auth.uid() INTO v_auth_user_id;
  IF v_auth_user_id IS NOT NULL THEN
    SELECT public.my_company_id() INTO v_my_company_id;
    IF v_my_company_id IS NULL THEN
      RAISE EXCEPTION 'Usuário sem empresa vinculada';
    END IF;
    IF p_company_id IS DISTINCT FROM v_my_company_id THEN
      RAISE EXCEPTION 'Acesso negado para company_id %', p_company_id;
    END IF;
  END IF;

  -- ┌─────────────────────────────────────────────┐
  -- │ SALDOS BANCÁRIOS (accounts)                 │
  -- └─────────────────────────────────────────────┘
  IF to_regclass('public.accounts') IS NOT NULL THEN
    SELECT
      COALESCE(json_agg(json_build_object(
        'id', a.id,
        'bankName', a.account_name,
        'owner', a.owner,
        'balance', COALESCE(a.balance, 0)
      ) ORDER BY a.account_name), '[]'::json),
      COALESCE(SUM(a.balance), 0)
    INTO v_bank_balances, v_total_bank_balance
    FROM public.accounts a
    WHERE a.company_id = p_company_id
      AND COALESCE(a.is_active, true) = true;
  END IF;

  -- ┌─────────────────────────────────────────────┐
  -- │ SALDOS INICIAIS (initial_balances)          │
  -- └─────────────────────────────────────────────┘
  IF to_regclass('public.initial_balances') IS NOT NULL THEN
    SELECT
      COALESCE(json_agg(json_build_object(
        'id', ib.id,
        'accountId', ib.account_id,
        'accountName', ib.account_name,
        'date', ib.date,
        'value', ib.value,
        'bankName', ib.account_name
      ) ORDER BY ib.account_name), '[]'::json),
      COALESCE(SUM(ib.value), 0)
    INTO v_initial_balances, v_total_initial_balance
    FROM public.initial_balances ib
    WHERE ib.company_id = p_company_id;
  END IF;

  -- ┌─────────────────────────────────────────────┐
  -- │ RECEBÍVEIS DE VENDAS (financial_entries)    │
  -- └─────────────────────────────────────────────┘
  IF to_regclass('public.financial_entries') IS NOT NULL THEN
    SELECT COALESCE(SUM(GREATEST(
      COALESCE(fe.total_amount, 0) - COALESCE(fe.paid_amount, 0)
    , 0)), 0)
    INTO v_pending_sales_receipts
    FROM public.financial_entries fe
    WHERE fe.company_id = p_company_id
      AND fe.type = 'receivable'
      AND COALESCE(fe.origin_type, '') = 'sales_order'
      AND COALESCE(fe.status, 'open') NOT IN ('paid', 'received', 'cancelled', 'canceled');
  END IF;

  -- ┌─────────────────────────────────────────────┐
  -- │ MERCADORIA EM TRÂNSITO (ops_loadings)       │
  -- └─────────────────────────────────────────────┘
  IF to_regclass('public.ops_loadings') IS NOT NULL THEN
    SELECT COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0)
    INTO v_merchandise_in_transit_value
    FROM public.ops_loadings l
    WHERE l.company_id = p_company_id
      AND COALESCE(l.status, '') IN ('loaded', 'in_transit', 'redirected', 'waiting_unload');
  END IF;

  -- ┌─────────────────────────────────────────────┐
  -- │ EMPRÉSTIMOS (admin_expenses sub_type)       │
  -- └─────────────────────────────────────────────┘
  IF to_regclass('public.admin_expenses') IS NOT NULL THEN
    SELECT COALESCE(SUM(GREATEST(
      COALESCE(ae.original_value, 0) - COALESCE(ae.paid_value, 0) - COALESCE(ae.discount_value, 0)
    , 0)), 0)
    INTO v_loans_granted
    FROM public.admin_expenses ae
    WHERE ae.company_id = p_company_id
      AND COALESCE(ae.sub_type, '') = 'loan_granted'
      AND COALESCE(ae.status, 'pending') NOT IN ('paid', 'received', 'cancelled', 'canceled');

    SELECT COALESCE(SUM(GREATEST(
      COALESCE(ae.original_value, 0) - COALESCE(ae.paid_value, 0) - COALESCE(ae.discount_value, 0)
    , 0)), 0)
    INTO v_loans_taken
    FROM public.admin_expenses ae
    WHERE ae.company_id = p_company_id
      AND COALESCE(ae.sub_type, '') = 'loan_taken'
      AND COALESCE(ae.status, 'pending') NOT IN ('paid', 'received', 'cancelled', 'canceled');
  END IF;

  -- ┌─────────────────────────────────────────────┐
  -- │ ADIANTAMENTOS (advances)                    │
  -- └─────────────────────────────────────────────┘
  IF to_regclass('public.advances') IS NOT NULL THEN
    SELECT COALESCE(SUM(COALESCE(a.remaining_amount, 0)), 0)
    INTO v_advances_given
    FROM public.advances a
    WHERE a.company_id = p_company_id
      AND COALESCE(a.recipient_type, '') IN ('supplier', 'shareholder')
      AND COALESCE(a.status, 'open') NOT IN ('settled', 'cancelled', 'canceled');

    SELECT COALESCE(SUM(COALESCE(a.remaining_amount, 0)), 0)
    INTO v_advances_taken
    FROM public.advances a
    WHERE a.company_id = p_company_id
      AND COALESCE(a.recipient_type, '') = 'client'
      AND COALESCE(a.status, 'open') NOT IN ('settled', 'cancelled', 'canceled');
  END IF;

  -- ┌─────────────────────────────────────────────┐
  -- │ PATRIMÔNIO - BENS ATIVOS (assets)           │
  -- └─────────────────────────────────────────────┘
  IF to_regclass('public.assets') IS NOT NULL THEN
    SELECT COALESCE(SUM(COALESCE(ast.acquisition_value, 0)), 0)
    INTO v_total_fixed_assets_value
    FROM public.assets ast
    WHERE ast.company_id = p_company_id
      AND COALESCE(ast.status, 'active') = 'active';
  END IF;

  -- ┌─────────────────────────────────────────────┐
  -- │ RECEBÍVEIS DE VENDAS DE BENS (admin_expenses)│
  -- └─────────────────────────────────────────────┘
  IF to_regclass('public.admin_expenses') IS NOT NULL THEN
    SELECT COALESCE(SUM(GREATEST(
      COALESCE(ae.original_value, 0) - COALESCE(ae.paid_value, 0) - COALESCE(ae.discount_value, 0)
    , 0)), 0)
    INTO v_pending_asset_sales_receipts
    FROM public.admin_expenses ae
    WHERE ae.company_id = p_company_id
      AND (
        COALESCE(ae.is_asset_receipt, false) = true
        OR COALESCE(ae.category, '') = 'Venda de Ativo'
        OR (COALESCE(ae.sub_type, '') = 'receipt' AND ae.asset_id IS NOT NULL)
      )
      AND COALESCE(ae.status, 'pending') NOT IN ('paid', 'received', 'cancelled', 'canceled');
  END IF;

  -- ┌─────────────────────────────────────────────┐
  -- │ SÓCIOS (shareholders)                       │
  -- └─────────────────────────────────────────────┘
  IF to_regclass('public.shareholders') IS NOT NULL THEN
    SELECT COALESCE(SUM(ABS(COALESCE(s.current_balance, 0))), 0)
    INTO v_shareholder_receivables
    FROM public.shareholders s
    WHERE s.company_id = p_company_id
      AND COALESCE(s.current_balance, 0) < 0;

    SELECT COALESCE(SUM(COALESCE(s.current_balance, 0)), 0)
    INTO v_shareholder_payables
    FROM public.shareholders s
    WHERE s.company_id = p_company_id
      AND COALESCE(s.current_balance, 0) > 0;
  END IF;

  -- ┌─────────────────────────────────────────────┐
  -- │ CONTAS A PAGAR (financial_entries payable)   │
  -- └─────────────────────────────────────────────┘
  IF to_regclass('public.financial_entries') IS NOT NULL THEN
    -- Fornecedores (purchase_order)
    SELECT COALESCE(SUM(GREATEST(
      COALESCE(fe.total_amount, 0) - COALESCE(fe.paid_amount, 0)
    , 0)), 0)
    INTO v_pending_purchase_payments
    FROM public.financial_entries fe
    WHERE fe.company_id = p_company_id
      AND fe.type = 'payable'
      AND COALESCE(fe.origin_type, '') = 'purchase_order'
      AND COALESCE(fe.status, 'open') NOT IN ('paid', 'received', 'cancelled', 'canceled');

    -- Fretes
    SELECT COALESCE(SUM(GREATEST(
      COALESCE(fe.total_amount, 0) - COALESCE(fe.paid_amount, 0)
    , 0)), 0)
    INTO v_pending_freight_payments
    FROM public.financial_entries fe
    WHERE fe.company_id = p_company_id
      AND fe.type = 'payable'
      AND COALESCE(fe.origin_type, '') = 'freight'
      AND COALESCE(fe.status, 'open') NOT IN ('paid', 'received', 'cancelled', 'canceled');

    -- Comissões
    SELECT COALESCE(SUM(GREATEST(
      COALESCE(fe.total_amount, 0) - COALESCE(fe.paid_amount, 0)
    , 0)), 0)
    INTO v_commissions_to_pay
    FROM public.financial_entries fe
    WHERE fe.company_id = p_company_id
      AND fe.type = 'payable'
      AND COALESCE(fe.origin_type, '') = 'commission'
      AND COALESCE(fe.status, 'open') NOT IN ('paid', 'received', 'cancelled', 'canceled');
  END IF;

  -- ┌─────────────────────────────────────────────┐
  -- │ DESPESAS ADMIN A PAGAR (admin_expenses)     │
  -- └─────────────────────────────────────────────┘
  -- Despesas administrativas pendentes (sub_type = 'expense' ou null/vazio, e NÃO é asset_receipt)
  -- São adicionadas aos passivos como "Despesas Administrativas"

  -- ┌─────────────────────────────────────────────┐
  -- │ TOTAIS                                       │
  -- └─────────────────────────────────────────────┘
  v_total_assets :=
    v_total_bank_balance +
    v_pending_sales_receipts +
    v_merchandise_in_transit_value +
    v_loans_granted +
    v_advances_given +
    v_total_fixed_assets_value +
    v_pending_asset_sales_receipts +
    v_shareholder_receivables;

  v_total_liabilities :=
    v_pending_purchase_payments +
    v_pending_freight_payments +
    v_loans_taken +
    v_commissions_to_pay +
    v_advances_taken +
    v_shareholder_payables;

  v_net_balance := v_total_assets - v_total_liabilities;

  -- ┌─────────────────────────────────────────────┐
  -- │ RESULTADO JSON                               │
  -- └─────────────────────────────────────────────┘
  SELECT json_build_object(
    'bankBalances', v_bank_balances,
    'totalBankBalance', v_total_bank_balance,
    'initialBalances', v_initial_balances,
    'totalInitialBalance', v_total_initial_balance,
    'totalInitialMonthBalance', v_total_initial_balance,
    'initialMonthBalances', v_initial_balances,

    'pendingSalesReceipts', v_pending_sales_receipts,
    'merchandiseInTransitValue', v_merchandise_in_transit_value,
    'loansGranted', v_loans_granted,
    'advancesGiven', v_advances_given,
    'totalFixedAssetsValue', v_total_fixed_assets_value,
    'pendingAssetSalesReceipts', v_pending_asset_sales_receipts,
    'shareholderReceivables', v_shareholder_receivables,

    'pendingPurchasePayments', v_pending_purchase_payments,
    'pendingFreightPayments', v_pending_freight_payments,
    'loansTaken', v_loans_taken,
    'commissionsToPay', v_commissions_to_pay,
    'advancesTaken', v_advances_taken,
    'shareholderPayables', v_shareholder_payables,

    'totalAssets', v_total_assets,
    'totalLiabilities', v_total_liabilities,
    'netBalance', v_net_balance
  ) INTO result;

  RETURN result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_cashier_report(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cashier_report(UUID) TO anon;
