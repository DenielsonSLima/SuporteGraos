-- ============================================================================
-- Migration: Cashier Retroactive Calculations and Loan Sync Fixes
-- Date: 2026-05-29
-- ============================================================================

SET search_path = public;

-- 1. Correct Trigger Function: fn_update_account_balance
-- Recalculates both OLD and NEW account balances when a transaction changes accounts
CREATE OR REPLACE FUNCTION public.fn_update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
BEGIN
  v_company_id := COALESCE(NEW.company_id, OLD.company_id);

  -- Update NEW account
  IF NEW.account_id IS NOT NULL THEN
    UPDATE public.accounts a
    SET balance = (
      COALESCE((
        SELECT ib.value
        FROM public.initial_balances ib
        WHERE ib.account_id = a.id AND ib.company_id = a.company_id
        LIMIT 1
      ), 0)
      +
      COALESCE((
        SELECT SUM(
          CASE
            WHEN lower(ft.type) IN ('credit', 'in') THEN ft.amount
            WHEN lower(ft.type) IN ('debit', 'out') THEN -ft.amount
            ELSE 0
          END
        )
        FROM public.financial_transactions ft
        WHERE ft.account_id = a.id
          AND ft.company_id = a.company_id
      ), 0)
    ),
    updated_at = now()
    WHERE a.id = NEW.account_id AND a.company_id = v_company_id;
  END IF;

  -- Update OLD account if it changed
  IF OLD.account_id IS NOT NULL AND (NEW.account_id IS NULL OR NEW.account_id <> OLD.account_id) THEN
    UPDATE public.accounts a
    SET balance = (
      COALESCE((
        SELECT ib.value
        FROM public.initial_balances ib
        WHERE ib.account_id = a.id AND ib.company_id = a.company_id
        LIMIT 1
      ), 0)
      +
      COALESCE((
        SELECT SUM(
          CASE
            WHEN lower(ft.type) IN ('credit', 'in') THEN ft.amount
            WHEN lower(ft.type) IN ('debit', 'out') THEN -ft.amount
            ELSE 0
          END
        )
        FROM public.financial_transactions ft
        WHERE ft.account_id = a.id
          AND ft.company_id = a.company_id
      ), 0)
    ),
    updated_at = now()
    WHERE a.id = OLD.account_id AND a.company_id = v_company_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Update rpc_create_loan to set disbursement metadata
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
       source_table, source_id, metadata
     ) VALUES (
       v_company_id, p_account_id, v_tx_type, p_principal_amount,
       p_start_date, v_user_id, v_tx_description,
       'loans', v_loan_id,
       jsonb_build_object('loan_id', v_loan_id, 'is_disbursement', true)
     );
  END IF;

  RETURN v_loan_id;
END;
$$;

-- 3. Update rpc_monthly_balance_sheet with robust date boundaries and missing fields
CREATE OR REPLACE FUNCTION public.rpc_monthly_balance_sheet(p_company_id uuid, p_year integer, p_month integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
  v_caller_company UUID;
  v_start_of_month DATE;
  v_end_of_month   DATE;
  v_month_label    TEXT;

  -- Saldos bancários
  v_total_bank_balance     NUMERIC := 0;
  v_total_initial_balance  NUMERIC := 0;
  v_bank_balances          JSON;

  -- Ativos
  v_pending_sales_receipts   NUMERIC := 0;
  v_merchandise_in_transit   NUMERIC := 0;
  v_total_fixed_assets       NUMERIC := 0;
  v_asset_sales_receivable   NUMERIC := 0;
  v_shareholder_receivables  NUMERIC := 0;
  v_loans_granted            NUMERIC := 0;
  v_advances_given           NUMERIC := 0;
  v_total_assets             NUMERIC := 0;

  -- Passivos
  v_pending_purchase_payments NUMERIC := 0;
  v_pending_freight_payments  NUMERIC := 0;
  v_commissions_to_pay        NUMERIC := 0;
  v_loans_taken               NUMERIC := 0;
  v_advances_taken            NUMERIC := 0;
  v_shareholder_payables      NUMERIC := 0;
  v_total_liabilities         NUMERIC := 0;

  -- Resultado
  v_net_balance NUMERIC := 0;
  result        JSON;
BEGIN
  -- Validar que o caller pertence à empresa
  SELECT au.company_id INTO v_caller_company
  FROM app_users au
  WHERE au.auth_user_id = (SELECT auth.uid())
  LIMIT 1;

  IF v_caller_company IS NULL OR v_caller_company <> p_company_id THEN
    RAISE EXCEPTION 'Access denied: caller does not belong to company %', p_company_id;
  END IF;

  v_start_of_month := make_date(p_year, p_month, 1);
  v_end_of_month   := (v_start_of_month + interval '1 month - 1 day')::date;
  v_month_label    := to_char(v_start_of_month, 'TMMonth YYYY');

  -- A) SALDOS BANCÁRIOS (respeitando data de implantação)
  WITH active_accounts AS (
    SELECT a.id
    FROM accounts a
    WHERE a.company_id = p_company_id
      AND a.is_active = true
  ),
  initial_vals AS (
    SELECT
      ib.account_id,
      COALESCE(SUM(ib.value), 0) AS init_value,
      MIN(ib.date) AS init_date
    FROM initial_balances ib
    WHERE ib.company_id = p_company_id
      AND ib.account_id IN (SELECT id FROM active_accounts)
    GROUP BY ib.account_id
  ),
  tx_before_month AS (
    SELECT
      ft.account_id,
      SUM(
        CASE
          WHEN lower(ft.type) IN ('credit', 'in') THEN ft.amount
          WHEN lower(ft.type) IN ('debit', 'out') THEN -ft.amount
          ELSE 0
        END
      ) AS net_before
    FROM financial_transactions ft
    LEFT JOIN initial_vals iv ON iv.account_id = ft.account_id
    WHERE ft.company_id = p_company_id
      AND ft.transaction_date < v_start_of_month
      AND ft.transaction_date >= COALESCE(iv.init_date, '1900-01-01'::date)
      AND ft.account_id IN (SELECT id FROM active_accounts)
    GROUP BY ft.account_id
  ),
  tx_in_month AS (
    SELECT
      ft.account_id,
      SUM(
        CASE
          WHEN lower(ft.type) IN ('credit', 'in') THEN ft.amount
          WHEN lower(ft.type) IN ('debit', 'out') THEN -ft.amount
          ELSE 0
        END
      ) AS net_in_month
    FROM financial_transactions ft
    LEFT JOIN initial_vals iv ON iv.account_id = ft.account_id
    WHERE ft.company_id = p_company_id
      AND ft.transaction_date >= v_start_of_month
      AND ft.transaction_date <= v_end_of_month
      AND ft.transaction_date >= COALESCE(iv.init_date, '1900-01-01'::date)
      AND ft.account_id IN (SELECT id FROM active_accounts)
    GROUP BY ft.account_id
  ),
  account_balances AS (
    SELECT
      a.id,
      a.account_name AS bank_name,
      a.owner,
      COALESCE(iv.init_value, 0) + COALESCE(tbm.net_before, 0)
        AS start_balance,
      COALESCE(iv.init_value, 0) + COALESCE(tbm.net_before, 0) + COALESCE(tim.net_in_month, 0)
        AS end_balance
    FROM accounts a
    INNER JOIN active_accounts aa ON aa.id = a.id
    LEFT JOIN initial_vals iv       ON iv.account_id = a.id
    LEFT JOIN tx_before_month tbm   ON tbm.account_id = a.id
    LEFT JOIN tx_in_month tim       ON tim.account_id = a.id
    WHERE a.company_id = p_company_id
  )
  SELECT
    COALESCE(SUM(ab.end_balance), 0),
    COALESCE(json_agg(json_build_object(
      'id',           ab.id,
      'bankName',     ab.bank_name,
      'owner',        ab.owner,
      'startBalance', ab.start_balance,
      'balance',      ab.end_balance
    )), '[]'::json)
  INTO v_total_bank_balance, v_bank_balances
  FROM account_balances ab;

  -- Saldo inicial global
  SELECT COALESCE(SUM(ib.value), 0)
  INTO v_total_initial_balance
  FROM initial_balances ib
  WHERE ib.company_id = p_company_id;

  -- B) ATIVOS
  -- Recebíveis de Vendas (pendentes no final do mês selecionado)
  SELECT COALESCE(SUM(
    fe.total_amount - COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE ft.entry_id = fe.id
        AND ft.transaction_date <= v_end_of_month
    ), 0)
  ), 0)
  INTO v_pending_sales_receipts
  FROM public.financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'receivable'
    AND fe.origin_type = 'sales_order'
    AND fe.status NOT IN ('cancelled', 'canceled')
    AND fe.created_date <= v_end_of_month
    AND fe.total_amount > COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE ft.entry_id = fe.id
        AND ft.transaction_date <= v_end_of_month
    ), 0);

  -- Mercadoria em Trânsito (carregada até v_end_of_month, mas não descarregada até v_end_of_month)
  SELECT COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0)
  INTO v_merchandise_in_transit
  FROM public.ops_loadings l
  WHERE l.company_id = p_company_id
    AND l.loading_date <= v_end_of_month
    AND l.status NOT IN ('cancelled', 'canceled')
    AND NOT EXISTS (
      SELECT 1 
      FROM public.ops_sales_order_unloads u 
      WHERE u.loading_id = l.id
        AND u.unload_date <= v_end_of_month
    );

  -- Patrimônio (Bens Ativos no final do mês selecionado)
  SELECT COALESCE(SUM(a.acquisition_value), 0)
  INTO v_total_fixed_assets
  FROM public.assets a
  WHERE a.company_id = p_company_id
    AND a.acquisition_date <= v_end_of_month
    AND (a.status = 'active' OR a.write_off_date > v_end_of_month);

  -- Vendas de Bens (a Receber no final do mês selecionado)
  SELECT COALESCE(SUM(original_value - COALESCE(paid_value, 0) - COALESCE(discount_value, 0)), 0)
  INTO v_asset_sales_receivable
  FROM public.admin_expenses
  WHERE company_id = p_company_id
    AND asset_id IS NOT NULL
    AND status NOT IN ('cancelled', 'canceled')
    AND expense_date <= v_end_of_month;

  -- Haveres e Obrigações com Sócios (Posição retroativa calculada a partir de transações históricas)
  WITH shareholder_balances_at AS (
    SELECT 
      s.id,
      COALESCE((
        SELECT SUM(
          CASE
            WHEN st.type = 'credit' THEN st.value
            WHEN st.type = 'debit' THEN -st.value
            ELSE 0
          END
        )
        FROM public.shareholder_transactions st
        WHERE st.shareholder_id = s.id
          AND st.date <= v_end_of_month
      ), 0) AS balance_at
    FROM public.shareholders s
    WHERE s.company_id = p_company_id
  )
  SELECT 
    COALESCE(SUM(CASE WHEN balance_at < 0 THEN ABS(balance_at) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN balance_at > 0 THEN balance_at ELSE 0 END), 0)
  INTO v_shareholder_receivables, v_shareholder_payables
  FROM shareholder_balances_at;

  -- Empréstimos Concedidos (Principal - Pagamentos recebidos até v_end_of_month)
  SELECT COALESCE(SUM(
    l.principal_amount - COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE (ft.metadata->>'loan_id')::uuid = l.id
        AND ft.type = 'credit'
        AND ft.transaction_date <= v_end_of_month
    ), 0)
  ), 0)
  INTO v_loans_granted
  FROM public.loans l
  WHERE l.company_id = p_company_id
    AND l.type = 'granted'
    AND l.status <> 'cancelled'
    AND l.start_date <= v_end_of_month
    AND l.principal_amount > COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE (ft.metadata->>'loan_id')::uuid = l.id
        AND ft.type = 'credit'
        AND ft.transaction_date <= v_end_of_month
    ), 0);

  -- Adiantamentos Concedidos (Restantes no final do mês selecionado)
  SELECT COALESCE(SUM(
    a.amount - COALESCE((
      SELECT SUM(child.amount)
      FROM public.advances child
      WHERE child.parent_id = a.id
        AND child.status = 'settled'
        AND child.advance_date <= v_end_of_month
    ), 0)
  ), 0)
  INTO v_advances_given
  FROM public.advances a
  WHERE a.company_id = p_company_id
    AND a.parent_id IS NULL
    AND a.recipient_type IN ('supplier', 'shareholder')
    AND a.status <> 'cancelled'
    AND a.advance_date <= v_end_of_month
    AND a.amount > COALESCE((
      SELECT SUM(child.amount)
      FROM public.advances child
      WHERE child.parent_id = a.id
        AND child.status = 'settled'
        AND child.advance_date <= v_end_of_month
    ), 0);

  v_total_assets := v_total_bank_balance + v_pending_sales_receipts
    + v_merchandise_in_transit + v_total_fixed_assets + v_asset_sales_receivable
    + v_shareholder_receivables + v_loans_granted + v_advances_given;

  -- C) PASSIVOS
  -- Fornecedores (Grãos) (pendentes no final do mês selecionado)
  SELECT COALESCE(SUM(
    fe.total_amount - COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE ft.entry_id = fe.id
        AND ft.transaction_date <= v_end_of_month
    ), 0)
  ), 0)
  INTO v_pending_purchase_payments
  FROM public.financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.origin_type = 'purchase_order'
    AND fe.status NOT IN ('paid', 'cancelled', 'canceled')
    AND fe.created_date <= v_end_of_month
    AND fe.total_amount > COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE ft.entry_id = fe.id
        AND ft.transaction_date <= v_end_of_month
    ), 0);

  -- Fretes a Pagar (pendentes no final do mês selecionado)
  SELECT COALESCE(SUM(
    fe.total_amount - COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE ft.entry_id = fe.id
        AND ft.transaction_date <= v_end_of_month
    ), 0)
  ), 0)
  INTO v_pending_freight_payments
  FROM public.financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.origin_type = 'freight'
    AND fe.status NOT IN ('paid', 'cancelled', 'canceled')
    AND fe.created_date <= v_end_of_month
    AND fe.total_amount > COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE ft.entry_id = fe.id
        AND ft.transaction_date <= v_end_of_month
    ), 0);

  -- Comissões a Pagar (pendentes no final do mês selecionado)
  SELECT COALESCE(SUM(
    fe.total_amount - COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE ft.entry_id = fe.id
        AND ft.transaction_date <= v_end_of_month
    ), 0)
  ), 0)
  INTO v_commissions_to_pay
  FROM public.financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.origin_type = 'commission'
    AND fe.status NOT IN ('paid', 'cancelled', 'canceled')
    AND fe.created_date <= v_end_of_month
    AND fe.total_amount > COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE ft.entry_id = fe.id
        AND ft.transaction_date <= v_end_of_month
    ), 0);

  -- Empréstimos Tomados (Principal - Pagamentos efetuados até v_end_of_month)
  SELECT COALESCE(SUM(
    l.principal_amount - COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE (ft.metadata->>'loan_id')::uuid = l.id
        AND ft.type = 'debit'
        AND ft.transaction_date <= v_end_of_month
    ), 0)
  ), 0)
  INTO v_loans_taken
  FROM public.loans l
  WHERE l.company_id = p_company_id
    AND l.type = 'taken'
    AND l.status <> 'cancelled'
    AND l.start_date <= v_end_of_month
    AND l.principal_amount > COALESCE((
      SELECT SUM(ft.amount)
      FROM public.financial_transactions ft
      WHERE (ft.metadata->>'loan_id')::uuid = l.id
        AND ft.type = 'debit'
        AND ft.transaction_date <= v_end_of_month
    ), 0);

  -- Adiantamento de Clientes (Restantes no final do mês selecionado)
  SELECT COALESCE(SUM(
    a.amount - COALESCE((
      SELECT SUM(child.amount)
      FROM public.advances child
      WHERE child.parent_id = a.id
        AND child.status = 'settled'
        AND child.advance_date <= v_end_of_month
    ), 0)
  ), 0)
  INTO v_advances_taken
  FROM public.advances a
  WHERE a.company_id = p_company_id
    AND a.parent_id IS NULL
    AND a.recipient_type = 'client'
    AND a.status <> 'cancelled'
    AND a.advance_date <= v_end_of_month
    AND a.amount > COALESCE((
      SELECT SUM(child.amount)
      FROM public.advances child
      WHERE child.parent_id = a.id
        AND child.status = 'settled'
        AND child.advance_date <= v_end_of_month
    ), 0);

  v_total_liabilities := v_pending_purchase_payments + v_pending_freight_payments
    + v_commissions_to_pay + v_loans_taken + v_advances_taken + v_shareholder_payables;

  -- D) RESULTADO
  v_net_balance := v_total_assets - v_total_liabilities;

  result := json_build_object(
    'monthKey',                  to_char(v_start_of_month, 'YYYY-MM'),
    'monthLabel',                v_month_label,
    'referenceDate',             v_end_of_month,

    'bankBalances',              COALESCE(v_bank_balances, '[]'::json),
    'totalBankBalance',          v_total_bank_balance,
    'totalInitialBalance',       v_total_initial_balance,

    'pendingSalesReceipts',      v_pending_sales_receipts,
    'merchandiseInTransitValue', v_merchandise_in_transit,
    'totalFixedAssetsValue',     v_total_fixed_assets,
    'assetSalesReceivable',      v_asset_sales_receivable,
    'shareholderReceivables',    v_shareholder_receivables,
    'loansGranted',              v_loans_granted,
    'advancesGiven',             v_advances_given,
    'totalAssets',               v_total_assets,

    'pendingPurchasePayments',   v_pending_purchase_payments,
    'pendingFreightPayments',    v_pending_freight_payments,
    'commissionsToPay',          v_commissions_to_pay,
    'loansTaken',                v_loans_taken,
    'advancesTaken',             v_advances_taken,
    'shareholderPayables',       v_shareholder_payables,
    'totalLiabilities',          v_total_liabilities,

    'netBalance',                v_net_balance
  );

  RETURN result;
END;
$$;

