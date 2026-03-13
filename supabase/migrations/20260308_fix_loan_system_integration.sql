-- Migration: fix_loan_system_integration
-- Description: Adds 'type' to loans, fixes creation RPC for bank sync and kpi rpc.

-- 1. Add type column to loans
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'taken' CHECK (type IN ('taken', 'granted'));

-- 2. Update rpc_create_loan to be fully canonical (handles bank sync)
CREATE OR REPLACE FUNCTION public.rpc_create_loan(
  p_type              TEXT DEFAULT 'taken',
  p_account_id        UUID DEFAULT NULL,
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
  v_user_id UUID;
  v_loan_id UUID;
  v_entry_id UUID;
  v_installment_amount DECIMAL;
  v_due_date DATE;
  v_tx_type TEXT;
  v_tx_description TEXT;
  i INT;
BEGIN
  -- 1. Security check
  SELECT company_id, id INTO v_company_id, v_user_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  IF p_principal_amount <= 0 THEN
    RAISE EXCEPTION 'Valor do empréstimo deve ser maior que zero';
  END IF;

  -- 2. INSERT loan
  INSERT INTO public.loans (
    company_id, type, lender_id, principal_amount,
    interest_rate, start_date, end_date, status
  ) VALUES (
    v_company_id, p_type, p_lender_id, p_principal_amount,
    p_interest_rate, p_start_date, p_end_date, 'open'
  ) RETURNING id INTO v_loan_id;

  -- 3. INSERT financial_entry (obligation)
  -- We always create an entry to track the debt/receivable
  INSERT INTO public.financial_entries (
    company_id, 
    type, 
    origin_type, 
    origin_id,
    partner_id, 
    total_amount, 
    created_date, 
    due_date
  ) VALUES (
    v_company_id, 
    CASE WHEN p_type = 'taken' THEN 'payable' ELSE 'receivable' END, 
    'loan', 
    v_loan_id,
    p_lender_id, 
    p_principal_amount, 
    p_start_date, 
    p_end_date
  ) RETURNING id INTO v_entry_id;

  -- 4. INSERT installments if requested
  IF p_num_installments > 0 THEN
    v_installment_amount := ROUND(p_principal_amount / p_num_installments, 2);
    FOR i IN 1..p_num_installments LOOP
      v_due_date := p_start_date + (i * 30); -- approx monthly
      INSERT INTO public.loan_installments (
        company_id, loan_id, installment_number,
        amount, due_date, status
      ) VALUES (
        v_company_id, v_loan_id, i,
        v_installment_amount, v_due_date, 'open'
      );
    END LOOP;
  END IF;

  -- 5. Bank Sync (if account provided)
  IF p_account_id IS NOT NULL THEN
     v_tx_type := CASE WHEN p_type = 'taken' THEN 'credit' ELSE 'debit' END;
     v_tx_description := CASE 
        WHEN p_type = 'taken' THEN 'Entrada de Capital (Empréstimo Tomado): ' 
        ELSE 'Saída de Capital (Empréstimo Concedido): ' 
     END || COALESCE(p_description, 'Empréstimo');

     INSERT INTO public.financial_transactions (
       company_id, account_id, type, amount,
       transaction_date, created_by, description,
       source_table, source_id
     ) VALUES (
       v_company_id, p_account_id, v_tx_type, p_principal_amount,
       p_start_date, v_user_id, v_tx_description,
       'loans', v_loan_id
     );
  END IF;

  RETURN v_loan_id;
END;
$$;

-- 3. Fix rpc_loans_active_totals
CREATE OR REPLACE FUNCTION public.rpc_loans_active_totals()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_company_id UUID;
  v_taken NUMERIC := 0;
  v_granted NUMERIC := 0;
  v_count_active INT := 0;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN json_build_object('takenTotal', 0, 'grantedTotal', 0, 'countActive', 0);
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN type = 'taken' THEN remaining_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'granted' THEN remaining_amount ELSE 0 END), 0),
    COUNT(*)
  INTO v_taken, v_granted, v_count_active
  FROM public.loans
  WHERE company_id = v_company_id
    AND status = 'open';

  RETURN json_build_object(
    'takenTotal', v_taken,
    'grantedTotal', v_granted,
    'countActive', v_count_active
  );
END;
$$;
