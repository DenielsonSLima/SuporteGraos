-- ============================================================================
-- Migration: Harden rpc_dashboard_data permissions + search_path
-- Data: 2026-03-03
-- ============================================================================
-- OBJETIVO:
--   1) SECURITY DEFINER com search_path controlado (evita hijack por schema)
--   2) Remover execução pública implícita
--   3) Permitir execução apenas para roles esperadas no Supabase
-- ============================================================================

-- 1) SECURITY DEFINER hardening: search_path explícito e mínimo
ALTER FUNCTION public.rpc_dashboard_data(UUID)
  SET search_path = public, pg_temp;

-- 2) Fechar execução pública
REVOKE ALL ON FUNCTION public.rpc_dashboard_data(UUID) FROM PUBLIC;

-- 3) Reabrir apenas para papéis de aplicação
GRANT EXECUTE ON FUNCTION public.rpc_dashboard_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_dashboard_data(UUID) TO service_role;

-- Verificação
SELECT 'MIGRATION_20260303_HARDEN_RPC_DASHBOARD_DATA_PERMISSIONS_OK' AS status;
