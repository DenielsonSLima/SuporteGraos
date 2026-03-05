-- ============================================================================
-- Migration: Criar RPCs server-side para recalcular saldos
-- Data: 2026-03-03
-- ============================================================================
-- CORRIGE VIOLAÇÃO SKIL "Saldo Sagrado":
--   O frontend NÃO PODE fazer UPDATE direto em current_balance.
--   Saldos devem ser atualizados SOMENTE via RPCs/Triggers server-side.
--
-- Cria:
--   1. rpc_recalc_shareholder_balance(p_shareholder_id) → recalcula saldo
--      do sócio a partir da soma das transações
--   2. rpc_recalc_account_balances(p_company_id) → recalcula todos os saldos
--      de contas bancárias da empresa (para migration legacy one-shot)
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 1. RPC: Recalcular saldo de um sócio
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.rpc_recalc_shareholder_balance(
  p_shareholder_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_company UUID;
  v_sh_company     UUID;
  v_balance        NUMERIC := 0;
BEGIN
  -- GATE 1: Sessão ativa
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- GATE 2: Company do caller
  SELECT company_id INTO v_caller_company
  FROM public.app_users
  WHERE auth_user_id = (SELECT auth.uid())
    AND active = true
  LIMIT 1;

  IF v_caller_company IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa ativa';
  END IF;

  -- GATE 3: O sócio pertence à empresa do caller
  SELECT company_id INTO v_sh_company
  FROM public.shareholders
  WHERE id = p_shareholder_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sócio não encontrado: %', p_shareholder_id;
  END IF;

  IF v_sh_company <> v_caller_company THEN
    RAISE EXCEPTION 'Acesso negado: sócio não pertence à sua empresa';
  END IF;

  -- Tentar usar a VIEW v_shareholder_balances se existir
  BEGIN
    SELECT COALESCE(computed_balance, 0)
    INTO v_balance
    FROM public.v_shareholder_balances
    WHERE shareholder_id = p_shareholder_id;
  EXCEPTION WHEN undefined_table THEN
    -- Fallback: cálculo direto via SUM
    SELECT COALESCE(
      SUM(CASE WHEN type = 'credit' THEN value ELSE -value END),
      0
    )
    INTO v_balance
    FROM public.shareholder_transactions
    WHERE shareholder_id = p_shareholder_id;
  END;

  -- Atualizar saldo (server-side, atomicamente)
  UPDATE public.shareholders
  SET current_balance = v_balance
  WHERE id = p_shareholder_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_recalc_shareholder_balance(UUID) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. RPC: Recalcular saldos de TODAS as contas bancárias da empresa
--    (para substituir a migration one-shot que rodava no frontend)
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.rpc_recalc_account_balances(
  p_company_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_company  UUID;
  v_account         RECORD;
  v_initial         NUMERIC;
  v_tx_sum          NUMERIC;
  v_updated_count   INTEGER := 0;
BEGIN
  -- GATE 1: Sessão ativa
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- GATE 2: Company do caller deve bater com p_company_id
  SELECT company_id INTO v_caller_company
  FROM public.app_users
  WHERE auth_user_id = (SELECT auth.uid())
    AND active = true
  LIMIT 1;

  IF v_caller_company IS NULL OR v_caller_company <> p_company_id THEN
    RAISE EXCEPTION 'Acesso negado: company_id não corresponde ao caller';
  END IF;

  -- Iterar contas ativas e recalcular
  FOR v_account IN
    SELECT id
    FROM public.accounts
    WHERE company_id = p_company_id
      AND is_active = true
  LOOP
    -- Saldo inicial
    SELECT COALESCE(SUM(ib.value), 0)
    INTO v_initial
    FROM public.initial_balances ib
    WHERE ib.company_id = p_company_id
      AND ib.account_id = v_account.id;

    -- Soma das transações
    SELECT COALESCE(SUM(
      CASE
        WHEN UPPER(ft.type) = 'IN' THEN ft.amount
        WHEN UPPER(ft.type) = 'OUT' THEN -ft.amount
        ELSE 0
      END
    ), 0)
    INTO v_tx_sum
    FROM public.financial_transactions ft
    WHERE ft.company_id = p_company_id
      AND ft.account_id = v_account.id;

    -- Atualizar saldo
    UPDATE public.accounts
    SET balance = v_initial + v_tx_sum
    WHERE id = v_account.id;

    v_updated_count := v_updated_count + 1;
  END LOOP;

  RETURN json_build_object('updated', v_updated_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_recalc_account_balances(UUID) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO
-- ════════════════════════════════════════════════════════════════════════════
SELECT 'MIGRATION_20260303_RECALC_BALANCE_RPCS_OK' AS status;
