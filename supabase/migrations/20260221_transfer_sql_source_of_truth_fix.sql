-- ============================================================================
-- Fix definitivo: transferências SQL-first + reconciliação de saldos
-- Data: 2026-02-21
-- Objetivos:
--   1) Frontend não calcula saldo; SQL é fonte da verdade
--   2) Edit/Delete de transferência ajustam financial_transactions no banco
--   3) Recalcular saldo aceitando tipos legacy (IN/OUT) e novos (credit/debit)
--   4) Evitar histórico órfão após excluir transferência
-- ============================================================================

-- 1) Vincular transações ao registro de transferência
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS transfer_id UUID REFERENCES public.transfers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_financial_transactions_transfer
  ON public.financial_transactions(transfer_id);

-- 2) Backfill parcial (heurístico) para transações antigas de transferência
UPDATE public.financial_transactions ft
SET transfer_id = t.id
FROM public.transfers t
WHERE ft.transfer_id IS NULL
  AND ft.company_id = t.company_id
  AND ft.transaction_date = t.transfer_date
  AND ft.amount = t.amount
  AND (
    (ft.account_id = t.account_from_id AND lower(ft.type) IN ('debit', 'out'))
    OR
    (ft.account_id = t.account_to_id AND lower(ft.type) IN ('credit', 'in'))
  )
  AND coalesce(ft.description, '') ILIKE '%transfer%';

-- 3) Recalcular saldo de conta com compatibilidade de tipos + saldo inicial
CREATE OR REPLACE FUNCTION public.fn_update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_account_id UUID;
  v_company_id UUID;
BEGIN
  v_account_id := COALESCE(NEW.account_id, OLD.account_id);
  v_company_id := COALESCE(NEW.company_id, OLD.company_id);

  UPDATE public.accounts a
  SET
    balance = (
      COALESCE((
        SELECT ib.value
        FROM public.initial_balances ib
        WHERE ib.account_id = a.id AND ib.company_id = a.company_id
        LIMIT 1
      ), 0)
      +
      COALESCE((
        SELECT SUM(
          CASE
            WHEN lower(ft.type) IN ('credit', 'in') THEN ft.amount
            WHEN lower(ft.type) IN ('debit', 'out') THEN -ft.amount
            ELSE 0
          END
        )
        FROM public.financial_transactions ft
        WHERE ft.account_id = a.id
          AND ft.company_id = a.company_id
      ), 0)
    ),
    updated_at = now()
  WHERE a.id = v_account_id
    AND a.company_id = v_company_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_financial_transactions_update_account_balance ON public.financial_transactions;
CREATE TRIGGER trg_financial_transactions_update_account_balance
AFTER INSERT OR DELETE OR UPDATE ON public.financial_transactions
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_account_balance();

-- Compatibilidade com trigger alternativo de ambientes legados
CREATE OR REPLACE FUNCTION public.trg_recalc_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.fn_update_account_balance();
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4) RPC create transfer (canônica)
CREATE OR REPLACE FUNCTION public.rpc_transfer_between_accounts(
  p_account_from_id UUID,
  p_account_to_id   UUID,
  p_amount          DECIMAL,
  p_description     TEXT DEFAULT NULL,
  p_transfer_date   DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_transfer_id UUID;
  v_user_id UUID;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  SELECT id INTO v_user_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF p_account_from_id = p_account_to_id THEN
    RAISE EXCEPTION 'Conta de origem e destino não podem ser iguais';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = p_account_from_id AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Conta de origem não encontrada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = p_account_to_id AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Conta de destino não encontrada';
  END IF;

  INSERT INTO public.transfers (
    company_id,
    account_from_id,
    account_to_id,
    amount,
    description,
    transfer_date,
    status
  ) VALUES (
    v_company_id,
    p_account_from_id,
    p_account_to_id,
    p_amount,
    p_description,
    p_transfer_date,
    'completed'
  ) RETURNING id INTO v_transfer_id;

  INSERT INTO public.financial_transactions (
    company_id,
    transfer_id,
    account_id,
    type,
    amount,
    transaction_date,
    created_by,
    description
  ) VALUES (
    v_company_id,
    v_transfer_id,
    p_account_from_id,
    'debit',
    p_amount,
    p_transfer_date,
    v_user_id,
    COALESCE(p_description, 'Transferência entre contas')
  );

  INSERT INTO public.financial_transactions (
    company_id,
    transfer_id,
    account_id,
    type,
    amount,
    transaction_date,
    created_by,
    description
  ) VALUES (
    v_company_id,
    v_transfer_id,
    p_account_to_id,
    'credit',
    p_amount,
    p_transfer_date,
    v_user_id,
    COALESCE(p_description, 'Transferência entre contas')
  );

  RETURN v_transfer_id;
END;
$$;

-- 5) RPC update transfer (reconstrói lançamentos da transferência)
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
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  SELECT id INTO v_user_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF p_account_from_id = p_account_to_id THEN
    RAISE EXCEPTION 'Conta de origem e destino não podem ser iguais';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.transfers t
    WHERE t.id = p_transfer_id
      AND t.company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Transferência não encontrada';
  END IF;

  UPDATE public.transfers
  SET account_from_id = p_account_from_id,
      account_to_id = p_account_to_id,
      amount = p_amount,
      description = p_description,
      transfer_date = p_transfer_date,
      updated_at = now()
  WHERE id = p_transfer_id
    AND company_id = v_company_id;

  DELETE FROM public.financial_transactions
  WHERE transfer_id = p_transfer_id
    AND company_id = v_company_id;

  INSERT INTO public.financial_transactions (
    company_id,
    transfer_id,
    account_id,
    type,
    amount,
    transaction_date,
    created_by,
    description
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
    company_id,
    transfer_id,
    account_id,
    type,
    amount,
    transaction_date,
    created_by,
    description
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

-- 6) RPC delete transfer (remove lançamentos vinculados + transferência)
CREATE OR REPLACE FUNCTION public.rpc_delete_transfer_between_accounts(
  p_transfer_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.transfers
    WHERE id = p_transfer_id
      AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Transferência não encontrada';
  END IF;

  DELETE FROM public.financial_transactions
  WHERE transfer_id = p_transfer_id
    AND company_id = v_company_id;

  DELETE FROM public.transfers
  WHERE id = p_transfer_id
    AND company_id = v_company_id;
END;
$$;

-- 7) Reprocessamento único para corrigir saldos residuais legados
WITH recalculated AS (
  SELECT
    a.id AS account_id,
    a.company_id,
    COALESCE(ib.value, 0) AS initial_value,
    COALESCE(SUM(
      CASE
        WHEN lower(ft.type) IN ('credit', 'in') THEN ft.amount
        WHEN lower(ft.type) IN ('debit', 'out') THEN -ft.amount
        ELSE 0
      END
    ), 0) AS tx_sum
  FROM public.accounts a
  LEFT JOIN public.initial_balances ib
    ON ib.account_id = a.id
   AND ib.company_id = a.company_id
  LEFT JOIN public.financial_transactions ft
    ON ft.account_id = a.id
   AND ft.company_id = a.company_id
  GROUP BY a.id, a.company_id, ib.value
)
UPDATE public.accounts a
SET balance = r.initial_value + r.tx_sum,
    updated_at = now()
FROM recalculated r
WHERE a.id = r.account_id
  AND a.company_id = r.company_id;
