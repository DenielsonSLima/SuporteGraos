-- ============================================================================
-- Migration: Harden critical RPC permissions + search_path
-- Data: 2026-03-03
-- ============================================================================
-- OBJETIVO:
--   1) Remover EXECUTE público/anon de RPCs críticas (menor privilégio)
--   2) Garantir search_path seguro em funções SECURITY DEFINER
--   3) Manter apenas papéis necessários por função
--
-- ESCOPO:
--   - rpc_cashier_report(UUID)
--   - rpc_performance_report(UUID, INTEGER)
--   - rpc_set_initial_balance(UUID, TEXT, DATE, NUMERIC)
--   - rpc_remove_initial_balance(UUID)
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 1) rpc_cashier_report
-- ════════════════════════════════════════════════════════════════════════════
ALTER FUNCTION public.rpc_cashier_report(UUID)
  SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.rpc_cashier_report(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_cashier_report(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_cashier_report(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_cashier_report(UUID) TO service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 2) rpc_performance_report
-- ════════════════════════════════════════════════════════════════════════════
ALTER FUNCTION public.rpc_performance_report(UUID, INTEGER)
  SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.rpc_performance_report(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_performance_report(UUID, INTEGER) TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- 3) rpc_set_initial_balance / rpc_remove_initial_balance
-- ════════════════════════════════════════════════════════════════════════════
ALTER FUNCTION public.rpc_set_initial_balance(UUID, TEXT, DATE, NUMERIC)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.rpc_remove_initial_balance(UUID)
  SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.rpc_set_initial_balance(UUID, TEXT, DATE, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_remove_initial_balance(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rpc_set_initial_balance(UUID, TEXT, DATE, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_remove_initial_balance(UUID) TO authenticated;

SELECT 'MIGRATION_20260303_HARDEN_CRITICAL_RPC_PERMISSIONS_OK' AS status;
