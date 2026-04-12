-- ============================================================================
-- 📊 MIGRATION: Corrigir Offset Temporal nos Saldos Iniciais do Caixa
-- Data: 2026-04-12
-- Objetivo: O módulo Caixa puxava o saldo inicial na data de 01/04 ignorando
-- a data do 'Marco Zero'. Se inserido no dia 12, ele não deveria contar para o
-- dia 01. Esta alteração garante a viagem no tempo correta dos caixas.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_get_account_balance_at_date(p_account_id uuid, p_date date)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_initial NUMERIC := 0;
  v_tx_sum NUMERIC := 0;
BEGIN
  -- 1. Pega o valor inicial implantado ANTES da data (o "closing balance" do dia anterior forma a abertura de p_date)
  SELECT COALESCE(SUM(value), 0) INTO v_initial 
  FROM public.initial_balances 
  WHERE account_id = p_account_id AND date < p_date;

  -- 2. Soma as transações antes da data solicitada
  SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0) INTO v_tx_sum
  FROM public.financial_transactions
  WHERE account_id = p_account_id AND transaction_date < p_date;

  RETURN v_initial + v_tx_sum;
END;
$function$;
