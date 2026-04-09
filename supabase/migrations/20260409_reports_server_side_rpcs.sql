-- ============================================================================
-- 📊 MIGRATION: Server-Side Report RPCs (Egress Optimization)
-- Data: 2026-04-09
-- Objetivo: Prover dados filtrados e agregados para relatórios comerciais.
-- ============================================================================

-- 1. RPC: Histórico de Vendas
CREATE OR REPLACE FUNCTION public.rpc_report_sales_history(
  p_company_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  date DATE,
  number TEXT,
  customer_name TEXT,
  product_name TEXT,
  quantity NUMERIC(15,2),
  delivered_qty_sc NUMERIC(15,2),
  total_value NUMERIC(15,2),
  realized_value NUMERIC(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    so.order_date as date,
    so.number,
    so.customer_name,
    COALESCE(so.metadata->>'productName', 'Grãos') as product_name,
    COALESCE((so.metadata->>'quantity')::numeric, 0) as quantity,
    so.delivered_qty_sc,
    so.total_value,
    so.delivered_value as realized_value
  FROM public.vw_sales_orders_enriched so
  WHERE so.company_id = p_company_id
    AND (p_start_date IS NULL OR so.order_date >= p_start_date)
    AND (p_end_date IS NULL OR so.order_date <= p_end_date)
  ORDER BY so.order_date DESC, so.created_at DESC;
END;
$$;

-- 2. RPC: Histórico de Compras
CREATE OR REPLACE FUNCTION public.rpc_report_purchases_history(
  p_company_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_partner_id UUID DEFAULT NULL,
  p_product_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  date DATE,
  number TEXT,
  partner_name TEXT,
  product_name TEXT,
  volume_sc NUMERIC(15,2),
  total_value NUMERIC(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    po.order_date as date,
    po.number,
    po.partner_name,
    COALESCE(po.metadata->>'productName', 'Grãos') as product_name,
    po.total_sc as volume_sc,
    po.total_purchase_val_calc as total_value
  FROM public.vw_purchase_orders_enriched po
  WHERE po.company_id = p_company_id
    AND (p_start_date IS NULL OR po.order_date >= p_start_date)
    AND (p_end_date IS NULL OR po.order_date <= p_end_date)
    AND (p_partner_id IS NULL OR po.partner_id = p_partner_id)
    AND (p_product_name IS NULL OR (po.metadata->>'productName') ILIKE '%' || p_product_name || '%')
  ORDER BY po.order_date DESC, po.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_report_sales_history(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_report_purchases_history(UUID, DATE, DATE, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.rpc_report_sales_history IS 'Retorna histórico de vendas filtrado e agregado para relatórios.';
COMMENT ON FUNCTION public.rpc_report_purchases_history IS 'Retorna histórico de compras filtrado e agregado para relatórios.';
