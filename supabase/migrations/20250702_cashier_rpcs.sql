-- ============================================================================
-- 1. RPC: rpc_set_initial_balance
-- Atomicamente: UPSERT initial_balances + UPDATE accounts.balance
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_set_initial_balance(
  p_account_id UUID,
  p_account_name TEXT,
  p_date DATE,
  p_value NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_tx_sum NUMERIC;
BEGIN
  SELECT company_id INTO v_company_id
  FROM accounts WHERE id = p_account_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Conta nao encontrada: %', p_account_id;
  END IF;

  INSERT INTO initial_balances (id, company_id, account_id, account_name, date, value)
  VALUES (gen_random_uuid(), v_company_id, p_account_id, p_account_name, p_date, p_value)
  ON CONFLICT (company_id, account_id)
  DO UPDATE SET
    account_name = EXCLUDED.account_name,
    date = EXCLUDED.date,
    value = EXCLUDED.value;

  SELECT COALESCE(SUM(
    CASE WHEN type = 'IN' THEN amount ELSE -amount END
  ), 0) INTO v_tx_sum
  FROM financial_transactions
  WHERE account_id = p_account_id;

  UPDATE accounts
  SET balance = p_value + v_tx_sum,
      updated_at = now()
  WHERE id = p_account_id;
END;
$$;

-- ============================================================================
-- 2. RPC: rpc_remove_initial_balance
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_remove_initial_balance(
  p_balance_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id UUID;
  v_tx_sum NUMERIC;
BEGIN
  SELECT account_id INTO v_account_id
  FROM initial_balances WHERE id = p_balance_id;

  IF v_account_id IS NULL THEN
    RAISE EXCEPTION 'Saldo inicial nao encontrado: %', p_balance_id;
  END IF;

  DELETE FROM initial_balances WHERE id = p_balance_id;

  SELECT COALESCE(SUM(
    CASE WHEN type = 'IN' THEN amount ELSE -amount END
  ), 0) INTO v_tx_sum
  FROM financial_transactions
  WHERE account_id = v_account_id;

  UPDATE accounts
  SET balance = v_tx_sum,
      updated_at = now()
  WHERE id = v_account_id;
END;
$$;

-- ============================================================================
-- 3. TRIGGER: Recalcular accounts.balance ao inserir/deletar transactions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_recalc_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_account_id UUID;
  v_initial NUMERIC;
  v_tx_sum NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_account_id := OLD.account_id;
  ELSE
    v_account_id := NEW.account_id;
  END IF;

  SELECT COALESCE(ib.value, 0) INTO v_initial
  FROM accounts a
  LEFT JOIN initial_balances ib ON ib.account_id = a.id AND ib.company_id = a.company_id
  WHERE a.id = v_account_id;

  SELECT COALESCE(SUM(
    CASE WHEN type = 'IN' THEN amount ELSE -amount END
  ), 0) INTO v_tx_sum
  FROM financial_transactions
  WHERE account_id = v_account_id;

  UPDATE accounts
  SET balance = v_initial + v_tx_sum,
      updated_at = now()
  WHERE id = v_account_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_balance_on_tx ON financial_transactions;
CREATE TRIGGER trg_recalc_balance_on_tx
AFTER INSERT OR DELETE OR UPDATE ON financial_transactions
FOR EACH ROW
EXECUTE FUNCTION trg_recalc_account_balance();

-- ============================================================================
-- 4. Garantir constraint UNIQUE em initial_balances
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'initial_balances_company_account_unique'
  ) THEN
    ALTER TABLE initial_balances
    ADD CONSTRAINT initial_balances_company_account_unique
    UNIQUE (company_id, account_id);
  END IF;
END $$;

-- ============================================================================
-- 5. RPC: rpc_cashier_report
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_cashier_report(p_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'bankBalances', COALESCE((
      SELECT json_agg(json_build_object(
        'id', a.id,
        'bankName', a.account_name,
        'owner', a.owner,
        'balance', COALESCE(a.balance, 0)
      ) ORDER BY a.account_name)
      FROM accounts a
      WHERE a.company_id = p_company_id AND a.is_active = true
    ), '[]'::json),
    'totalBankBalance', COALESCE((
      SELECT SUM(a.balance)
      FROM accounts a
      WHERE a.company_id = p_company_id AND a.is_active = true
    ), 0),
    'initialBalances', COALESCE((
      SELECT json_agg(json_build_object(
        'id', ib.id,
        'accountId', ib.account_id,
        'accountName', ib.account_name,
        'date', ib.date,
        'value', ib.value
      ))
      FROM initial_balances ib
      WHERE ib.company_id = p_company_id
    ), '[]'::json),
    'totalInitialBalance', COALESCE((
      SELECT SUM(ib.value)
      FROM initial_balances ib
      WHERE ib.company_id = p_company_id
    ), 0)
  ) INTO result;

  RETURN result;
END;
$$;

SELECT 'ALL SQL FUNCTIONS CREATED SUCCESSFULLY' as status;
