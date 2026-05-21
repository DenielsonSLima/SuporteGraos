-- ============================================================================
-- Migration: Fix Financial Transaction Types (IN/OUT -> credit/debit)
-- Data: 2026-05-20
-- ============================================================================

SET search_path = public;

-- 1. DATA PATCH: Corrigir histórico corrompido
UPDATE public.financial_transactions SET type = 'credit' WHERE type = 'IN';
UPDATE public.financial_transactions SET type = 'debit' WHERE type = 'OUT';

-- 2. HARDENING: Blindar a tabela para nunca mais aceitar strings inválidas
ALTER TABLE public.financial_transactions 
ADD CONSTRAINT chk_transaction_type CHECK (type IN ('credit', 'debit'));

-- 3. FIX RPC: Atualizar a função modular para usar os termos corretos
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

GRANT EXECUTE ON FUNCTION public.rpc_ops_financial_process_action(UUID, UUID, NUMERIC, NUMERIC, TEXT, DATE, JSONB) TO authenticated;

-- 4. FORÇAR RECÁLCULO GLOBAL (Visto que UPDATE não dispara os triggers de INSERT/DELETE)

-- Forçar recálculo de todas as contas
UPDATE public.accounts a
SET 
  balance = COALESCE((
    SELECT SUM(
      CASE
        WHEN type = 'credit' THEN amount
        WHEN type = 'debit'  THEN -amount
        ELSE 0
      END
    )
    FROM public.financial_transactions ft
    WHERE ft.account_id = a.id
  ), 0),
  updated_at = now();

-- Forçar recálculo de todas as entries (usando a mesma lógica do fn_update_entry_paid_amount do fix 20260308)
DO $$
DECLARE
  r RECORD;
  v_paid_amount NUMERIC;
BEGIN
  FOR r IN SELECT id, type, total_amount FROM public.financial_entries LOOP
    SELECT COALESCE(SUM(
      CASE 
        WHEN r.type = 'payable' THEN
          CASE WHEN type = 'debit' THEN amount WHEN type = 'credit' THEN -amount ELSE 0 END
        WHEN r.type = 'receivable' THEN
          CASE WHEN type = 'credit' THEN amount WHEN type = 'debit' THEN -amount ELSE 0 END
        ELSE 
          CASE WHEN type = 'credit' THEN amount WHEN type = 'debit' THEN -amount ELSE amount END
      END
    ), 0) INTO v_paid_amount
    FROM public.financial_transactions
    WHERE entry_id = r.id;

    UPDATE public.financial_entries SET
      paid_amount = v_paid_amount,
      status = CASE
        WHEN v_paid_amount >= total_amount AND total_amount > 0 THEN 'paid'::financial_entry_status
        WHEN v_paid_amount > 0 THEN 'partially_paid'::financial_entry_status
        ELSE 'pending'::financial_entry_status
      END,
      updated_at = now()
    WHERE id = r.id;
  END LOOP;
END;
$$;
