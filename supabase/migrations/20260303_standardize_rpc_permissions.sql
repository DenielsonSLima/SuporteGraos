-- ============================================================================
-- Migration: Standardize permissions for all public rpc_* functions
-- Data: 2026-03-03
-- ============================================================================
-- OBJETIVO:
--   Padronizar permissões de execução das RPCs expostas em public.
--
-- REGRA:
--   - Revoga PUBLIC
--   - Revoga anon (quando existir)
--   - Concede authenticated (quando existir)
--   - Concede service_role (quando existir)
--
-- OBS:
--   Idempotente e dinâmica: cobre funções atuais e futuras com prefixo rpc_.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
  v_has_anon BOOLEAN := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon');
  v_has_authenticated BOOLEAN := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated');
  v_has_service_role BOOLEAN := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role');
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname LIKE 'rpc\_%' ESCAPE '\\'
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC',
      r.schema_name,
      r.function_name,
      r.identity_args
    );

    IF v_has_anon THEN
      EXECUTE format(
        'REVOKE ALL ON FUNCTION %I.%I(%s) FROM anon',
        r.schema_name,
        r.function_name,
        r.identity_args
      );
    END IF;

    IF v_has_authenticated THEN
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated',
        r.schema_name,
        r.function_name,
        r.identity_args
      );
    END IF;

    IF v_has_service_role THEN
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
        r.schema_name,
        r.function_name,
        r.identity_args
      );
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Standardized permissions on % rpc_* function(s) in schema public', v_count;
END
$$;

SELECT 'MIGRATION_20260303_STANDARDIZE_RPC_PERMISSIONS_OK' AS status;
