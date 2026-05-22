CREATE OR REPLACE FUNCTION public.rpc_loans_active_totals()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_company_id UUID;
  v_taken_principal NUMERIC := 0;
  v_taken_paid NUMERIC := 0;
  v_taken_remaining NUMERIC := 0;
  v_granted_principal NUMERIC := 0;
  v_granted_paid NUMERIC := 0;
  v_granted_remaining NUMERIC := 0;
  v_count_active INT := 0;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RETURN json_build_object(
      'takenPrincipal', 0, 'takenPaid', 0, 'takenRemaining', 0,
      'grantedPrincipal', 0, 'grantedPaid', 0, 'grantedRemaining', 0,
      'netBalance', 0, 'countActive', 0
    );
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN type = 'taken' THEN principal_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'taken' THEN paid_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'taken' THEN remaining_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'granted' THEN principal_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'granted' THEN paid_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'granted' THEN remaining_amount ELSE 0 END), 0),
    COUNT(*)
  INTO 
    v_taken_principal, v_taken_paid, v_taken_remaining, 
    v_granted_principal, v_granted_paid, v_granted_remaining, 
    v_count_active
  FROM public.loans
  WHERE company_id = v_company_id
    AND status = 'open';

  RETURN json_build_object(
    'takenPrincipal', v_taken_principal,
    'takenPaid', v_taken_paid,
    'takenRemaining', v_taken_remaining,
    'grantedPrincipal', v_granted_principal,
    'grantedPaid', v_granted_paid,
    'grantedRemaining', v_granted_remaining,
    'netBalance', v_granted_remaining - v_taken_remaining,
    'countActive', v_count_active
  );
END;
$$;
