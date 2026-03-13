-- ============================================================================
-- Migration: Add parent_id to advances and update rpc_create_advance
-- ============================================================================

-- 1. Add parent_id column
ALTER TABLE public.advances 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.advances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_advances_parent_id ON public.advances(parent_id);

-- 2. Update rpc_create_advance to support linked settlements
CREATE OR REPLACE FUNCTION public.rpc_create_advance(
  p_recipient_id    UUID,
  p_recipient_type  TEXT,
  p_amount          DECIMAL,
  p_account_id      UUID,
  p_description     TEXT DEFAULT NULL,
  p_advance_date    DATE DEFAULT CURRENT_DATE,
  p_parent_id       UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_company_id UUID;
  v_user_id UUID;
  v_advance_id UUID;
  v_entry_type TEXT;
  v_transaction_type TEXT;
  v_parent_remaining DECIMAL;
BEGIN
  -- Busca company_id e user_id
  SELECT company_id, id INTO v_company_id, v_user_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor do adiantamento deve ser maior que zero';
  END IF;

  IF p_recipient_type NOT IN ('supplier', 'client', 'shareholder') THEN
    RAISE EXCEPTION 'Tipo de destinatário inválido: %', p_recipient_type;
  END IF;

  -- 1. Se tem p_parent_id, valida se existe e pertence à mesma empresa
  IF p_parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.advances 
      WHERE id = p_parent_id AND company_id = v_company_id
    ) THEN
      RAISE EXCEPTION 'Adiantamento pai não encontrado';
    END IF;
  END IF;

  -- 2. INSERT advance
  INSERT INTO public.advances (
    company_id, recipient_id, recipient_type,
    amount, description, advance_date, status, parent_id
  ) VALUES (
    v_company_id, p_recipient_id, p_recipient_type,
    p_amount, p_description, p_advance_date, 'open', p_parent_id
  ) RETURNING id INTO v_advance_id;

  -- 3. Determina tipo da entry e da transaction
  --    Se for um adiantamento NOVO (sem parent_id):
  --      Adiantamento para supplier ou shareholder → eles nos devem → receivable + débito (saída)
  --      Adiantamento de cliente → nós devemos entregar → payable + débito (saída? Não, entrada? Na verdade adiantamento recebido é entrada, mas o ERP trata como saída se for "concedido" ou "recebido" dependendo do ponto de vista. No RPC antigo era sempre DEBIT).
  
  --    AJUSTE DE LÓGICA:
  --    Se p_parent_id IS NULL:
  --        É um adiantamento ORIGINAL (saída de dinheiro da empresa para o parceiro):
  --        - Transaction: DEBIT (saída do banco)
  --        - Entry: Receivable (se supplier/shareholder) ou Payable (se cliente - compromisso de entrega)
  
  --    Se p_parent_id IS NOT NULL:
  --        É uma QUITAÇÃO/BAIXA (entrada de dinheiro ou abatimento):
  --        - Transaction: CREDIT (entrada no banco)
  --        - Entry: Oposta à original para abater.
  
  IF p_parent_id IS NULL THEN
    v_transaction_type := 'debit';
    IF p_recipient_type IN ('supplier', 'shareholder') THEN
      v_entry_type := 'receivable';
    ELSE
      v_entry_type := 'payable';
    END IF;
  ELSE
    v_transaction_type := 'credit';
    IF p_recipient_type IN ('supplier', 'shareholder') THEN
      v_entry_type := 'payable'; -- Abatimento do receivable
    ELSE
      v_entry_type := 'receivable'; -- Abatimento do payable
    END IF;
    
    -- Atualiza o adiantamento pai
    UPDATE public.advances
    SET settled_amount = settled_amount + p_amount,
        status = CASE 
          WHEN (settled_amount + p_amount) >= amount THEN 'settled'
          ELSE 'partially_settled'
        END,
        settlement_date = CASE 
          WHEN (settled_amount + p_amount) >= amount THEN p_advance_date
          ELSE settlement_date
        END
    WHERE id = p_parent_id;
  END IF;

  -- 4. INSERT financial_entry
  INSERT INTO public.financial_entries (
    company_id, type, origin_type, origin_id,
    partner_id, total_amount, created_date, status
  ) VALUES (
    v_company_id, v_entry_type, 'advance', v_advance_id,
    p_recipient_id, p_amount, p_advance_date, 
    CASE WHEN p_parent_id IS NOT NULL THEN 'paid' ELSE 'open' END
  );

  -- 5. INSERT financial_transaction
  INSERT INTO public.financial_transactions (
    company_id, account_id, type, amount,
    transaction_date, created_by, description, entry_id
  ) VALUES (
    v_company_id, p_account_id, v_transaction_type, p_amount,
    p_advance_date, v_user_id,
    COALESCE(p_description, CASE WHEN p_parent_id IS NULL THEN 'Adiantamento' ELSE 'Baixa de Adiantamento' END),
    (SELECT id FROM public.financial_entries WHERE origin_id = v_advance_id LIMIT 1)
  );

  RETURN v_advance_id;
END;
$$;
