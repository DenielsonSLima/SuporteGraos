-- ============================================================================
-- FIX: Corrigir pay_financial_entry e apply_discount_financial_entry
-- Data: 2026-02-23
-- Problema:
--   1. pay_financial_entry usa financial_transactions_v2 (NÃO EXISTE)
--   2. pay_financial_entry não passa company_id e usa colunas erradas
--   3. apply_discount_financial_entry usa financial_adjustments (NÃO EXISTE)
--   4. fn_update_entry_paid_amount só soma type='debit', ignorando recebíveis
-- Solução:
--   - Reescrever pay_financial_entry para usar financial_transactions (tabela real)
--   - Delegar atualização de saldo/status para triggers existentes
--   - Corrigir apply_discount_financial_entry para só reduzir total_amount
--   - Corrigir fn_update_entry_paid_amount para somar credit e debit
-- ============================================================================

-- 1. CORRIGIR TRIGGER: fn_update_entry_paid_amount deve somar TODOS os tipos
--    (debit = pagamento de payable, credit = recebimento de receivable)
CREATE OR REPLACE FUNCTION public.fn_update_entry_paid_amount()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF COALESCE(NEW.entry_id, OLD.entry_id) IS NOT NULL THEN
    UPDATE public.financial_entries SET
      paid_amount = COALESCE((
        SELECT SUM(amount)
        FROM public.financial_transactions
        WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)
      ), 0),
      -- Auto-update status based on paid vs total
      status = CASE
        WHEN COALESCE((
          SELECT SUM(amount)
          FROM public.financial_transactions
          WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)
        ), 0) >= total_amount THEN 'paid'::financial_entry_status
        WHEN COALESCE((
          SELECT SUM(amount)
          FROM public.financial_transactions
          WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)
        ), 0) > 0 THEN 'partially_paid'::financial_entry_status
        ELSE 'pending'::financial_entry_status
      END,
      updated_at = now()
    WHERE id = COALESCE(NEW.entry_id, OLD.entry_id);
  END IF;

  RETURN NULL;
END;
$function$;

-- 2. CORRIGIR pay_financial_entry:
--    - Usar financial_transactions (tabela REAL com triggers)
--    - Colunas: entry_id, account_id, company_id, type, amount, transaction_date, description
--    - type = 'debit' para payable/freight, 'credit' para receivable
--    - Triggers vão cuidar de: paid_amount, status, account balance
CREATE OR REPLACE FUNCTION public.pay_financial_entry(
  p_entry_id UUID,
  p_account_id UUID,
  p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_entry RECORD;
  v_tx_type TEXT;
  v_company_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor pago deve ser maior que zero';
  END IF;

  -- Buscar entry para validações
  SELECT id, company_id, type, total_amount, paid_amount, status
  INTO v_entry
  FROM public.financial_entries
  WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lançamento financeiro não encontrado: %', p_entry_id;
  END IF;

  v_company_id := v_entry.company_id;

  -- Determinar tipo da transação financeira:
  -- payable/expense/commission/loan_payable → debit (saída de caixa)
  -- receivable/loan_receivable/partner_contribution → credit (entrada de caixa)
  IF v_entry.type IN ('receivable', 'loan_receivable', 'partner_contribution', 'internal_credit') THEN
    v_tx_type := 'credit';
  ELSE
    v_tx_type := 'debit';
  END IF;

  -- Inserir transação na tabela REAL (financial_transactions)
  -- Os triggers cuidam automaticamente de:
  --   fn_validate_account_balance → Valida saldo antes (para debit)
  --   fn_update_account_balance → Atualiza accounts.balance
  --   fn_update_entry_paid_amount → Atualiza paid_amount + status
  INSERT INTO public.financial_transactions (
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
    CURRENT_DATE,
    CONCAT('Pagamento via RPC - Entry: ', p_entry_id::TEXT)
  );
END;
$function$;

-- 3. CORRIGIR apply_discount_financial_entry:
--    - Remover referência a financial_adjustments (NÃO EXISTE)
--    - Apenas reduzir total_amount (remaining_amount é GENERATED)
CREATE OR REPLACE FUNCTION public.apply_discount_financial_entry(
  p_entry_id UUID,
  p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_entry RECORD;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Desconto deve ser maior que zero';
  END IF;

  SELECT id, total_amount, paid_amount
  INTO v_entry
  FROM public.financial_entries
  WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lançamento financeiro não encontrado: %', p_entry_id;
  END IF;

  -- Reduzir total_amount (remaining_amount = total_amount - paid_amount é GENERATED)
  UPDATE public.financial_entries
  SET total_amount = GREATEST(total_amount - p_amount, 0),
      -- Se paid_amount >= novo total, marcar como paid
      status = CASE
        WHEN paid_amount >= GREATEST(total_amount - p_amount, 0) AND paid_amount > 0 THEN 'paid'::financial_entry_status
        WHEN paid_amount > 0 THEN 'partially_paid'::financial_entry_status
        ELSE status
      END,
      updated_at = now()
  WHERE id = p_entry_id;
END;
$function$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.pay_financial_entry(UUID, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_discount_financial_entry(UUID, NUMERIC) TO authenticated;
