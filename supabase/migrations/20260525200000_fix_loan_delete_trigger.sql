-- ============================================================================
-- Migration: Fix fn_loan_delete_cleanup trigger function
-- ============================================================================
-- The original trigger referenced a non-existent column 'loan_id' in the
-- 'financial_links' table, causing DELETE operations on loans to fail with:
--   ERROR: column "loan_id" does not exist
-- This fix uses metadata->>'loan_id' on financial_transactions instead.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_loan_delete_cleanup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deletar transações financeiras vinculadas via metadata
  DELETE FROM public.financial_transactions
  WHERE metadata->>'loan_id' = OLD.id::text;

  -- Deletar entries financeiras vinculadas
  DELETE FROM public.financial_entries
  WHERE origin_type IN ('loan', 'loan_taken', 'loan_granted')
    AND origin_id = OLD.id;

  RETURN OLD;
END;
$$;
