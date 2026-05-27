-- ============================================================================
-- Migration: Create Dynamic Filter-Responsive KPI Functions
-- Date: 2026-05-27
-- ============================================================================

SET search_path = public;

-- 1. Sales Order stats v4 (com suporte a filtros dinâmicos)
CREATE OR REPLACE FUNCTION public.rpc_get_sales_order_stats_v4(
  p_company_id UUID,
  p_search_term TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_shareholder TEXT DEFAULT NULL,
  p_statuses TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH filtered_orders AS (
    SELECT id, total_value, status, metadata
    FROM ops_sales_orders
    WHERE company_id = p_company_id
      AND (
        (p_statuses IS NULL OR cardinality(p_statuses) = 0) AND status != 'canceled'
        OR (p_statuses IS NOT NULL AND cardinality(p_statuses) > 0 AND status = ANY(p_statuses))
      )
      AND (
        p_search_term IS NULL OR p_search_term = ''
        OR number ILIKE '%' || p_search_term || '%'
        OR customer_name ILIKE '%' || p_search_term || '%'
      )
      AND (p_start_date IS NULL OR order_date >= p_start_date)
      AND (p_end_date IS NULL OR order_date <= p_end_date)
      AND (p_shareholder IS NULL OR p_shareholder = '' OR metadata->>'consultantName' = p_shareholder)
  ),
  stats AS (
    SELECT 
      (SELECT COALESCE(SUM(total_value), 0) FROM filtered_orders) as total_contract,
      (SELECT COUNT(*) FROM filtered_orders) as order_count,
      
      COALESCE(SUM(CASE WHEN l.unload_weight_kg IS NOT NULL AND l.unload_weight_kg > 0 THEN l.total_sales_value ELSE 0 END), 0) as total_delivered,
      
      (
        SELECT COALESCE(SUM(remaining_amount), 0) 
        FROM vw_receivables_enriched 
        WHERE company_id = p_company_id 
          AND (origin_type = 'sales_order' OR origin_type = 'sales_order_loading')
          AND sales_order_id IN (SELECT id FROM filtered_orders)
      ) as pending_receipt,
      
      COALESCE(SUM(CASE WHEN (l.unload_weight_kg IS NULL OR l.unload_weight_kg = 0) AND l.status != 'canceled' AND l.total_sales_value > 0 THEN l.total_sales_value ELSE 0 END), 0) as total_transit_val,
      COALESCE(COUNT(l.id) FILTER (WHERE (l.unload_weight_kg IS NULL OR l.unload_weight_kg = 0) AND l.status != 'canceled' AND l.total_sales_value > 0), 0) as transit_count
    FROM ops_loadings l
    WHERE l.company_id = p_company_id
      AND l.sales_order_id IN (SELECT id FROM filtered_orders)
  )
  SELECT jsonb_build_object(
    'totalContractValue', total_contract,
    'count', order_count,
    'totalDeliveredValue', total_delivered,
    'pendingReceipt', pending_receipt,
    'totalTransitValue', total_transit_val,
    'transitCount', transit_count
  )
  INTO v_result
  FROM stats;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_sales_order_stats_v4(UUID, TEXT, DATE, DATE, TEXT, TEXT[]) TO authenticated;


-- 2. Purchase Order stats v4 (com suporte a filtros dinâmicos)
CREATE OR REPLACE FUNCTION public.rpc_get_purchase_order_stats_v4(
  p_company_id UUID,
  p_search_term TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_shareholder TEXT DEFAULT NULL,
  p_statuses TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH filtered_purchase_orders AS (
    SELECT id, total_purchase_val_calc, paid_value, balance_value, total_in_transit_val_calc
    FROM public.vw_purchase_orders_enriched
    WHERE company_id = p_company_id
      AND (
        (p_statuses IS NULL OR cardinality(p_statuses) = 0) AND row_status != 'canceled'
        OR (p_statuses IS NOT NULL AND cardinality(p_statuses) > 0 AND row_status = ANY(p_statuses))
      )
      AND (
        p_search_term IS NULL OR p_search_term = ''
        OR number ILIKE '%' || p_search_term || '%'
        OR partner_name ILIKE '%' || p_search_term || '%'
      )
      AND (p_start_date IS NULL OR order_date >= p_start_date)
      AND (p_end_date IS NULL OR order_date <= p_end_date)
      AND (p_shareholder IS NULL OR p_shareholder = '' OR metadata->>'consultantName' = p_shareholder)
  )
  SELECT jsonb_build_object(
    'totalPurchased', COALESCE(SUM(total_purchase_val_calc), 0),
    'totalPaid', COALESCE(SUM(paid_value), 0),
    'totalDebt', COALESCE(SUM(balance_value), 0),
    'totalTransit', COALESCE(SUM(total_in_transit_val_calc), 0)
  )
  INTO v_result
  FROM filtered_purchase_orders;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_purchase_order_stats_v4(UUID, TEXT, DATE, DATE, TEXT, TEXT[]) TO authenticated;
