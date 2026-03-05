-- ============================================================================
-- Migration: RPC rpc_financial_entry_totals_by_type
-- Data: 2026-03-02
-- ============================================================================
-- OBJETIVO: Substituir o .reduce() do frontend por agregação SQL server-side.
-- Antes:  getTotalsByType busca TODAS entries não-canceladas e reduce no browser
-- Agora:  1 RPC que retorna {total, paid, remaining} via SUM() no Postgres
--
-- Regra 5.4: "Não fazer cálculo crítico no front-end"
-- Regra 7.2: "Toda regra financeira deve estar no banco"
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_financial_entry_totals_by_type(p_type text)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'total',     COALESCE(SUM(fe.total_amount), 0),
    'paid',      COALESCE(SUM(COALESCE(fe.paid_amount, 0)), 0),
    'remaining', COALESCE(SUM(COALESCE(fe.remaining_amount,
                    fe.total_amount - COALESCE(fe.paid_amount, 0))), 0)
  )
  FROM financial_entries fe
  WHERE fe.type = p_type
    AND fe.status <> 'cancelled'
    AND fe.company_id = (
      SELECT au.company_id
      FROM app_users au
      WHERE au.id = auth.uid()
    );
$$;

-- Permissão para chamada autenticada via PostgREST
GRANT EXECUTE ON FUNCTION public.rpc_financial_entry_totals_by_type(text) TO authenticated;

SELECT 'MIGRATION_20260302_RPC_FINANCIAL_ENTRY_TOTALS_OK' AS status;

-- NOTA: Corrigido em 20260303_fix_rpc_auth_validation.sql
-- Bug: au.id = auth.uid() → au.auth_user_id = auth.uid()
-- (app_users.id é PK separada, auth_user_id é o link com auth.uid())
