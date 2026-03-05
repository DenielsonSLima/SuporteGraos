-- ============================================================================
-- Migration 014: Triggers e Functions para Cálculo Automático
-- ============================================================================
-- Os 5 TRIGGERS que mantêm tudo consistente:
--
-- 1. fn_update_account_balance()
--    Quando: INSERT/DELETE financial_transaction
--    Faz: Recalcula accounts.balance = SUM(transactions) para aquela conta
--
-- 2. fn_update_entry_paid_amount()
--    Quando: INSERT/DELETE financial_transaction (entry_id NOT NULL)
--    Faz: Recalcula financial_entries.paid_amount = SUM(débitos)
--
-- 3. fn_update_entry_status()
--    Quando: UPDATE financial_entries.paid_amount
--    Faz: Muda status (open → partially_paid → paid) + seta paid_date
--
-- 4. fn_validate_account_balance()
--    Quando: INSERT financial_transaction (type='debit')
--    Faz: Valida se tem saldo suficiente (se allows_negative=false)
--
-- 5. fn_sync_origin_status()
--    Quando: UPDATE financial_entries.status = 'paid'
--    Faz: Atualiza purchase_orders ou sales_orders para 'paid'
-- ============================================================================

-- ============================================================================
-- TRIGGER 1: Recalcular saldo da conta
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualiza o saldo da conta baseado na soma de todas as transações
  UPDATE public.accounts SET
    balance = COALESCE((
      SELECT SUM(
        CASE
          WHEN type = 'credit' THEN amount
          WHEN type = 'debit'  THEN -amount
          ELSE 0
        END
      )
      FROM public.financial_transactions
      WHERE account_id = COALESCE(NEW.account_id, OLD.account_id)
        AND company_id = COALESCE(NEW.company_id, OLD.company_id)
    ), 0),
    updated_at = now()
  WHERE id = COALESCE(NEW.account_id, OLD.account_id);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger: chamado após INSERT/DELETE em financial_transactions
CREATE TRIGGER trg_financial_transactions_update_account_balance
AFTER INSERT OR DELETE ON public.financial_transactions
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_account_balance();

-- ============================================================================
-- TRIGGER 2: Recalcular paid_amount da entry
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_update_entry_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a transação está vinculada a uma entry, atualiza paid_amount
  IF COALESCE(NEW.entry_id, OLD.entry_id) IS NOT NULL THEN
    UPDATE public.financial_entries SET
      paid_amount = COALESCE((
        SELECT SUM(amount)
        FROM public.financial_transactions
        WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)
          AND type = 'debit'  -- Só débitos contam como pagamento
      ), 0),
      updated_at = now()
    WHERE id = COALESCE(NEW.entry_id, OLD.entry_id);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger: chamado após INSERT/DELETE em financial_transactions
CREATE TRIGGER trg_financial_transactions_update_entry_paid_amount
AFTER INSERT OR DELETE ON public.financial_transactions
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_entry_paid_amount();

-- ============================================================================
-- TRIGGER 3: Atualizar status e paid_date da entry
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_update_entry_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando paid_amount é inserido/atualizado, calcula o status
  -- paid_amount é atualizado pelo TRIGGER anterior (fn_update_entry_paid_amount)
  -- então este dispara APÓS aquele

  NEW.status = CASE
    WHEN NEW.paid_amount <= 0 THEN 'open'
    WHEN NEW.paid_amount < NEW.total_amount THEN 'partially_paid'
    WHEN NEW.paid_amount >= NEW.total_amount THEN 'paid'
    ELSE 'open'
  END;

  -- Se ficou 'paid', registra a data de pagamento
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    NEW.paid_date = CURRENT_DATE;
  END IF;

  -- Se saiu de 'paid', limpa a data
  IF NEW.status != 'paid' AND OLD.status = 'paid' THEN
    NEW.paid_date = NULL;
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: chamado ANTES de UPDATE em financial_entries (calcula em-memory)
CREATE TRIGGER trg_financial_entries_before_update_status
BEFORE UPDATE ON public.financial_entries
FOR EACH ROW
WHEN (OLD.paid_amount IS DISTINCT FROM NEW.paid_amount
   OR OLD.total_amount IS DISTINCT FROM NEW.total_amount)
EXECUTE FUNCTION public.fn_update_entry_status();

-- ============================================================================
-- TRIGGER 4: Validar saldo antes de debit
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_validate_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_account RECORD;
  v_new_balance DECIMAL;
BEGIN
  -- Se é um DEBIT (saída), valida saldo
  IF NEW.type = 'debit' THEN
    SELECT * INTO v_account
    FROM public.accounts
    WHERE id = NEW.account_id
    FOR UPDATE;  -- Lock pessimista

    -- Calcula qual seria o novo saldo
    v_new_balance := COALESCE(v_account.balance, 0) - NEW.amount;

    -- Se a conta não permite negativo E ficaria negativa, levanta erro
    IF NOT v_account.allows_negative AND v_new_balance < 0 THEN
      RAISE EXCEPTION
        'Saldo insuficiente em "%" para saída de R$ %.2f. Saldo atual: R$ %.2f',
        v_account.account_name, NEW.amount, v_account.balance;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: chamado ANTES de INSERT em financial_transactions
CREATE TRIGGER trg_financial_transactions_before_insert_validate_balance
BEFORE INSERT ON public.financial_transactions
FOR EACH ROW
EXECUTE FUNCTION public.fn_validate_account_balance();

-- ============================================================================
-- TRIGGER 5: Sincronizar status de origem (PO/SO/etc)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_sync_origin_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando uma entry fica 'paid', atualiza a origin (PO/SO/etc) também
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
    
    -- Se é de uma Compra (PO)
    IF NEW.origin_type = 'purchase_order' AND NEW.origin_id IS NOT NULL THEN
      -- Valida se a tabela purchase_orders existe antes de tentar UPDATE
      BEGIN
        UPDATE public.purchase_orders
        SET status = 'paid', updated_at = now()
        WHERE id = NEW.origin_id;
      EXCEPTION WHEN undefined_table THEN
        NULL;  -- Tabela não existe ainda, ignora
      END;
    END IF;

    -- Se é de uma Venda (SO)
    IF NEW.origin_type = 'sales_order' AND NEW.origin_id IS NOT NULL THEN
      BEGIN
        UPDATE public.sales_orders
        SET status = 'paid', updated_at = now()
        WHERE id = NEW.origin_id;
      EXCEPTION WHEN undefined_table THEN
        NULL;  -- Tabela não existe ainda, ignora
      END;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: chamado APÓS UPDATE em financial_entries
CREATE TRIGGER trg_financial_entries_after_update_sync_origin
AFTER UPDATE ON public.financial_entries
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.fn_sync_origin_status();

-- ============================================================================
-- EOF: 5 Triggers + Functions para manter tudo atualizado automaticamente
-- ============================================================================
