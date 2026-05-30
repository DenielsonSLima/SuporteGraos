-- ============================================================================
-- Migration: Fix initial balance RPC functions and recalculate Implantação account balance
-- Date: 2026-05-29
-- ============================================================================

SET search_path = public;

-- 1. Redefinir public.rpc_set_initial_balance com a correção de tipos de transações e delegação centralizada
CREATE OR REPLACE FUNCTION public.rpc_set_initial_balance(p_account_id uuid, p_account_name text, p_date date, p_value numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_company_id UUID;
  v_caller_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id
  FROM accounts WHERE id = p_account_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Conta nao encontrada: %', p_account_id;
  END IF;

  SELECT au.company_id
    INTO v_caller_company_id
  FROM public.app_users au
  WHERE au.auth_user_id = (SELECT auth.uid())
    AND au.active = true
  LIMIT 1;

  IF v_caller_company_id IS NULL OR v_caller_company_id <> v_company_id THEN
    RAISE EXCEPTION 'Access denied: caller does not belong to company %', v_company_id;
  END IF;

  INSERT INTO initial_balances (id, company_id, account_id, account_name, date, value)
  VALUES (gen_random_uuid(), v_company_id, p_account_id, p_account_name, p_date, p_value)
  ON CONFLICT (company_id, account_id)
  DO UPDATE SET
    account_name = EXCLUDED.account_name,
    date = EXCLUDED.date,
    value = EXCLUDED.value;

  -- Delegar o cálculo do saldo consolidado para a função centralizada e correta
  PERFORM public.fn_update_account_balance_by_id(p_account_id, v_company_id);
END;
$function$;

-- 2. Redefinir public.rpc_remove_initial_balance com delegação centralizada
CREATE OR REPLACE FUNCTION public.rpc_remove_initial_balance(p_balance_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_account_id UUID;
  v_company_id UUID;
  v_caller_company_id UUID;
BEGIN
  SELECT ib.account_id, ib.company_id
    INTO v_account_id, v_company_id
  FROM initial_balances ib
  WHERE ib.id = p_balance_id;

  IF v_account_id IS NULL OR v_company_id IS NULL THEN
    RAISE EXCEPTION 'Saldo inicial nao encontrado: %', p_balance_id;
  END IF;

  SELECT au.company_id
    INTO v_caller_company_id
  FROM public.app_users au
  WHERE au.auth_user_id = (SELECT auth.uid())
    AND au.active = true
  LIMIT 1;

  IF v_caller_company_id IS NULL OR v_caller_company_id <> v_company_id THEN
    RAISE EXCEPTION 'Access denied: caller does not belong to company %', v_company_id;
  END IF;

  DELETE FROM initial_balances WHERE id = p_balance_id;

  -- Delegar o cálculo do saldo consolidado para a função centralizada e correta
  PERFORM public.fn_update_account_balance_by_id(v_account_id, v_company_id);
END;
$function$;

-- 3. Atualizar dinamicamente o saldo inicial da conta de Implantação para que seu saldo atual fique em R$ 0,00
DO $$
DECLARE
  r_account RECORD;
  v_tx_sum NUMERIC;
BEGIN
  FOR r_account IN 
    SELECT id, company_id 
    FROM public.accounts 
    WHERE lower(account_name) IN ('implantação', 'implantacao')
  LOOP
    -- Calcular a soma real das transações com o algoritmo correto
    SELECT COALESCE(SUM(
      CASE
        WHEN lower(type) IN ('credit', 'in') THEN amount
        WHEN lower(type) IN ('debit', 'out') THEN -amount
        ELSE 0
      END
    ), 0) INTO v_tx_sum
    FROM public.financial_transactions
    WHERE account_id = r_account.id
      AND company_id = r_account.company_id;

    -- Ajustar o valor do saldo inicial para que seja exatamente o oposto da soma das transações
    -- fazendo com que saldo_atual = v_initial + v_tx_sum = 0
    UPDATE public.initial_balances
    SET value = -v_tx_sum
    WHERE account_id = r_account.id
      AND company_id = r_account.company_id;

    -- Recalcular o saldo consolidado da conta de Implantação
    PERFORM public.fn_update_account_balance_by_id(r_account.id, r_account.company_id);
  END LOOP;
END $$;
