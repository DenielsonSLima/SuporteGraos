-- ============================================================
-- Migration: Corrigir Views — security_invoker + Realtime
-- Data: 2026-02-23
-- Problema:
--   1. vw_payables_enriched, vw_receivables_enriched,
--      vw_sales_orders_enriched NÃO têm security_invoker=true
--      → executam como owner, bypassando RLS
--   2. Não estão na publication supabase_realtime
-- Solução:
--   - Recriar as 3 views com security_invoker = on
--   - Adicionar ao supabase_realtime publication
-- ============================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │ 1. RECRIAR vw_payables_enriched com security_invoker   │
-- └─────────────────────────────────────────────────────────┘
CREATE OR REPLACE VIEW public.vw_payables_enriched
WITH (security_invoker = on)
AS
SELECT
  fe.id,
  fe.company_id,
  fe.type,
  fe.origin_type,
  fe.origin_id,
  fe.partner_id,
  fe.total_amount,
  fe.paid_amount,
  fe.remaining_amount,
  fe.status,
  fe.due_date,
  fe.created_date,
  fe.created_at,
  fe.updated_at,
  COALESCE(p.name, LEFT(fe.partner_id::text, 8), 'Parceiro') AS partner_name,
  po.number AS order_number,
  po.partner_name AS order_partner_name,
  COALESCE(agg.load_count, 0) AS load_count,
  COALESCE(agg.total_weight_kg, 0::numeric) AS total_weight_kg,
  ROUND(COALESCE(agg.total_weight_kg, 0::numeric) / 1000.0, 3) AS total_weight_ton,
  ROUND(COALESCE(agg.total_weight_kg, 0::numeric) / 60.0, 2) AS total_weight_sc,
  COALESCE(agg.total_purchase_value, 0::numeric) AS agg_purchase_value,
  CASE
    WHEN COALESCE(agg.total_weight_kg, 0::numeric) > 0 THEN
      ROUND(COALESCE(agg.total_purchase_value, 0::numeric) / (agg.total_weight_kg / 60.0), 4)
    ELSE 0::numeric
  END AS unit_price_sc,
  fl.vehicle_plate AS freight_vehicle_plate,
  fl.driver_name AS freight_driver_name,
  fl.weight_kg AS freight_weight_kg,
  ROUND(COALESCE(fl.weight_kg, 0::numeric) / 1000.0, 3) AS freight_weight_ton,
  fl.total_freight_value AS freight_total_value,
  CASE
    WHEN COALESCE(fl.weight_kg, 0::numeric) > 0 THEN
      ROUND(fl.total_freight_value / (fl.weight_kg / 1000.0), 4)
    ELSE 0::numeric
  END AS freight_price_per_ton
FROM public.financial_entries fe
LEFT JOIN public.parceiros_parceiros p ON p.id = fe.partner_id
LEFT JOIN public.ops_purchase_orders po
  ON po.id = fe.origin_id AND fe.origin_type = 'purchase_order'
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::integer AS load_count,
    COALESCE(SUM(ol.weight_kg), 0::numeric) AS total_weight_kg,
    COALESCE(SUM(ol.total_purchase_value), 0::numeric) AS total_purchase_value
  FROM public.ops_loadings ol
  WHERE ol.purchase_order_id = fe.origin_id
    AND ol.status <> 'canceled'
    AND fe.origin_type = 'purchase_order'
) agg ON true
LEFT JOIN public.ops_loadings fl
  ON fl.id = fe.origin_id AND fe.origin_type = 'freight'
WHERE fe.type = 'payable';

-- ┌─────────────────────────────────────────────────────────┐
-- │ 2. RECRIAR vw_receivables_enriched com security_invoker│
-- └─────────────────────────────────────────────────────────┘
CREATE OR REPLACE VIEW public.vw_receivables_enriched
WITH (security_invoker = on)
AS
SELECT
  fe.id,
  fe.company_id,
  fe.type,
  fe.origin_type,
  fe.origin_id,
  fe.partner_id,
  fe.total_amount,
  fe.paid_amount,
  fe.remaining_amount,
  fe.status,
  fe.due_date,
  fe.created_date,
  fe.created_at,
  fe.updated_at,
  COALESCE(p.name, LEFT(fe.partner_id::text, 8), 'Cliente') AS partner_name,
  so.number AS sales_order_number,
  so.id AS sales_order_id,
  sl.weight_kg AS loading_weight_kg,
  ROUND(COALESCE(sl.weight_kg, 0::numeric) / 1000.0, 3) AS loading_weight_ton,
  ROUND(COALESCE(sl.weight_kg, 0::numeric) / 60.0, 2) AS loading_weight_sc,
  sl.total_sales_value AS loading_sales_value,
  CASE
    WHEN COALESCE(sl.weight_kg, 0::numeric) > 0 THEN
      ROUND(sl.total_sales_value / (sl.weight_kg / 60.0), 4)
    ELSE 0::numeric
  END AS unit_price_sc
FROM public.financial_entries fe
LEFT JOIN public.parceiros_parceiros p ON p.id = fe.partner_id
LEFT JOIN public.ops_sales_orders so
  ON so.id = fe.origin_id AND fe.origin_type = 'sales_order'
LEFT JOIN public.ops_loadings sl
  ON (sl.sales_order_id = fe.origin_id OR sl.id = fe.origin_id)
  AND fe.origin_type = 'sales_order'
WHERE fe.type = 'receivable';

-- ┌─────────────────────────────────────────────────────────┐
-- │ 3. RECRIAR vw_sales_orders_enriched com security_invoker│
-- └─────────────────────────────────────────────────────────┘
CREATE OR REPLACE VIEW public.vw_sales_orders_enriched
WITH (security_invoker = on)
AS
SELECT
  so.id,
  so.company_id,
  so.legacy_id,
  so.number,
  so.order_date,
  so.status,
  so.customer_id,
  so.customer_name,
  so.total_value,
  so.received_value,
  so.metadata,
  so.raw_payload,
  so.created_at,
  so.updated_at,
  COALESCE(delivered.delivered_qty_sc, 0::numeric) AS delivered_qty_sc,
  COALESCE(delivered.delivered_value, 0::numeric) AS delivered_value,
  COALESCE(delivered.load_count, 0) AS load_count,
  COALESCE(transit.transit_count, 0) AS transit_count,
  COALESCE(transit.transit_value, 0::numeric) AS transit_value
FROM public.ops_sales_orders so
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::integer AS load_count,
    COALESCE(SUM(ol.unload_weight_kg / 60.0), 0::numeric) AS delivered_qty_sc,
    COALESCE(SUM(
      ol.unload_weight_kg / 60.0 *
      COALESCE(
        (ol.metadata->>'salesPrice')::numeric,
        (so.metadata->>'unitPrice')::numeric,
        0::numeric
      )
    ), 0::numeric) AS delivered_value
  FROM public.ops_loadings ol
  WHERE (ol.sales_order_id = so.id OR ol.sales_order_id = so.legacy_id)
    AND COALESCE(ol.unload_weight_kg, 0::numeric) > 0
    AND ol.status <> 'canceled'
) delivered ON true
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::integer AS transit_count,
    COALESCE(SUM(
      ol.weight_kg / 60.0 *
      COALESCE(
        (ol.metadata->>'salesPrice')::numeric,
        (so.metadata->>'unitPrice')::numeric,
        0::numeric
      )
    ), 0::numeric) AS transit_value
  FROM public.ops_loadings ol
  WHERE (ol.sales_order_id = so.id OR ol.sales_order_id = so.legacy_id)
    AND COALESCE(ol.unload_weight_kg, 0::numeric) = 0
    AND ol.status IN ('loaded', 'in_transit', 'redirected', 'waiting_unload')
) transit ON true;

-- ┌─────────────────────────────────────────────────────────┐
-- │ 4. GRANTS para anon e authenticated                    │
-- └─────────────────────────────────────────────────────────┘
GRANT SELECT ON public.vw_payables_enriched TO anon, authenticated;
GRANT SELECT ON public.vw_receivables_enriched TO anon, authenticated;
GRANT SELECT ON public.vw_sales_orders_enriched TO anon, authenticated;

-- ┌─────────────────────────────────────────────────────────┐
-- │ 5. REALTIME                                            │
-- └─────────────────────────────────────────────────────────┘
-- Views NÃO podem ser adicionadas a publications no PostgreSQL.
-- O Realtime funciona nas tabelas base (financial_entries,
-- ops_sales_orders, ops_loadings, etc.) que já estão no
-- supabase_realtime. As views herdam a atualização via
-- invalidação de cache no frontend (React Query).
