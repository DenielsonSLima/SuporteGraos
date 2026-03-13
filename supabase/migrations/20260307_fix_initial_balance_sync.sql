-- ============================================================================
-- Correção: Integrar Saldo Inicial no cálculo de saldo das contas
-- Data: 2026-03-07
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_account_id UUID;
  v_company_id UUID;
  v_initial    DECIMAL := 0;
  v_tx_sum     DECIMAL := 0;
BEGIN
  v_account_id := COALESCE(NEW.account_id, OLD.account_id);
  v_company_id := COALESCE(NEW.company_id, OLD.company_id);

  -- 1. Buscar saldo inicial da conta
  SELECT COALESCE(SUM(value), 0)
  INTO v_initial
  FROM public.initial_balances
  WHERE account_id = v_account_id
    AND company_id = v_company_id;

  -- 2. Somar transações
  SELECT COALESCE(SUM(
    CASE
      WHEN type = 'credit' THEN amount
      WHEN type = 'debit'  THEN -amount
      ELSE 0
    END
  ), 0)
  INTO v_tx_sum
  FROM public.financial_transactions
  WHERE account_id = v_account_id
    AND company_id = v_company_id;

  -- 3. Atualizar saldo consolidado
  UPDATE public.accounts SET
    balance = v_initial + v_tx_sum,
    updated_at = now()
  WHERE id = v_account_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Garantir que mudanças no initial_balances também disparem o recálculo
DROP TRIGGER IF EXISTS trg_initial_balances_recalc_account_balance ON public.initial_balances;
CREATE TRIGGER trg_initial_balances_recalc_account_balance
AFTER INSERT OR UPDATE OR DELETE ON public.initial_balances
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_account_balance();

-- Comando para correção retroativa (Rodar manualmente no SQL Editor se necessário):
-- UPDATE public.accounts a SET
--   balance = (SELECT COALESCE(SUM(value), 0) FROM public.initial_balances WHERE account_id = a.id) +
--             (SELECT COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE -amount END), 0) FROM public.financial_transactions WHERE account_id = a.id);
