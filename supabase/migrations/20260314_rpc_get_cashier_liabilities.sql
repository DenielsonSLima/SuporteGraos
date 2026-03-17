-- ============================================================================
-- Migration: Split Cashier RPC - Part 2: Liabilities
-- Data: 2026-03-14
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_get_cashier_liabilities(
  p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pending_purchase_payments NUMERIC := 0;
  v_pending_freight_payments NUMERIC := 0;
  v_commissions_to_pay NUMERIC := 0;
  v_loans_taken NUMERIC := 0;
  v_advances_taken NUMERIC := 0;
  v_shareholder_payables NUMERIC := 0;
  v_total_liabilities NUMERIC := 0;
BEGIN
  -- 1. Contas a Pagar (Grãos)
  SELECT COALESCE(SUM(GREATEST(fe.total_amount - fe.paid_amount, 0)), 0)
  INTO v_pending_purchase_payments
  FROM public.financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.origin_type = 'purchase_order'
    AND fe.status NOT IN ('paid', 'received', 'cancelled', 'canceled');

  -- 2. Fretes a Pagar
  SELECT COALESCE(SUM(GREATEST(fe.total_amount - fe.paid_amount, 0)), 0)
  INTO v_pending_freight_payments
  FROM public.financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.origin_type = 'freight'
    AND fe.status NOT IN ('paid', 'received', 'cancelled', 'canceled');

  -- 3. Comissões a Pagar
  SELECT COALESCE(SUM(GREATEST(fe.total_amount - fe.paid_amount, 0)), 0)
  INTO v_commissions_to_pay
  FROM public.financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.origin_type = 'commission'
    AND fe.status NOT IN ('paid', 'received', 'cancelled', 'canceled');

  -- 4. Empréstimos Tomados (Loans Taken)
  -- De public.loans
  SELECT COALESCE(SUM(remaining_amount), 0)
  INTO v_loans_taken
  FROM public.loans
  WHERE company_id = p_company_id
    AND status NOT IN ('paid', 'cancelled', 'canceled');

  -- De financial_entries (legacy or individual entries)
  v_loans_taken := v_loans_taken + COALESCE((
    SELECT SUM(GREATEST(fe.total_amount - fe.paid_amount, 0))
    FROM public.financial_entries fe
    WHERE fe.company_id = p_company_id
      AND fe.type = 'payable'
      AND fe.origin_type = 'loan'
      AND fe.status NOT IN ('paid', 'received', 'cancelled', 'canceled')
  ), 0);

  -- De admin_expenses (Legacy)
  IF to_regclass('public.admin_expenses') IS NOT NULL THEN
    v_loans_taken := v_loans_taken + COALESCE((
      SELECT SUM(GREATEST(COALESCE(ae.original_value, 0) - COALESCE(ae.paid_value, 0), 0))
      FROM public.admin_expenses ae
      WHERE ae.company_id = p_company_id
        AND ae.sub_type = 'loan_taken'
        AND ae.status NOT IN ('paid', 'received', 'cancelled', 'canceled')
    ), 0);
  END IF;

  -- 5. Adiantamentos de Clientes
  IF to_regclass('public.advances') IS NOT NULL THEN
    SELECT COALESCE(SUM(COALESCE(a.remaining_amount, 0)), 0)
    INTO v_advances_taken
    FROM public.advances a
    WHERE a.company_id = p_company_id
      AND a.recipient_type = 'client'
      AND a.status NOT IN ('settled', 'cancelled', 'canceled');
  END IF;

  -- 6. Obrigações com Sócios (Saldo Credor)
  SELECT COALESCE(SUM(s.current_balance), 0)
  INTO v_shareholder_payables
  FROM public.shareholders s
  WHERE s.company_id = p_company_id
    AND s.current_balance > 0;

  -- Total Passivos
  v_total_liabilities := 
    v_pending_purchase_payments + 
    v_pending_freight_payments + 
    v_commissions_to_pay + 
    v_loans_taken + 
    v_advances_taken + 
    v_shareholder_payables;

  RETURN jsonb_build_object(
    'pendingPurchasePayments', v_pending_purchase_payments,
    'pendingFreightPayments', v_pending_freight_payments,
    'commissionsToPay', v_commissions_to_pay,
    'loansTaken', v_loans_taken,
    'advancesTaken', v_advances_taken,
    'shareholderPayables', v_shareholder_payables,
    'totalLiabilities', v_total_liabilities
  );
END;
$$;

-- Permissões para acesso via API
GRANT EXECUTE ON FUNCTION public.rpc_get_cashier_liabilities(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_cashier_liabilities(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_cashier_liabilities(UUID) TO service_role;

