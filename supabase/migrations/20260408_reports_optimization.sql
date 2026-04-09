-- ============================================================================
-- MIGRATION: 20260408_reports_optimization.sql
-- Objetivo: Mover cálculos pesados de relatórios para o PostgreSQL.
--           Elimina o carregamento de todo o histórico no navegador.
-- ============================================================================

SET search_path = public;

-- 1. RPC para Extrato Analítico Evolutivo (Com Cálculo de Saldo Anterior)
CREATE OR REPLACE FUNCTION public.rpc_report_account_statement_v1(
  p_account_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_initial_balance_val NUMERIC(15,2) := 0;
  v_initial_balance_date DATE := '2000-01-01';
  v_pre_period_sum NUMERIC(15,2) := 0;
  v_opening_balance NUMERIC(15,2) := 0;
  v_transactions JSONB;
  v_result JSONB;
BEGIN
  -- A. Obter o Saldo Inicial de Implantação da Conta
  SELECT COALESCE(value, 0), COALESCE(date, '2000-01-01')
  INTO v_initial_balance_val, v_initial_balance_date
  FROM public.initial_balances
  WHERE account_id = p_account_id;

  -- B. Calcular a soma de tudo que aconteceu entre o Saldo Inicial e a Data de Início
  SELECT SUM(CASE WHEN type IN ('IN', 'credit', 'receipt') THEN amount ELSE -amount END)
  INTO v_pre_period_sum
  FROM public.financial_transactions
  WHERE account_id = p_account_id
    AND transaction_date >= v_initial_balance_date
    AND transaction_date < p_start_date;

  v_opening_balance := v_initial_balance_val + COALESCE(v_pre_period_sum, 0);

  -- C. Buscar as transações do período solicitado
  SELECT jsonb_agg(tx) INTO v_transactions
  FROM (
    SELECT 
      id,
      transaction_date AS date,
      description,
      type,
      amount AS value,
      CASE WHEN type IN ('IN', 'credit', 'receipt') THEN 'Crédito' ELSE 'Débito' END as category
    FROM public.financial_transactions
    WHERE account_id = p_account_id
      AND transaction_date >= p_start_date
      AND transaction_date <= p_end_date
    ORDER BY transaction_date ASC, created_at ASC
  ) tx;

  -- D. Montar o resultado
  v_result := jsonb_build_object(
    'success', true,
    'account_id', p_account_id,
    'opening_balance', v_opening_balance,
    'transactions', COALESCE(v_transactions, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

-- 2. RPC para Listagem Consolidada de Títulos (Pagar/Receber) com Filtro
-- Otimiza o carregamento de Contas a Pagar/Receber nos relatórios
CREATE OR REPLACE FUNCTION public.rpc_report_financial_entries_v1(
  p_company_id UUID,
  p_type TEXT, -- 'payable' ou 'receivable'
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data JSONB;
BEGIN
  SELECT jsonb_agg(e) INTO v_data
  FROM (
      SELECT 
        e.id,
        e.due_date,
        e.created_date,
        e.partner_name as "entityName",
        e.description,
        e.origin_type as category,
        e.total_amount as "originalValue",
        e.paid_amount as "paidValue",
        e.remaining_amount as "remainingValue",
        e.status
      FROM public.vw_financial_entries_enriched e
      WHERE e.company_id = p_company_id
        AND e.type = p_type
        AND e.due_date >= p_start_date
        AND e.due_date <= p_end_date
      ORDER BY e.due_date ASC
  ) e;

  RETURN jsonb_build_object(
    'success', true,
    'count', jsonb_array_length(COALESCE(v_data, '[]'::jsonb)),
    'records', COALESCE(v_data, '[]'::jsonb)
  );
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.rpc_report_account_statement_v1(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_report_financial_entries_v1(UUID, TEXT, DATE, DATE) TO authenticated;
