-- ============================================================================
-- Migration: Harden fn_ops_my_company_id helper
-- Data: 2026-03-03
-- ============================================================================
-- OBJETIVO:
--   Fortalecer o helper usado pelos rpc_ops_* para garantir que:
--   1) auth.uid() exista
--   2) usuário esteja ativo em app_users
--   3) company_id não seja nulo
--
-- IMPACTO:
--   Todos os rpc_ops_* que dependem de fn_ops_my_company_id passam a rejeitar
--   usuário não autenticado/inativo sem alterar cada função individualmente.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_ops_my_company_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Access denied: missing authenticated user';
  END IF;

  SELECT au.company_id
    INTO v_company_id
  FROM public.app_users au
  WHERE au.auth_user_id = (SELECT auth.uid())
    AND au.active = true
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: user has no active company mapping';
  END IF;

  RETURN v_company_id;
END;
$$;

SELECT 'MIGRATION_20260303_HARDEN_FN_OPS_MY_COMPANY_ID_OK' AS status;
