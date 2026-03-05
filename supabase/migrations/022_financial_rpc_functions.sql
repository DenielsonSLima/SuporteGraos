-- ============================================================================
-- Migration 022: RPC Functions para o Módulo Financeiro
-- ============================================================================
-- Funções atômicas que executam operações financeiras completas:
-- Cada RPC é SECURITY DEFINER → roda com permissões do owner (bypassa RLS internamente)
-- mas valida company_id manualmente para segurança.
-- ============================================================================

-- ============================================================================
-- RPC 1: Transferência entre Contas
-- ============================================================================
-- Fluxo:
--   1. Valida contas existem e pertencem à empresa
--   2. INSERT transfer
--   3. INSERT debit na conta origem
--   4. INSERT credit na conta destino
--   5. TRIGGERS recalculam saldos automaticamente
-- ============================================================================

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
  -- Busca company_id do usuário autenticado
  SELECT company_id INTO v_company_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  -- Busca app_user id
  SELECT id INTO v_user_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  -- Valida que ambas as contas são da mesma empresa
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

  IF p_account_from_id = p_account_to_id THEN
    RAISE EXCEPTION 'Conta de origem e destino não podem ser iguais';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;

  -- 1. Cria registro de transferência
  INSERT INTO public.transfers (
    company_id, account_from_id, account_to_id,
    amount, description, transfer_date, status
  ) VALUES (
    v_company_id, p_account_from_id, p_account_to_id,
    p_amount, p_description, p_transfer_date, 'completed'
  ) RETURNING id INTO v_transfer_id;

  -- 2. Debit na conta de origem (TRIGGER recalcula balance)
  INSERT INTO public.financial_transactions (
    company_id, account_id, type, amount,
    transaction_date, created_by, description
  ) VALUES (
    v_company_id, p_account_from_id, 'debit', p_amount,
    p_transfer_date, v_user_id,
    COALESCE(p_description, 'Transferência entre contas')
  );

  -- 3. Credit na conta de destino (TRIGGER recalcula balance)
  INSERT INTO public.financial_transactions (
    company_id, account_id, type, amount,
    transaction_date, created_by, description
  ) VALUES (
    v_company_id, p_account_to_id, 'credit', p_amount,
    p_transfer_date, v_user_id,
    COALESCE(p_description, 'Transferência entre contas')
  );

  RETURN v_transfer_id;
END;
$$;

-- ============================================================================
-- RPC 2: Criar Empréstimo
-- ============================================================================
-- Fluxo:
--   1. INSERT loan
--   2. INSERT financial_entry (type='payable', origin_type='loan')
--   3. Gera installments (parcelas) se informado
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_create_loan(
  p_lender_id         UUID DEFAULT NULL,
  p_principal_amount  DECIMAL DEFAULT 0,
  p_interest_rate     DECIMAL DEFAULT 0,
  p_start_date        DATE DEFAULT CURRENT_DATE,
  p_end_date          DATE DEFAULT NULL,
  p_num_installments  INT DEFAULT 1,
  p_description       TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_loan_id UUID;
  v_entry_id UUID;
  v_installment_amount DECIMAL;
  v_due_date DATE;
  i INT;
BEGIN
  -- Busca company_id
  SELECT company_id INTO v_company_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  IF p_principal_amount <= 0 THEN
    RAISE EXCEPTION 'Valor do empréstimo deve ser maior que zero';
  END IF;

  -- 1. INSERT loan
  INSERT INTO public.loans (
    company_id, lender_id, principal_amount,
    interest_rate, start_date, end_date, status
  ) VALUES (
    v_company_id, p_lender_id, p_principal_amount,
    p_interest_rate, p_start_date, p_end_date, 'open'
  ) RETURNING id INTO v_loan_id;

  -- 2. INSERT financial_entry (contas a pagar)
  -- Se tem lender_id, usa como partner. Senão, precisa de um parceiro genérico.
  IF p_lender_id IS NOT NULL THEN
    INSERT INTO public.financial_entries (
      company_id, type, origin_type, origin_id,
      partner_id, total_amount, created_date, due_date
    ) VALUES (
      v_company_id, 'payable', 'loan', v_loan_id,
      p_lender_id, p_principal_amount, p_start_date, p_end_date
    ) RETURNING id INTO v_entry_id;
  END IF;

  -- 3. Gera installments
  IF p_num_installments > 0 THEN
    v_installment_amount := ROUND(p_principal_amount / p_num_installments, 2);

    FOR i IN 1..p_num_installments LOOP
      v_due_date := p_start_date + (i * 30);  -- Parcelas mensais (30 dias)

      INSERT INTO public.loan_installments (
        company_id, loan_id, installment_number,
        amount, due_date, status
      ) VALUES (
        v_company_id, v_loan_id, i,
        v_installment_amount, v_due_date, 'open'
      );
    END LOOP;
  END IF;

  RETURN v_loan_id;
END;
$$;

-- ============================================================================
-- RPC 3: Usar Linha de Crédito
-- ============================================================================
-- Fluxo:
--   1. Valida se tem limite disponível
--   2. UPDATE credit_lines.used_amount
--   3. INSERT financial_entry (payable)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_use_credit_line(
  p_credit_line_id UUID,
  p_amount         DECIMAL,
  p_partner_id     UUID,
  p_description    TEXT DEFAULT NULL,
  p_due_date       DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_credit_line RECORD;
  v_entry_id UUID;
BEGIN
  -- Busca company_id
  SELECT company_id INTO v_company_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  -- Busca e valida linha de crédito (com lock)
  SELECT * INTO v_credit_line
  FROM public.credit_lines
  WHERE id = p_credit_line_id
    AND company_id = v_company_id
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Linha de crédito não encontrada ou inativa';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;

  IF (v_credit_line.used_amount + p_amount) > v_credit_line.total_limit THEN
    RAISE EXCEPTION 'Limite de crédito insuficiente. Disponível: R$ %.2f',
      (v_credit_line.total_limit - v_credit_line.used_amount);
  END IF;

  -- 1. Atualiza used_amount da linha
  UPDATE public.credit_lines
  SET used_amount = used_amount + p_amount
  WHERE id = p_credit_line_id;

  -- 2. Cria entry (contas a pagar = devolução do valor usado)
  INSERT INTO public.financial_entries (
    company_id, type, origin_type, origin_id,
    partner_id, total_amount, created_date, due_date
  ) VALUES (
    v_company_id, 'payable', 'credit_line', p_credit_line_id,
    p_partner_id, p_amount, CURRENT_DATE, p_due_date
  ) RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;

-- ============================================================================
-- RPC 4: Criar Despesa Administrativa
-- ============================================================================
-- Fluxo:
--   1. INSERT admin_expenses
--   2. INSERT financial_entry (payable, origin_type='expense')
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_create_admin_expense(
  p_category_id   UUID,
  p_description   TEXT,
  p_amount        DECIMAL,
  p_payee_name    TEXT DEFAULT NULL,
  p_payee_id      UUID DEFAULT NULL,
  p_account_id    UUID DEFAULT NULL,
  p_expense_date  DATE DEFAULT CURRENT_DATE,
  p_due_date      DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_expense_id UUID;
  v_entry_id UUID;
  v_partner_id UUID;
BEGIN
  -- Busca company_id
  SELECT company_id INTO v_company_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor da despesa deve ser maior que zero';
  END IF;

  -- 1. INSERT admin_expenses
  INSERT INTO public.admin_expenses (
    company_id, account_id, category_id,
    description, amount, payee_name, payee_id,
    expense_date, due_date, status
  ) VALUES (
    v_company_id, p_account_id, p_category_id,
    p_description, p_amount, p_payee_name, p_payee_id,
    p_expense_date, p_due_date, 'open'
  ) RETURNING id INTO v_expense_id;

  -- 2. INSERT financial_entry se tem payee_id (parceiro definido)
  v_partner_id := p_payee_id;

  IF v_partner_id IS NOT NULL THEN
    INSERT INTO public.financial_entries (
      company_id, type, origin_type, origin_id,
      partner_id, total_amount, created_date, due_date
    ) VALUES (
      v_company_id, 'payable', 'expense', v_expense_id,
      v_partner_id, p_amount, p_expense_date, p_due_date
    ) RETURNING id INTO v_entry_id;
  END IF;

  RETURN v_expense_id;
END;
$$;

-- ============================================================================
-- RPC 5: Criar Adiantamento
-- ============================================================================
-- Fluxo:
--   1. INSERT advances
--   2. INSERT financial_entry
--      - supplier → receivable (ele nos deve)
--      - client   → payable (nós devemos entregar/devolver)
--      - shareholder → receivable (ele nos deve)
--   3. INSERT financial_transaction (debit na conta)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_create_advance(
  p_recipient_id    UUID,
  p_recipient_type  TEXT,
  p_amount          DECIMAL,
  p_account_id      UUID,
  p_description     TEXT DEFAULT NULL,
  p_advance_date    DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_user_id UUID;
  v_advance_id UUID;
  v_entry_type TEXT;
BEGIN
  -- Busca company_id e user_id
  SELECT company_id, id INTO v_company_id, v_user_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor do adiantamento deve ser maior que zero';
  END IF;

  IF p_recipient_type NOT IN ('supplier', 'client', 'shareholder') THEN
    RAISE EXCEPTION 'Tipo de destinatário inválido: %', p_recipient_type;
  END IF;

  -- 1. INSERT advance
  INSERT INTO public.advances (
    company_id, recipient_id, recipient_type,
    amount, description, advance_date, status
  ) VALUES (
    v_company_id, p_recipient_id, p_recipient_type,
    p_amount, p_description, p_advance_date, 'open'
  ) RETURNING id INTO v_advance_id;

  -- 2. Determina tipo da entry
  --    Adiantamento para supplier ou shareholder → eles nos devem → receivable
  --    Adiantamento de cliente → nós devemos entregar → payable
  IF p_recipient_type IN ('supplier', 'shareholder') THEN
    v_entry_type := 'receivable';
  ELSE
    v_entry_type := 'payable';
  END IF;

  -- 3. INSERT financial_entry
  INSERT INTO public.financial_entries (
    company_id, type, origin_type, origin_id,
    partner_id, total_amount, created_date
  ) VALUES (
    v_company_id, v_entry_type, 'advance', v_advance_id,
    p_recipient_id, p_amount, p_advance_date
  );

  -- 4. INSERT financial_transaction (saída do caixa)
  INSERT INTO public.financial_transactions (
    company_id, account_id, type, amount,
    transaction_date, created_by, description
  ) VALUES (
    v_company_id, p_account_id, 'debit', p_amount,
    p_advance_date, v_user_id,
    COALESCE(p_description, 'Adiantamento para ' || p_recipient_type)
  );

  RETURN v_advance_id;
END;
$$;

-- ============================================================================
-- RPC 6: Operação com Sócio
-- ============================================================================
-- Fluxo:
--   1. INSERT shareholder_operations
--   2. INSERT shareholder_transactions (atualiza saldo do sócio)
--   3. INSERT financial_transaction (entrada ou saída no caixa)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_shareholder_operation(
  p_shareholder_id   UUID,
  p_operation_type   TEXT,
  p_amount           DECIMAL,
  p_account_id       UUID,
  p_description      TEXT DEFAULT NULL,
  p_operation_date   DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_user_id UUID;
  v_operation_id UUID;
  v_ft_type TEXT;
  v_st_type TEXT;
BEGIN
  -- Busca company_id e user_id
  SELECT company_id, id INTO v_company_id, v_user_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;

  IF p_operation_type NOT IN ('capital_contribution', 'withdrawal', 'profit_share', 'dividend') THEN
    RAISE EXCEPTION 'Tipo de operação inválido: %', p_operation_type;
  END IF;

  -- 1. INSERT shareholder_operations
  INSERT INTO public.shareholder_operations (
    company_id, shareholder_id, operation_type,
    amount, description, status, operation_date
  ) VALUES (
    v_company_id, p_shareholder_id, p_operation_type,
    p_amount, p_description, 'completed', p_operation_date
  ) RETURNING id INTO v_operation_id;

  -- 2. Determina direção do fluxo
  CASE p_operation_type
    WHEN 'capital_contribution' THEN
      -- Sócio aporta → empresa RECEBE → credit no caixa
      v_ft_type := 'credit';
      v_st_type := 'debit';   -- Saldo do sócio diminui (ele "deposita")
    WHEN 'withdrawal', 'profit_share', 'dividend' THEN
      -- Sócio retira → empresa PAga → debit no caixa
      v_ft_type := 'debit';
      v_st_type := 'credit';  -- Saldo do sócio aumenta (ele "recebe")
  END CASE;

  -- 3. INSERT financial_transaction (caixa da empresa)
  INSERT INTO public.financial_transactions (
    company_id, account_id, type, amount,
    transaction_date, created_by, description
  ) VALUES (
    v_company_id, p_account_id, v_ft_type, p_amount,
    p_operation_date, v_user_id,
    COALESCE(p_description, p_operation_type || ' - sócio')
  );

  -- 4. INSERT shareholder_transactions (saldo do sócio)
  INSERT INTO public.shareholder_transactions (
    company_id, shareholder_id, type,
    amount, description
  ) VALUES (
    v_company_id, p_shareholder_id, v_st_type,
    p_amount, COALESCE(p_description, p_operation_type)
  );

  RETURN v_operation_id;
END;
$$;

-- ============================================================================
-- RPC 7: Pagar uma Entry (Contas a Pagar/Receber)
-- ============================================================================
-- Fluxo genérico para pagar qualquer financial_entry:
--   1. Valida entry pertence à empresa
--   2. INSERT financial_transaction (debit)
--   3. TRIGGERS atualizam paid_amount, status, balance
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_pay_entry(
  p_entry_id       UUID,
  p_account_id     UUID,
  p_amount         DECIMAL,
  p_description    TEXT DEFAULT NULL,
  p_payment_date   DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_user_id UUID;
  v_entry RECORD;
  v_transaction_id UUID;
BEGIN
  -- Busca company_id e user_id
  SELECT company_id, id INTO v_company_id, v_user_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  -- Busca a entry com lock
  SELECT * INTO v_entry
  FROM public.financial_entries
  WHERE id = p_entry_id
    AND company_id = v_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrada financeira não encontrada';
  END IF;

  IF v_entry.status = 'paid' THEN
    RAISE EXCEPTION 'Esta entrada já foi paga integralmente';
  END IF;

  IF v_entry.status = 'cancelled' THEN
    RAISE EXCEPTION 'Esta entrada foi cancelada';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor do pagamento deve ser maior que zero';
  END IF;

  -- INSERT financial_transaction
  -- TRIGGERS vão: recalcular balance, paid_amount, status
  INSERT INTO public.financial_transactions (
    company_id, entry_id, account_id,
    type, amount, transaction_date,
    created_by, description
  ) VALUES (
    v_company_id, p_entry_id, p_account_id,
    'debit', p_amount, p_payment_date,
    v_user_id,
    COALESCE(p_description, 'Pagamento de entrada financeira')
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;

-- ============================================================================
-- EOF: 7 RPCs criadas
-- ============================================================================
