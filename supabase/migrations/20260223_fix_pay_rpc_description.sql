-- ============================================================================
-- FIX: Adicionar parâmetro p_description à RPC pay_financial_entry
-- Data: 2026-02-23
-- Problema:
--   A description gravada em financial_transactions é genérica:
--   "Pagamento via RPC - Entry: <UUID>"
--   Isso aparece no Histórico Geral sem contexto útil.
-- Solução:
--   Adicionar parâmetro OPTIONAL p_description TEXT DEFAULT NULL
--   Se fornecido, usa ele; senão mantém fallback genérico.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.pay_financial_entry(
  p_entry_id UUID,
  p_account_id UUID,
  p_amount NUMERIC,
  p_description TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_entry RECORD;
  v_tx_type TEXT;
  v_company_id UUID;
  v_description TEXT;
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

  -- Usar description fornecida ou fallback genérico
  v_description := COALESCE(p_description, CONCAT('Pagamento - Entry: ', p_entry_id::TEXT));

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
    v_description
  );
END;
$function$;

-- ============================================================================
-- FIX: Corrigir a descrição da transação existente do pagamento já registrado
-- Entry: 9718dc82-6905-4ada-8d53-ecb8b26b32e2
-- ============================================================================
UPDATE public.financial_transactions
SET description = (
  SELECT CONCAT(
    'Pagamento Fornecedor: ',
    COALESCE(v.partner_name, 'Fornecedor'),
    CASE WHEN v.order_number IS NOT NULL THEN CONCAT(' - Pedido ', v.order_number) ELSE '' END
  )
  FROM public.vw_payables_enriched v
  WHERE v.id = financial_transactions.entry_id
)
WHERE entry_id = '9718dc82-6905-4ada-8d53-ecb8b26b32e2'
  AND description LIKE 'Pagamento via RPC%';
