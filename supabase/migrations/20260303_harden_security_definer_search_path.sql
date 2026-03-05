-- ============================================================================
-- Migration: Harden SECURITY DEFINER search_path (public schema)
-- Data: 2026-03-03
-- ============================================================================
-- OBJETIVO:
--   Aplicar search_path seguro em TODAS as funções SECURITY DEFINER de public,
--   reduzindo risco de function hijacking por schema injection.
--
-- ABORDAGEM:
--   - Descoberta dinâmica via pg_proc/pg_namespace
--   - ALTER FUNCTION ... SET search_path = public, pg_temp
--   - Idempotente (pode rodar mais de uma vez)
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
      r.schema_name,
      r.function_name,
      r.identity_args
    );
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Hardened search_path on % SECURITY DEFINER function(s) in schema public', v_count;
END
$$;

SELECT 'MIGRATION_20260303_HARDEN_SECURITY_DEFINER_SEARCH_PATH_OK' AS status;
