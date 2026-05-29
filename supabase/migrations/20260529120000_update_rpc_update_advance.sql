-- Migração para recriar rpc_update_advance
CREATE OR REPLACE FUNCTION public.rpc_update_advance(
    p_advance_id uuid,
    p_amount numeric,
    p_account_id uuid,
    p_description text,
    p_advance_date date,
    p_recipient_type text DEFAULT NULL::text,
    p_recipient_id uuid DEFAULT NULL::uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_company_id UUID;
  v_entry_id UUID;
  v_settled_amount NUMERIC;
  v_entry_type TEXT;
  v_transaction_type TEXT;
  v_partner_name TEXT;
BEGIN
  -- 1. Verifica se o adiantamento existe
  SELECT company_id, settled_amount INTO v_company_id, v_settled_amount
  FROM public.advances
  WHERE id = p_advance_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Adiantamento não encontrado';
  END IF;

  -- 2. Se o novo valor for menor que o já liquidado, rejeita
  IF p_amount < v_settled_amount THEN
    RAISE EXCEPTION 'O novo valor não pode ser menor que o valor já consumido (R$ %)', v_settled_amount;
  END IF;

  -- Obter o nome do parceiro se o destinatário mudou
  IF p_recipient_id IS NOT NULL THEN
    SELECT name INTO v_partner_name FROM public.parceiros_parceiros WHERE id = p_recipient_id;
  END IF;

  -- 3. Atualiza o adiantamento
  UPDATE public.advances
  SET amount = p_amount,
      remaining_amount = p_amount - settled_amount,
      description = p_description,
      advance_date = p_advance_date,
      recipient_type = COALESCE(p_recipient_type, recipient_type),
      recipient_id = COALESCE(p_recipient_id, recipient_id),
      partner_name = COALESCE(v_partner_name, partner_name),
      status = CASE 
        WHEN settled_amount >= p_amount THEN 'settled' 
        WHEN settled_amount > 0 THEN 'partially_settled'
        ELSE 'open'
      END
  WHERE id = p_advance_id;

  -- 4. Busca e atualiza a financial_entry correspondente
  SELECT id INTO v_entry_id
  FROM public.financial_entries
  WHERE origin_id = p_advance_id AND origin_type = 'advance';

  IF v_entry_id IS NOT NULL THEN
    IF p_recipient_type IS NOT NULL THEN
      IF p_recipient_type IN ('supplier', 'shareholder') THEN
        v_entry_type := 'receivable';
      ELSE
        v_entry_type := 'payable';
      END IF;
    END IF;

    UPDATE public.financial_entries
    SET total_amount = p_amount,
        remaining_amount = p_amount - paid_amount,
        created_date = p_advance_date,
        type = COALESCE(v_entry_type, type),
        partner_id = COALESCE(p_recipient_id, partner_id)
    WHERE id = v_entry_id;

    -- 5. Atualiza a financial_transaction vinculada
    IF p_recipient_type IS NOT NULL THEN
      v_transaction_type := CASE WHEN p_recipient_type IN ('supplier', 'shareholder') THEN 'debit' ELSE 'credit' END;
    END IF;

    UPDATE public.financial_transactions
    SET amount = p_amount,
        transaction_date = p_advance_date,
        account_id = p_account_id,
        type = COALESCE(v_transaction_type, type),
        description = COALESCE(p_description, description)
    WHERE entry_id = v_entry_id;
  END IF;
END;
$$;
