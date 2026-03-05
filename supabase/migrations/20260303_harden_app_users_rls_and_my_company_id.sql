-- ============================================================================
-- Migration: Harden app_users RLS + my_company_id helper (SKIL)
-- Data: 2026-03-03
-- ============================================================================
-- OBJETIVO:
--   1) Hardening de my_company_id() para validar usuário ativo e search_path seguro
--   2) Corrigir risco de privilege escalation em app_users UPDATE (WITH CHECK)
--   3) Restringir INSERT em app_users por tenant para authenticated admin
--      e manter via service_role para operações de backend
--
-- MOTIVAÇÃO (SKIL):
--   - Regra de validação estrita de tenant/company_id em todas as operações
--   - Regra de segurança para SECURITY DEFINER (search_path explícito)
--   - Princípio de menor privilégio em RLS
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- 1) Harden helper my_company_id
-- ════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT au.company_id
  FROM public.app_users au
  WHERE au.auth_user_id = (SELECT auth.uid())
    AND au.active = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.my_company_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_company_id() TO service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 2) Recriar policies de app_users com WITH CHECK robusto
-- ════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "app_users_update" ON public.app_users;
DROP POLICY IF EXISTS "app_users_insert_service" ON public.app_users;
DROP POLICY IF EXISTS "app_users_insert_admin" ON public.app_users;

-- UPDATE seguro:
--   - Usuário comum só atualiza a própria linha e sem escalonar role/company
--   - Admin ativo da mesma empresa pode atualizar usuários da sua empresa
CREATE POLICY "app_users_update" ON public.app_users
  FOR UPDATE
  USING (
    auth_user_id = (SELECT auth.uid())
    OR
    EXISTS (
      SELECT 1
      FROM public.app_users u
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND u.role = 'admin'
        AND u.active = true
        AND u.company_id = app_users.company_id
    )
  )
  WITH CHECK (
    company_id = (SELECT public.my_company_id())
    AND (
      (
        auth_user_id = (SELECT auth.uid())
        AND role = (
          SELECT u.role
          FROM public.app_users u
          WHERE u.auth_user_id = (SELECT auth.uid())
          LIMIT 1
        )
      )
      OR
      EXISTS (
        SELECT 1
        FROM public.app_users u
        WHERE u.auth_user_id = (SELECT auth.uid())
          AND u.role = 'admin'
          AND u.active = true
          AND u.company_id = app_users.company_id
      )
    )
  );

-- INSERT por usuário autenticado: apenas admin ativo da mesma empresa
CREATE POLICY "app_users_insert_admin" ON public.app_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (SELECT public.my_company_id())
    AND EXISTS (
      SELECT 1
      FROM public.app_users u
      WHERE u.auth_user_id = (SELECT auth.uid())
        AND u.role = 'admin'
        AND u.active = true
        AND u.company_id = app_users.company_id
    )
  );

-- INSERT por backend (service_role)
CREATE POLICY "app_users_insert_service" ON public.app_users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

SELECT 'MIGRATION_20260303_HARDEN_APP_USERS_RLS_AND_MY_COMPANY_ID_OK' AS status;
