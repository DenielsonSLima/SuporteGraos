-- Migration: Fix app_users RLS recursion using helper security definer functions
-- Date: 2026-06-03
-- Description: Wraps RLS check logic in PL/pgSQL SECURITY DEFINER functions to bypass RLS internally
--              and prevent PostgreSQL from detecting infinite recursion on table app_users.

-- 1. Helper function to check if updater can UPDATE the target row (USING clause)
CREATE OR REPLACE FUNCTION public.can_update_app_user(
  target_auth_user_id UUID,
  target_role TEXT,
  target_company_id UUID
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updater_role TEXT;
  v_updater_company_id UUID;
  v_updater_active BOOLEAN;
BEGIN
  -- Get updater details
  SELECT role, company_id, active 
  INTO v_updater_role, v_updater_company_id, v_updater_active
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  -- If updater is not found or not active, deny
  IF v_updater_role IS NULL OR v_updater_active = false THEN
    RETURN false;
  END IF;

  -- Case 1: Updating own profile
  IF target_auth_user_id = auth.uid() THEN
    RETURN true;
  END IF;

  -- Case 2: Updater is an admin of the same company
  IF v_updater_role = 'admin' AND v_updater_company_id = target_company_id THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 2. Helper function to check if updated row is valid (WITH CHECK clause)
CREATE OR REPLACE FUNCTION public.check_app_user_update_with_check(
  target_auth_user_id UUID,
  new_role TEXT,
  new_company_id UUID
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updater_role TEXT;
  v_updater_company_id UUID;
  v_updater_active BOOLEAN;
BEGIN
  -- Get updater details
  SELECT role, company_id, active 
  INTO v_updater_role, v_updater_company_id, v_updater_active
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  -- If updater is not found or not active, deny
  IF v_updater_role IS NULL OR v_updater_active = false THEN
    RETURN false;
  END IF;

  -- The updated row must belong to the updater's company
  IF new_company_id != v_updater_company_id THEN
    RETURN false;
  END IF;

  -- Case 1: Updating own profile (cannot change own role)
  IF target_auth_user_id = auth.uid() THEN
    RETURN new_role = v_updater_role;
  END IF;

  -- Case 2: Updater is an admin of the same company (can change target user's role/details)
  IF v_updater_role = 'admin' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 3. Helper function to check if creator can INSERT the new row (WITH CHECK clause)
CREATE OR REPLACE FUNCTION public.can_insert_app_user(new_company_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updater_role TEXT;
  v_updater_company_id UUID;
  v_updater_active BOOLEAN;
BEGIN
  -- Get updater details
  SELECT role, company_id, active 
  INTO v_updater_role, v_updater_company_id, v_updater_active
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  RETURN (v_updater_role = 'admin' AND v_updater_active = true AND v_updater_company_id = new_company_id);
END;
$$;

-- Grant execute permissions to authenticated and service_role
REVOKE ALL ON FUNCTION public.can_update_app_user(UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_update_app_user(UUID, TEXT, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_app_user_update_with_check(UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_app_user_update_with_check(UUID, TEXT, UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.can_insert_app_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_insert_app_user(UUID) TO authenticated, service_role;

-- 4. Recreate the RLS policies for app_users
DROP POLICY IF EXISTS "app_users_update" ON public.app_users;
DROP POLICY IF EXISTS "app_users_insert_admin" ON public.app_users;

-- Recreate UPDATE policy
CREATE POLICY "app_users_update" ON public.app_users
  FOR UPDATE
  TO authenticated, service_role
  USING (public.can_update_app_user(auth_user_id, role, company_id))
  WITH CHECK (public.check_app_user_update_with_check(auth_user_id, role, company_id));

-- Recreate INSERT policy
CREATE POLICY "app_users_insert_admin" ON public.app_users
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_insert_app_user(company_id));
