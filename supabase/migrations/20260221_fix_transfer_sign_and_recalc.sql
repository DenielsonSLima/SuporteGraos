-- ============================================================================
-- FIX: Sinal de Transferências/Recebimentos no Livro Financeiro
-- Data: 2026-02-21
-- Objetivo:
--   1) Normalizar tipos legacy em financial_transactions para IN/OUT
--   2) Recalcular saldos impactados (contas_bancarias e accounts, se existirem)
-- ============================================================================

-- 1) Normalização dos tipos de movimentação
UPDATE public.financial_transactions
SET type = 'IN'
WHERE upper(coalesce(type, '')) IN ('RECEIPT', 'CREDIT', 'RECEBIMENTO', 'ENTRADA');

UPDATE public.financial_transactions
SET type = 'OUT'
WHERE upper(coalesce(type, '')) IN ('PAYMENT', 'DEBIT', 'PAGAMENTO', 'SAIDA', 'SAÍDA', 'TRANSFER');

-- 2) Recalcular saldo de contas_bancarias (modelo legacy em produção)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contas_bancarias'
      AND column_name = 'current_balance'
  ) THEN
    UPDATE public.contas_bancarias cb
    SET current_balance = COALESCE(cb.initial_balance, 0) + COALESCE((
      SELECT SUM(
        CASE
          WHEN upper(coalesce(ft.type, '')) IN ('IN', 'CREDIT', 'RECEIPT', 'RECEBIMENTO', 'ENTRADA') THEN ft.amount
          WHEN upper(coalesce(ft.type, '')) IN ('OUT', 'DEBIT', 'PAYMENT', 'PAGAMENTO', 'SAIDA', 'SAÍDA', 'TRANSFER') THEN -ft.amount
          ELSE 0
        END
      )
      FROM public.financial_transactions ft
      WHERE ft.bank_account_id = cb.id
    ), 0),
    updated_at = now();
  END IF;
END $$;

-- 3) Recalcular saldo de accounts (modelo SQL-first novo), se aplicável
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'accounts'
      AND column_name = 'balance'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'financial_transactions'
      AND column_name = 'account_id'
  ) THEN
    UPDATE public.accounts a
    SET balance = COALESCE((
      SELECT SUM(
        CASE
          WHEN upper(coalesce(ft.type, '')) IN ('IN', 'CREDIT', 'RECEIPT', 'RECEBIMENTO', 'ENTRADA') THEN ft.amount
          WHEN upper(coalesce(ft.type, '')) IN ('OUT', 'DEBIT', 'PAYMENT', 'PAGAMENTO', 'SAIDA', 'SAÍDA', 'TRANSFER') THEN -ft.amount
          ELSE 0
        END
      )
      FROM public.financial_transactions ft
      WHERE ft.account_id = a.id
    ), 0),
    updated_at = now();
  END IF;
END $$;

SELECT 'FIX_TRANSFER_SIGN_AND_RECALC_DONE' AS status;
