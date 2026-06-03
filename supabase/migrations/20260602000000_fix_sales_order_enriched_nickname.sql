-- ============================================================================
-- Migration: Add customer_nickname to vw_sales_orders_enriched View
-- Date: 2026-06-02
-- ============================================================================

SET search_path = public;

DROP VIEW IF EXISTS public.vw_sales_orders_enriched CASCADE;

CREATE OR REPLACE VIEW public.vw_sales_orders_enriched AS
 SELECT so.id,
    so.company_id,
    so.legacy_id,
    so.number,
    so.order_date,
    so.status,
    so.customer_id,
    so.customer_name,
    p.nickname AS customer_nickname, -- selecionando o apelido do parceiro de forma canônica
    so.consultant_name,
    so.total_value,
    (COALESCE(fin.total_paid, (0)::numeric))::numeric(15,2) AS received_value,
    (COALESCE(fin.total_discount, (0)::numeric))::numeric(15,2) AS discount_value,
    (GREATEST((0)::numeric, ((COALESCE(delivered.delivered_value, (0)::numeric) - COALESCE(fin.total_paid, (0)::numeric)) - COALESCE(fin.total_discount, (0)::numeric))))::numeric(15,2) AS balance_value,
    so.metadata,
    so.raw_payload,
    so.created_at,
    so.updated_at,
    COALESCE(delivered.delivered_qty_sc, (0)::numeric) AS delivered_qty_sc,
    COALESCE(delivered.delivered_value, (0)::numeric) AS delivered_value,
    COALESCE(delivered.load_count, 0) AS load_count,
    COALESCE(delivered.total_grain_cost, (0)::numeric) AS total_grain_cost,
    COALESCE(delivered.total_freight_cost, (0)::numeric) AS total_freight_cost,
    COALESCE(delivered.total_direct_investment, (0)::numeric) AS total_direct_investment,
    COALESCE((delivered.delivered_value - delivered.total_direct_investment), (0)::numeric) AS gross_profit,
        CASE
            WHEN (COALESCE(delivered.delivered_value, (0)::numeric) > (0)::numeric) THEN (((COALESCE(delivered.delivered_value, (0)::numeric) - COALESCE(delivered.total_direct_investment, (0)::numeric)) / delivered.delivered_value) * (100)::numeric)
            ELSE (0)::numeric
        END AS margin_percent,
    COALESCE(transit.transit_count, 0) AS transit_count,
    COALESCE(transit.transit_value, (0)::numeric) AS transit_value
   FROM (((((ops_sales_orders so
     LEFT JOIN LATERAL ( SELECT sum(fe.paid_amount) AS total_paid,
            sum(fe.discount_amount) AS total_discount
           FROM financial_entries fe
          WHERE (((fe.origin_id = so.id) OR (fe.origin_id = so.legacy_id)) AND (fe.origin_type = 'sales_order'::text))) fin ON (true))
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS load_count,
            COALESCE(sum((ol.unload_weight_kg / 60.0)), (0)::numeric) AS delivered_qty_sc,
            COALESCE(sum(((ol.unload_weight_kg / 60.0) * COALESCE(((ol.metadata ->> 'salesPrice'::text))::numeric, ((so.metadata ->> 'unitPrice'::text))::numeric, (0)::numeric))), (0)::numeric) AS delivered_value,
            COALESCE(sum(((ol.unload_weight_kg / 60.0) * COALESCE(((ol.metadata ->> 'purchasePricePerSc'::text))::numeric, (0)::numeric))), (0)::numeric) AS total_grain_cost,
            COALESCE(sum(((ol.unload_weight_kg / 1000.0) * COALESCE(((ol.metadata ->> 'freightPricePerTon'::text))::numeric, (0)::numeric))), (0)::numeric) AS total_freight_cost,
            COALESCE(sum((((ol.unload_weight_kg / 60.0) * COALESCE(((ol.metadata ->> 'purchasePricePerSc'::text))::numeric, (0)::numeric)) + ((ol.unload_weight_kg / 1000.0) * COALESCE(((ol.metadata ->> 'freightPricePerTon'::text))::numeric, (0)::numeric)))), (0)::numeric) AS total_direct_investment
           FROM ops_loadings ol
          WHERE (((ol.sales_order_id = so.id) OR (ol.sales_order_id = so.legacy_id)) AND (COALESCE(ol.unload_weight_kg, (0)::numeric) > (0)::numeric) AND (ol.status <> 'canceled'::text))) delivered ON (true))
     LEFT JOIN LATERAL ( SELECT (count(*))::integer AS transit_count,
            COALESCE(sum(((ol.weight_kg / 60.0) * COALESCE(((ol.metadata ->> 'salesPrice'::text))::numeric, ((so.metadata ->> 'unitPrice'::text))::numeric, (0)::numeric))), (0)::numeric) AS transit_value
           FROM ops_loadings ol
          WHERE (((ol.sales_order_id = so.id) OR (ol.sales_order_id = so.legacy_id)) AND (COALESCE(ol.unload_weight_kg, (0)::numeric) = (0)::numeric) AND (ol.status = ANY (ARRAY['loaded'::text, 'in_transit'::text, 'redirected'::text, 'waiting_unload'::text])))) transit ON (true))
     LEFT JOIN public.parceiros_parceiros p ON ((so.customer_id = p.id))));

-- Re-habilitar RLS de View
ALTER VIEW public.vw_sales_orders_enriched SET (security_invoker = on);

-- Grants
GRANT SELECT ON public.vw_sales_orders_enriched TO anon, authenticated;

COMMENT ON VIEW public.vw_sales_orders_enriched IS 'View enriquecida corrigida para computar valores recebidos e abatimentos (descontos) via LATERAL JOIN, expor saldos live e incluir o customer_nickname.';
