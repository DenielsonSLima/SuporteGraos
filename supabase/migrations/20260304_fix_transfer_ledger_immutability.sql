-- ============================================================================
-- Fix: Transferências — Imutabilidade do Ledger (financial_transactions)
-- Data: 2026-03-04
-- Problema: rpc_update e rpc_delete faziam DELETE FROM financial_transactions,
--           quebrando a regra canônica de "ledger imutável".
-- Solução:
--   • UPDATE → insere estorno (reversal) das parcelas antigas + novos lançamentos
--   • DELETE → insere estorno (reversal) das parcelas + marca transfer como cancelled
-- ============================================================================

-- 1) RPC update transfer — estorno + novos lançamentos (ledger imutável)
CREATE OR REPLACE FUNCTION public.rpc_update_transfer_between_accounts(
  p_transfer_id      UUID,
  p_account_from_id  UUID,
  p_account_to_id    UUID,
  p_amount           DECIMAL,
  p_description      TEXT DEFAULT NULL,
  p_transfer_date    DATE DEFAULT CURRENT_DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_user_id UUID;
  v_old_tx RECORD;
BEGIN
  -- Autenticação
  SELECT au.company_id, au.id INTO v_company_id, v_user_id
  FROM public.app_users au
  WHERE au.auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  -- Validações
  IF p_account_from_id = p_account_to_id THEN
    RAISE EXCEPTION 'Conta de origem e destino não podem ser iguais';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.transfers t
    WHERE t.id = p_transfer_id AND t.company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Transferência não encontrada';
  END IF;

  -- ══════════════════════════════════════════════════════════════
  -- PASSO 1: Estorno (reversal) dos lançamentos antigos
  -- Em vez de DELETE, inserimos lançamentos invertidos para manter
  -- o ledger 100% imutável e auditável.
  -- ══════════════════════════════════════════════════════════════
  FOR v_old_tx IN
    SELECT account_id, type, amount, transaction_date, description
    FROM public.financial_transactions
    WHERE transfer_id = p_transfer_id
      AND company_id = v_company_id
  LOOP
    INSERT INTO public.financial_transactions (
      company_id, transfer_id, account_id, type, amount,
      transaction_date, created_by, description
    ) VALUES (
      v_company_id,
      p_transfer_id,
      v_old_tx.account_id,
      CASE WHEN v_old_tx.type = 'debit' THEN 'credit' ELSE 'debit' END,
      v_old_tx.amount,
      now()::date,
      v_user_id,
      '[ESTORNO] ' || COALESCE(v_old_tx.description, 'Transferência entre contas')
    );
  END LOOP;

  -- ══════════════════════════════════════════════════════════════
  -- PASSO 2: Atualizar o registro da transferência
  -- ══════════════════════════════════════════════════════════════
  UPDATE public.transfers
  SET account_from_id = p_account_from_id,
      account_to_id = p_account_to_id,
      amount = p_amount,
      description = p_description,
      transfer_date = p_transfer_date,
      updated_at = now()
  WHERE id = p_transfer_id
    AND company_id = v_company_id;

  -- ══════════════════════════════════════════════════════════════
  -- PASSO 3: Novos lançamentos com valores atualizados
  -- ══════════════════════════════════════════════════════════════
  INSERT INTO public.financial_transactions (
    company_id, transfer_id, account_id, type, amount,
    transaction_date, created_by, description
  ) VALUES (
    v_company_id,
    p_transfer_id,
    p_account_from_id,
    'debit',
    p_amount,
    p_transfer_date,
    v_user_id,
    COALESCE(p_description, 'Transferência entre contas')
  );

  INSERT INTO public.financial_transactions (
    company_id, transfer_id, account_id, type, amount,
    transaction_date, created_by, description
  ) VALUES (
    v_company_id,
    p_transfer_id,
    p_account_to_id,
    'credit',
    p_amount,
    p_transfer_date,
    v_user_id,
    COALESCE(p_description, 'Transferência entre contas')
  );
END;
$$;

-- 2) RPC delete transfer — estorno + cancelamento (ledger imutável)
CREATE OR REPLACE FUNCTION public.rpc_delete_transfer_between_accounts(
  p_transfer_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_user_id UUID;
  v_old_tx RECORD;
BEGIN
  -- Autenticação
  SELECT au.company_id, au.id INTO v_company_id, v_user_id
  FROM public.app_users au
  WHERE au.auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.transfers
    WHERE id = p_transfer_id AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Transferência não encontrada';
  END IF;

  -- ══════════════════════════════════════════════════════════════
  -- PASSO 1: Estorno (reversal) de todos os lançamentos
  -- Insere lançamentos invertidos para anular o efeito financeiro,
  -- mantendo o histórico completo no ledger.
  -- ══════════════════════════════════════════════════════════════
  FOR v_old_tx IN
    SELECT account_id, type, amount, transaction_date, description
    FROM public.financial_transactions
    WHERE transfer_id = p_transfer_id
      AND company_id = v_company_id
      -- Apenas estorna lançamentos originais (não estornos anteriores)
      AND COALESCE(description, '') NOT LIKE '[ESTORNO]%'
  LOOP
    INSERT INTO public.financial_transactions (
      company_id, transfer_id, account_id, type, amount,
      transaction_date, created_by, description
    ) VALUES (
      v_company_id,
      p_transfer_id,
      v_old_tx.account_id,
      CASE WHEN v_old_tx.type = 'debit' THEN 'credit' ELSE 'debit' END,
      v_old_tx.amount,
      now()::date,
      v_user_id,
      '[ESTORNO] ' || COALESCE(v_old_tx.description, 'Transferência entre contas')
    );
  END LOOP;

  -- ══════════════════════════════════════════════════════════════
  -- PASSO 2: Marcar a transferência como cancelada
  -- Não apagamos — preservamos para auditoria.
  -- ══════════════════════════════════════════════════════════════
  UPDATE public.transfers
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = p_transfer_id
    AND company_id = v_company_id;
END;
$$;
