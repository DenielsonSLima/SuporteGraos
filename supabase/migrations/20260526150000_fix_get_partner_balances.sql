-- ============================================================================
-- Migration: Fix get_partner_balances function to use proper status filters
-- Data: 2026-05-26
-- ============================================================================
-- CORRIGE:
--   1) Substitui o filtro `status = 'open'` por `status NOT IN ('paid', 'cancelled', 'canceled')`
--      já que as entradas financeiras não-pagas usam o status 'pending' ou 'partial'
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_partner_balances(p_company_id uuid)
 RETURNS TABLE(partner_id uuid, partner_name text, total_payable numeric, total_receivable numeric, total_advances numeric, net_balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH partner_payables AS (
    -- Entradas a pagar (debito)
    SELECT
      fe.partner_id,
      SUM(fe.total_amount - COALESCE(fe.paid_amount, 0)) as amount
    FROM public.financial_entries fe
    WHERE fe.company_id = p_company_id 
      AND fe.type = 'payable' 
      AND fe.status NOT IN ('paid', 'cancelled', 'canceled')
    GROUP BY fe.partner_id
  ),
  partner_receivables AS (
    -- Entradas a receber (credito)
    SELECT
      fe.partner_id,
      SUM(fe.total_amount - COALESCE(fe.paid_amount, 0)) as amount
    FROM public.financial_entries fe
    WHERE fe.company_id = p_company_id 
      AND fe.type = 'receivable' 
      AND fe.status NOT IN ('paid', 'cancelled', 'canceled')
    GROUP BY fe.partner_id
  ),
  partner_advances AS (
    -- Adiantamentos (netBalance do advanceService)
    SELECT
      adv.recipient_id as partner_id,
      SUM(adv.amount - COALESCE(adv.settled_amount, 0)) as amount
    FROM public.advances adv
    WHERE adv.company_id = p_company_id AND adv.status = 'open'
    GROUP BY adv.recipient_id
  )
  SELECT
    p.id as partner_id,
    p.name as partner_name,
    COALESCE(pp.amount, 0) as total_payable,
    COALESCE(pr.amount, 0) as total_receivable,
    COALESCE(pa.amount, 0) as total_advances,
    (COALESCE(pr.amount, 0) + COALESCE(pa.amount, 0) - COALESCE(pp.amount, 0)) as net_balance
  FROM public.parceiros_parceiros p
  LEFT JOIN partner_payables pp ON p.id = pp.partner_id
  LEFT JOIN partner_receivables pr ON p.id = pr.partner_id
  LEFT JOIN partner_advances pa ON p.id = pa.partner_id
  WHERE p.company_id = p_company_id;
END;
$function$;

SELECT 'MIGRATION_20260526_FIX_GET_PARTNER_BALANCES' AS status;
