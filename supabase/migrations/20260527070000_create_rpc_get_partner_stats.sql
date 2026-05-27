-- Migration: Create rpc_get_partner_stats_v1
-- Description: Dynamic database aggregation of Partner KPIs based on search and category filters, ensuring zero calculation on the frontend.

CREATE OR REPLACE FUNCTION public.rpc_get_partner_stats_v1(
  p_company_id uuid,
  p_search_term text DEFAULT NULL,
  p_category text DEFAULT NULL
)
RETURNS TABLE (
  total_receivable numeric,
  total_payable numeric,
  net_balance numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_search text;
BEGIN
  v_search := NULLIF(TRIM(p_search_term), '');
  
  RETURN QUERY
  WITH filtered_partners AS (
    SELECT DISTINCT p.id
    FROM public.parceiros_parceiros p
    LEFT JOIN public.parceiros_categorias pc ON p.id = pc.partner_id
    WHERE p.company_id = p_company_id
      AND (
        v_search IS NULL 
        OR p.name ILIKE '%' || v_search || '%'
        OR p.trade_name ILIKE '%' || v_search || '%'
        OR p.nickname ILIKE '%' || v_search || '%'
        OR p.document ILIKE '%' || v_search || '%'
      )
      AND (
        p_category IS NULL 
        OR p_category = 'all' 
        OR pc.partner_type_id = p_category
        OR p.partner_type_id = p_category
      )
  ),
  partner_payables AS (
    SELECT
      fe.partner_id,
      SUM(fe.total_amount - COALESCE(fe.paid_amount, 0)) as amount
    FROM public.financial_entries fe
    WHERE fe.company_id = p_company_id 
      AND fe.type = 'payable' 
      AND fe.status NOT IN ('paid', 'cancelled', 'canceled')
      AND fe.partner_id IN (SELECT id FROM filtered_partners)
    GROUP BY fe.partner_id
  ),
  partner_receivables AS (
    SELECT
      fe.partner_id,
      SUM(fe.total_amount - COALESCE(fe.paid_amount, 0)) as amount
    FROM public.financial_entries fe
    WHERE fe.company_id = p_company_id 
      AND fe.type = 'receivable' 
      AND fe.status NOT IN ('paid', 'cancelled', 'canceled')
      AND fe.partner_id IN (SELECT id FROM filtered_partners)
    GROUP BY fe.partner_id
  ),
  partner_advances AS (
    SELECT
      adv.recipient_id as partner_id,
      SUM(adv.amount - COALESCE(adv.settled_amount, 0)) as amount
    FROM public.advances adv
    WHERE adv.company_id = p_company_id 
      AND adv.status = 'open'
      AND adv.recipient_id IN (SELECT id FROM filtered_partners)
    GROUP BY adv.recipient_id
  ),
  totals AS (
    SELECT
      COALESCE(SUM(COALESCE(pr.amount, 0) + COALESCE(pa.amount, 0)), 0) as rec,
      COALESCE(SUM(COALESCE(pp.amount, 0)), 0) as pay
    FROM filtered_partners fp
    LEFT JOIN partner_receivables pr ON fp.id = pr.partner_id
    LEFT JOIN partner_advances pa ON fp.id = pa.partner_id
    LEFT JOIN partner_payables pp ON fp.id = pp.partner_id
  )
  SELECT
    rec::numeric as total_receivable,
    pay::numeric as total_payable,
    (rec - pay)::numeric as net_balance
  FROM totals;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_partner_stats_v1(uuid, text, text) TO authenticated;
