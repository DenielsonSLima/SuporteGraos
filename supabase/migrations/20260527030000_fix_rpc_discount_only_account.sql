-- ============================================================================
-- Migration: Fix RPC Discount Only Account Constraint Violation
-- Data: 2026-05-27
-- ============================================================================

SET search_path = public;

CREATE OR REPLACE FUNCTION public.rpc_ops_financial_process_action(
  p_entry_id UUID,
  p_account_id UUID,
  p_amount NUMERIC,
  p_discount NUMERIC DEFAULT 0,
  p_description TEXT DEFAULT NULL,
  p_transaction_date DATE DEFAULT CURRENT_DATE,
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry RECORD;
  v_tx_type TEXT;
  v_company_id UUID;
  v_tx_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Validações iniciais
  IF p_amount < 0 OR p_discount < 0 THEN
    RAISE EXCEPTION 'Valores não podem ser negativos';
  END IF;

  SELECT * INTO v_entry FROM financial_entries WHERE id = p_entry_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrada financeira não encontrada: %', p_entry_id;
  END IF;

  v_company_id := v_entry.company_id;

  -- 2. Determinar tipo da transação (credit = Entrada/Recebimento, debit = Saída/Pagamento)
  IF v_entry.type IN ('receivable', 'loan_receivable', 'partner_contribution', 'internal_credit') THEN
    v_tx_type := 'credit';
  ELSE
    v_tx_type := 'debit';
  END IF;

  -- 3. Processar Pagamento (Ledger) ou Desconto
  IF p_amount > 0 OR p_discount > 0 THEN
    INSERT INTO financial_transactions (
      company_id,
      entry_id,
      account_id,
      type,
      amount,
      transaction_date,
      description,
      metadata
    ) VALUES (
      v_company_id,
      p_entry_id,
      COALESCE(p_account_id, '97e8bd30-3ba1-4658-a51e-5df6ce184845'::uuid),
      v_tx_type,
      p_amount,
      p_transaction_date,
      COALESCE(p_description, 'Processamento via RPC'),
      jsonb_build_object('discount_amount', p_discount)
    ) RETURNING id INTO v_tx_id;

    -- Registrar Link Robusto
    INSERT INTO financial_links (
      transaction_id,
      link_type,
      purchase_order_id,
      sales_order_id,
      loading_id,
      standalone_id,
      metadata
    ) VALUES (
      v_tx_id,
      CASE WHEN v_tx_type = 'credit' THEN 'receipt' ELSE 'payment' END,
      CASE WHEN v_entry.origin_type = 'purchase_order' THEN v_entry.origin_id ELSE NULL END,
      CASE WHEN v_entry.origin_type = 'sales_order' THEN v_entry.origin_id ELSE NULL END,
      CASE WHEN v_entry.origin_type IN ('loading', 'freight') THEN v_entry.origin_id ELSE NULL END,
      CASE WHEN v_entry.origin_type IS NULL OR v_entry.origin_type = 'standalone' THEN p_entry_id ELSE NULL END,
      p_metadata
    );
  END IF;

  -- 4. Processar Desconto (Abatimento) - Não subtrai do total_amount, incrementa discount_amount
  IF p_discount > 0 THEN
    UPDATE financial_entries 
    SET discount_amount = COALESCE(discount_amount, 0) + p_discount,
        updated_at = now()
    WHERE id = p_entry_id;
  END IF;

  -- 5. Retornar resultado formatado
  v_result := jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'entry_id', p_entry_id,
    'new_status', (SELECT status FROM financial_entries WHERE id = p_entry_id),
    'new_paid_amount', (SELECT paid_amount FROM financial_entries WHERE id = p_entry_id)
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_ops_financial_process_action(UUID, UUID, NUMERIC, NUMERIC, TEXT, DATE, JSONB) TO authenticated;
