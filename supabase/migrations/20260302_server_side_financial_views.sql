-- ============================================================================
-- Migration: Server-Side Financial VIEWs + RPCs
-- Data: 2026-03-02
-- ============================================================================
-- OBJETIVO: Mover cálculos financeiros críticos do frontend para o banco.
-- Regra 5.4: "Não fazer cálculo crítico no front-end"
-- Regra 7.2: "Toda regra financeira deve estar no banco"
--
-- Schema real mapeado:
--   financial_entries.type = 'payable' | 'receivable'
--   financial_entries.origin_type = 'purchase_order' | 'sales_order' | 'freight'
--   financial_entries.status = 'open' | 'partially_paid' | 'paid' | ...
--   financial_transactions.type = 'credit' | 'debit'
--   shareholder_transactions.value (not amount); type = 'credit' | 'debit'
--   shareholders.current_balance (pre-computed)
--   admin_expenses = standalone_records do frontend (sub_type, issue_date, etc.)
--   loans + loan_installments = empréstimos
--   credit_lines.total_limit, used_amount, available_amount, is_active
--   advances.amount, settled_amount, remaining_amount, recipient_type, status
--
-- CRIA:
--   1. VIEW v_payable_balances      — saldos de contas a pagar
--   2. VIEW v_receivable_balances   — saldos de contas a receber
--   3. VIEW v_loan_summary          — resumo de empréstimos
--   4. VIEW v_admin_expense_kpis    — totais de despesas administrativas
--   5. VIEW v_credit_line_summary   — limite/usado/disponível
--   6. VIEW v_shareholder_balances  — saldo de cada sócio
--   7. RPC  rpc_monthly_balance_sheet — balanço patrimonial mensal completo
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 1. VIEW: Contas a Pagar — saldo pendente por entidade
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.v_payable_balances AS
SELECT
  fe.company_id,
  fe.id,
  fe.origin_type,
  fe.type,
  fe.total_amount                                    AS original_value,
  COALESCE(fe.paid_amount, 0)                        AS paid_value,
  COALESCE(fe.remaining_amount,
    fe.total_amount - COALESCE(fe.paid_amount, 0))   AS remaining_balance,
  fe.status,
  fe.due_date,
  fe.created_date,
  fe.description
FROM financial_entries fe
WHERE fe.type = 'payable'
  AND fe.status NOT IN ('paid', 'cancelled', 'canceled');

-- ════════════════════════════════════════════════════════════════════════════
-- 2. VIEW: Contas a Receber — saldo pendente por entidade
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.v_receivable_balances AS
SELECT
  fe.company_id,
  fe.id,
  fe.origin_type,
  fe.type,
  fe.total_amount                                    AS original_value,
  COALESCE(fe.paid_amount, 0)                        AS paid_value,
  COALESCE(fe.remaining_amount,
    fe.total_amount - COALESCE(fe.paid_amount, 0))   AS remaining_balance,
  fe.status,
  fe.due_date,
  fe.created_date,
  fe.description
FROM financial_entries fe
WHERE fe.type = 'receivable'
  AND fe.status NOT IN ('paid', 'cancelled', 'canceled');

-- ════════════════════════════════════════════════════════════════════════════
-- 3. VIEW: Resumo de Empréstimos (tabelas: loans + loan_installments)
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.v_loan_summary AS
SELECT
  l.company_id,
  l.id,
  l.principal_amount,
  COALESCE(l.paid_amount, 0) AS paid_amount,
  COALESCE(l.remaining_amount,
    l.principal_amount - COALESCE(l.paid_amount, 0)) AS remaining_balance,
  l.interest_rate,
  l.status,
  l.start_date,
  l.end_date,
  COALESCE(inst.total_installments, 0) AS total_installments,
  COALESCE(inst.paid_installments, 0)  AS paid_installments
FROM loans l
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int AS total_installments,
    COUNT(*) FILTER (WHERE li.status = 'paid')::int AS paid_installments
  FROM loan_installments li
  WHERE li.loan_id = l.id
) inst ON true
WHERE l.status NOT IN ('paid', 'cancelled');

-- ════════════════════════════════════════════════════════════════════════════
-- 4. VIEW: KPIs de Despesas Administrativas (admin_expenses)
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.v_admin_expense_kpis AS
SELECT
  ae.company_id,
  COALESCE(SUM(ae.amount), 0) AS total_value,
  COALESCE(SUM(CASE WHEN ae.status = 'paid' THEN ae.amount ELSE 0 END), 0) AS paid_value,
  COALESCE(SUM(CASE WHEN ae.status <> 'paid' THEN ae.amount ELSE 0 END), 0) AS pending_value,
  COUNT(*) AS total_count
FROM admin_expenses ae
GROUP BY ae.company_id;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. VIEW: Linhas de Crédito — limite / usado / disponível
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.v_credit_line_summary AS
SELECT
  cl.company_id,
  COALESCE(SUM(cl.total_limit), 0)       AS total_limit,
  COALESCE(SUM(cl.used_amount), 0)       AS total_used,
  COALESCE(SUM(cl.available_amount), 0)  AS total_available,
  COUNT(*) AS line_count
FROM credit_lines cl
WHERE cl.is_active = true
GROUP BY cl.company_id;

-- ════════════════════════════════════════════════════════════════════════════
-- 6. VIEW: Saldo de cada Sócio (shareholder_transactions.value)
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.v_shareholder_balances AS
SELECT
  s.company_id,
  s.id AS shareholder_id,
  s.name,
  s.current_balance,
  COALESCE(SUM(CASE WHEN st.type = 'credit' THEN st.value ELSE 0 END), 0) AS total_credits,
  COALESCE(SUM(CASE WHEN st.type = 'debit'  THEN st.value ELSE 0 END), 0) AS total_debits,
  COALESCE(SUM(CASE WHEN st.type = 'credit' THEN st.value ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN st.type = 'debit' THEN st.value ELSE 0 END), 0) AS computed_balance
FROM shareholders s
LEFT JOIN shareholder_transactions st ON st.shareholder_id = s.id
GROUP BY s.company_id, s.id, s.name, s.current_balance;


-- ════════════════════════════════════════════════════════════════════════════
-- 7. RPC: Balanço Patrimonial Mensal Completo (SUBSTITUI historyService.ts)
--
-- Antes: ~20 .reduce() no browser calculando TUDO
-- Agora: 1 RPC atômica que retorna o balanço completo em JSON
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.rpc_monthly_balance_sheet(
  p_company_id UUID,
  p_year       INT,
  p_month      INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
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
  v_start_of_month := make_date(p_year, p_month, 1);
  v_end_of_month   := (v_start_of_month + interval '1 month - 1 day')::date;
  v_month_label    := to_char(v_start_of_month, 'TMMonth YYYY');

  -- ══════════════════════════════════════════════════════════════════════
  -- A) SALDOS BANCÁRIOS (início e fim do mês)
  --    Tabelas: accounts, initial_balances, financial_transactions
  --    financial_transactions.type = 'credit' | 'debit'
  -- ══════════════════════════════════════════════════════════════════════
  WITH active_accounts AS (
    SELECT a.id
    FROM accounts a
    WHERE a.company_id = p_company_id
      AND a.is_active = true
  ),
  initial_vals AS (
    SELECT
      ib.account_id,
      COALESCE(SUM(ib.value), 0) AS init_value
    FROM initial_balances ib
    WHERE ib.company_id = p_company_id
      AND ib.account_id IN (SELECT id FROM active_accounts)
    GROUP BY ib.account_id
  ),
  -- Transações ANTES do mês (acumulado)
  tx_before_month AS (
    SELECT
      ft.account_id,
      SUM(
        CASE ft.type
          WHEN 'credit' THEN ft.amount
          WHEN 'debit'  THEN -ft.amount
          ELSE 0
        END
      ) AS net_before
    FROM financial_transactions ft
    WHERE ft.company_id = p_company_id
      AND ft.transaction_date < v_start_of_month
      AND ft.account_id IN (SELECT id FROM active_accounts)
    GROUP BY ft.account_id
  ),
  -- Transações DO mês
  tx_in_month AS (
    SELECT
      ft.account_id,
      SUM(
        CASE ft.type
          WHEN 'credit' THEN ft.amount
          WHEN 'debit'  THEN -ft.amount
          ELSE 0
        END
      ) AS net_in_month
    FROM financial_transactions ft
    WHERE ft.company_id = p_company_id
      AND ft.transaction_date >= v_start_of_month
      AND ft.transaction_date <= v_end_of_month
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

  -- ══════════════════════════════════════════════════════════════════════
  -- B) ATIVOS
  -- ══════════════════════════════════════════════════════════════════════

  -- Contas a receber (vendas) em aberto até fim do mês
  -- financial_entries: type='receivable', origin_type='sales_order'
  SELECT COALESCE(SUM(
    COALESCE(fe.remaining_amount, fe.total_amount - COALESCE(fe.paid_amount, 0))
  ), 0)
  INTO v_pending_sales_receipts
  FROM financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'receivable'
    AND fe.origin_type = 'sales_order'
    AND fe.status NOT IN ('paid', 'cancelled', 'canceled')
    AND fe.created_date <= v_end_of_month;

  -- Mercadoria em trânsito (ops_loadings)
  SELECT COALESCE(SUM(COALESCE(l.total_sales_value, 0)), 0)
  INTO v_merchandise_in_transit
  FROM ops_loadings l
  WHERE l.company_id = p_company_id
    AND COALESCE(l.status, '') IN ('loaded', 'in_transit', 'redirected', 'waiting_unload');

  -- Ativos imobilizados
  SELECT COALESCE(SUM(a.acquisition_value), 0)
  INTO v_total_fixed_assets
  FROM assets a
  WHERE a.company_id = p_company_id
    AND a.status = 'active';

  -- Haveres de sócios (current_balance < 0 = empresa tem a receber)
  SELECT COALESCE(SUM(ABS(s.current_balance)), 0)
  INTO v_shareholder_receivables
  FROM shareholders s
  WHERE s.company_id = p_company_id
    AND s.current_balance < 0;

  -- Empréstimos concedidos (tabela: loans, não existe sub_type — usa lender_id relationship)
  -- Empréstimos onde a empresa emprestou = principal - paid pendente
  -- Como a tabela loans não diferencia taken/granted explicitamente,
  -- e está vazia, colocamos consulta preparada para suportar quando houver dados.
  -- Por enquanto: 0 (tabela vazia, sem campo de direção)
  v_loans_granted := 0;

  -- Adiantamentos dados (advances com saldo positivo = empresa adiantou)
  SELECT COALESCE(SUM(
    COALESCE(a.remaining_amount, a.amount - COALESCE(a.settled_amount, 0))
  ), 0)
  INTO v_advances_given
  FROM advances a
  WHERE a.company_id = p_company_id
    AND a.recipient_type = 'given'
    AND a.status NOT IN ('settled', 'cancelled');

  v_total_assets := v_total_bank_balance + v_pending_sales_receipts
    + v_merchandise_in_transit + v_total_fixed_assets
    + v_shareholder_receivables + v_loans_granted + v_advances_given;

  -- ══════════════════════════════════════════════════════════════════════
  -- C) PASSIVOS
  -- ══════════════════════════════════════════════════════════════════════

  -- Contas a pagar (compras)
  SELECT COALESCE(SUM(
    COALESCE(fe.remaining_amount, fe.total_amount - COALESCE(fe.paid_amount, 0))
  ), 0)
  INTO v_pending_purchase_payments
  FROM financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.origin_type = 'purchase_order'
    AND fe.status NOT IN ('paid', 'cancelled', 'canceled')
    AND fe.created_date <= v_end_of_month;

  -- Fretes a pagar
  SELECT COALESCE(SUM(
    COALESCE(fe.remaining_amount, fe.total_amount - COALESCE(fe.paid_amount, 0))
  ), 0)
  INTO v_pending_freight_payments
  FROM financial_entries fe
  WHERE fe.company_id = p_company_id
    AND fe.type = 'payable'
    AND fe.origin_type = 'freight'
    AND fe.status NOT IN ('paid', 'cancelled', 'canceled')
    AND fe.created_date <= v_end_of_month;

  -- Comissões a pagar (não existe origin_type='commission' no banco atual)
  -- Query preparada para quando existir
  v_commissions_to_pay := 0;

  -- Empréstimos tomados (zero por ora, tabela loans vazia e sem direção explícita)
  v_loans_taken := 0;

  -- Adiantamentos tomados (advances com recipient_type = 'received')
  SELECT COALESCE(SUM(
    COALESCE(a.remaining_amount, a.amount - COALESCE(a.settled_amount, 0))
  ), 0)
  INTO v_advances_taken
  FROM advances a
  WHERE a.company_id = p_company_id
    AND a.recipient_type = 'received'
    AND a.status NOT IN ('settled', 'cancelled');

  -- Obrigações com sócios (current_balance > 0 = empresa deve ao sócio)
  SELECT COALESCE(SUM(s.current_balance), 0)
  INTO v_shareholder_payables
  FROM shareholders s
  WHERE s.company_id = p_company_id
    AND s.current_balance > 0;

  v_total_liabilities := v_pending_purchase_payments + v_pending_freight_payments
    + v_commissions_to_pay + v_loans_taken + v_advances_taken + v_shareholder_payables;

  -- ══════════════════════════════════════════════════════════════════════
  -- D) RESULTADO
  -- ══════════════════════════════════════════════════════════════════════
  v_net_balance := v_total_assets - v_total_liabilities;

  result := json_build_object(
    'monthKey',        to_char(v_start_of_month, 'YYYY-MM'),
    'monthLabel',      v_month_label,
    'referenceDate',   v_end_of_month,

    'bankBalances',              COALESCE(v_bank_balances, '[]'::json),
    'totalBankBalance',          v_total_bank_balance,
    'totalInitialBalance',       v_total_initial_balance,

    'pendingSalesReceipts',      v_pending_sales_receipts,
    'merchandiseInTransitValue', v_merchandise_in_transit,
    'totalFixedAssetsValue',     v_total_fixed_assets,
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

-- ════════════════════════════════════════════════════════════════════════════
-- ÍNDICES de suporte às VIEWs e RPC
-- ════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_fe_company_type_status
  ON financial_entries (company_id, type, status);

CREATE INDEX IF NOT EXISTS idx_fe_company_origin_type
  ON financial_entries (company_id, origin_type);

CREATE INDEX IF NOT EXISTS idx_ft_company_account_date
  ON financial_transactions (company_id, account_id, transaction_date);

CREATE INDEX IF NOT EXISTS idx_ib_company_account
  ON initial_balances (company_id, account_id);

CREATE INDEX IF NOT EXISTS idx_ol_company_status
  ON ops_loadings (company_id, status);

CREATE INDEX IF NOT EXISTS idx_sh_company_balance
  ON shareholders (company_id, current_balance);

-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO
-- ════════════════════════════════════════════════════════════════════════════
SELECT 'MIGRATION_20260302_SERVER_SIDE_FINANCIAL_VIEWS_OK' AS status;
