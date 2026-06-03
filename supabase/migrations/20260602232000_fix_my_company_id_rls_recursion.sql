-- Migration: Fix my_company_id RLS recursion
-- Date: 2026-06-02
-- Description: Changes public.my_company_id() helper function from LANGUAGE sql to LANGUAGE plpgsql.
--              This prevents PostgreSQL from inlining the function during query planning, which
--              guarantees the SECURITY DEFINER context is preserved and breaks the RLS infinite recursion loop
--              on the app_users table.

CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT au.company_id INTO v_company_id
  FROM public.app_users au
  WHERE au.auth_user_id = auth.uid()
    AND au.active = true
  LIMIT 1;

  RETURN v_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.my_company_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_company_id() TO service_role;
