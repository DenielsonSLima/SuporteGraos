-- ============================================================================
-- Migration: Modular Financial RPCs (SQL-First Architecture)
-- Data: 2024-04-08
-- Objetivo: Consolidar a lógica de pagamento, desconto e estorno no banco,
--          eliminando a orquestração instável do frontend.
-- ============================================================================

SET search_path = public;

-- 1. RPC para processar pagamento/recebimento de forma atômica
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

  -- 2. Determinar tipo da transação (IN = Crédito/Recebimento, OUT = Débito/Pagamento)
  IF v_entry.type IN ('receivable', 'loan_receivable', 'partner_contribution', 'internal_credit') THEN
    v_tx_type := 'IN';
  ELSE
    v_tx_type := 'OUT';
  END IF;

  -- 3. Processar Pagamento (Ledger)
  IF p_amount > 0 THEN
    INSERT INTO financial_transactions (
      company_id,
      entry_id,
      account_id,
      type,
      amount,
      transaction_date,
      description
    ) VALUES (
      v_company_id,
      p_entry_id,
      p_account_id,
      v_tx_type,
      p_amount,
      p_transaction_date,
      COALESCE(p_description, 'Processamento via RPC')
    ) RETURNING id INTO v_tx_id;

    -- Registrar Link Robusto (Foundation V2) para rastreabilidade
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
      CASE WHEN v_tx_type = 'IN' THEN 'receipt' ELSE 'payment' END,
      CASE WHEN v_entry.origin_type = 'purchase_order' THEN v_entry.origin_id ELSE NULL END,
      CASE WHEN v_entry.origin_type = 'sales_order' THEN v_entry.origin_id ELSE NULL END,
      CASE WHEN v_entry.origin_type = 'loading' THEN v_entry.origin_id ELSE NULL END,
      CASE WHEN v_entry.origin_type IS NULL OR v_entry.origin_type = 'standalone' THEN p_entry_id ELSE NULL END,
      p_metadata
    );
  END IF;

  -- 4. Processar Desconto (Abatimento) - Reduz o total_amount da entry
  IF p_discount > 0 THEN
    UPDATE financial_entries 
    SET total_amount = GREATEST(total_amount - p_discount, 0),
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

-- 2. RPC para estorno atômico (Void transaction)
CREATE OR REPLACE FUNCTION public.rpc_ops_financial_void_transaction(
  p_transaction_id UUID,
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_tx FROM financial_transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transação não encontrada: %', p_transaction_id;
  END IF;

  -- Deletar links robustos primeiro
  DELETE FROM financial_links WHERE transaction_id = p_transaction_id;

  -- Deletar a transação
  -- Triggers automáticos:
  -- 1. trg_update_balance -> Reverte saldo da conta
  -- 2. trg_update_entry_paid_amount -> Reverte paid_amount e status da entry
  DELETE FROM financial_transactions WHERE id = p_transaction_id;

  v_result := jsonb_build_object(
    'success', true,
    'voided_id', p_transaction_id,
    'entry_id', v_tx.entry_id
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.rpc_ops_financial_process_action(UUID, UUID, NUMERIC, NUMERIC, TEXT, DATE, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_financial_void_transaction(UUID, JSONB) TO authenticated;
