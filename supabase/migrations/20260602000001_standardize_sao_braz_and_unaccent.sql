-- Migration: Standardize São Braz Names and Create Unaccent Views
-- Target schema: public

-- 1. Ensure unaccent extension is loaded
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Drop existing views to allow changes in columns
DROP VIEW IF EXISTS public.vw_purchase_orders_enriched;
DROP VIEW IF EXISTS public.vw_sales_orders_enriched;

-- 3. Standardize partner names in parceiros_parceiros (trim whitespace, remove accents, uppercase)
UPDATE public.parceiros_parceiros
SET 
  name = 'SAO BRAZ S/A INDUSTRIA E COMERCIO DE ALIMENTOS',
  nickname = CASE 
    WHEN id = '2f647ca6-be82-4770-b981-31df3ea1271b' THEN 'CAFE SAO BRAZ - CAMPINA GRANDE'
    WHEN id = '9d24a374-5761-4238-b9b4-c029c8d630bc' THEN 'CAFE SAO BRAZ - BAHIA'
    ELSE nickname
  END
WHERE id IN ('2f647ca6-be82-4770-b981-31df3ea1271b', '9d24a374-5761-4238-b9b4-c029c8d630bc');

-- 4. Standardize customer names in sales orders
UPDATE public.ops_sales_orders
SET 
  customer_name = 'SAO BRAZ S/A INDUSTRIA E COMERCIO DE ALIMENTOS',
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('customerName', 'SAO BRAZ S/A INDUSTRIA E COMERCIO DE ALIMENTOS')
WHERE customer_id IN ('2f647ca6-be82-4770-b981-31df3ea1271b', '9d24a374-5761-4238-b9b4-c029c8d630bc');

-- 5. Create View for Accent-Insensitive Partner Search
CREATE OR REPLACE VIEW public.vw_parceiros_unaccented AS
SELECT *,
  unaccent(name) AS name_unaccented,
  unaccent(trade_name) AS trade_name_unaccented,
  unaccent(nickname) AS nickname_unaccented
FROM public.parceiros_parceiros;

-- 6. Recreate Purchase Orders View with partner_name_unaccented
CREATE OR REPLACE VIEW public.vw_purchase_orders_enriched AS
 WITH order_loadings AS (
         SELECT ol.purchase_order_id,
            COALESCE(sum(ol.total_purchase_value), (0)::numeric) AS total_purchase_val_calc,
            COALESCE(sum(ol.total_freight_value), (0)::numeric) AS total_freight_val_calc,
            COALESCE(sum(ol.total_sales_value), (0)::numeric) AS total_sales_val_calc,
            COALESCE(sum(ol.weight_kg), (0)::numeric) AS total_kg,
            COALESCE(sum((ol.weight_kg / 60.0)), (0)::numeric) AS total_sc,
            COALESCE(sum(ol.total_purchase_value) FILTER (WHERE (((ol.unload_weight_kg IS NULL) OR (ol.unload_weight_kg = (0)::numeric)) AND (ol.status <> 'canceled'::text))), (0)::numeric) AS total_in_transit_val_calc
           FROM ops_loadings ol
          WHERE (ol.status <> 'canceled'::text)
          GROUP BY ol.purchase_order_id
        ), order_financial_entries AS (
         SELECT sub.derived_po_id AS purchase_order_id,
            sum(sub.paid_amount) AS total_paid,
            sum(sub.remaining_amount) AS total_balance,
            sum(sub.discount_amount) AS total_discounts
           FROM ( SELECT financial_entries.remaining_amount,
                    financial_entries.paid_amount,
                    financial_entries.discount_amount,
                        CASE
                            WHEN (financial_entries.origin_type = 'purchase_order'::text) THEN financial_entries.origin_id
                            WHEN (financial_entries.origin_type = 'purchase_order_loading'::text) THEN ( SELECT ops_loadings.purchase_order_id
                               FROM ops_loadings
                              WHERE (ops_loadings.id = financial_entries.origin_id))
                            ELSE NULL::uuid
                        END AS derived_po_id
                   FROM financial_entries
                  WHERE ((financial_entries.type = 'payable'::text) AND (financial_entries.status <> 'cancelled'::text))) sub
          WHERE (sub.derived_po_id IS NOT NULL)
          GROUP BY sub.derived_po_id
        ), broker_financial_entries AS (
         SELECT pc.purchase_order_id,
            sum(fe_1.paid_amount) AS broker_paid,
            sum(fe_1.remaining_amount) AS broker_balance
           FROM (financial_entries fe_1
             JOIN ops_purchase_order_commissions pc ON ((fe_1.origin_id = pc.id)))
          WHERE ((fe_1.origin_type = 'commission'::text) AND (fe_1.status <> 'cancelled'::text))
          GROUP BY pc.purchase_order_id
        ), broker_metadata AS (
         SELECT ops_purchase_order_commissions.purchase_order_id,
            ops_purchase_order_commissions.commission_per_sc,
            ops_purchase_order_commissions.broker_id,
            (ops_purchase_order_commissions.broker_id IS NOT NULL) AS has_broker
           FROM ops_purchase_order_commissions
        )
 SELECT po.id,
    po.number,
    po.order_date,
    po.status AS row_status,
    po.partner_id,
    po.partner_name,
    unaccent(po.partner_name) AS partner_name_unaccented,
    p.nickname AS partner_nickname,
    po.total_value,
    COALESCE(fe.total_paid, (0)::numeric) AS paid_value,
    COALESCE(fe.total_discounts, (0)::numeric) AS discount_value,
    COALESCE(l.total_purchase_val_calc, (0)::numeric) AS total_purchase_val_calc,
    COALESCE(l.total_freight_val_calc, (0)::numeric) AS total_freight_val_calc,
    COALESCE(l.total_sales_val_calc, (0)::numeric) AS total_sales_val_calc,
    COALESCE(l.total_kg, (0)::numeric) AS total_kg,
    COALESCE(l.total_sc, (0)::numeric) AS total_sc,
    COALESCE(l.total_in_transit_val_calc, (0)::numeric) AS total_in_transit_val_calc,
    COALESCE(fe.total_balance, (0)::numeric) AS balance_value,
    COALESCE(bm.has_broker, false) AS has_broker,
    COALESCE(bm.commission_per_sc, (0)::numeric) AS broker_commission_per_sc,
    COALESCE(bf.broker_paid, (0)::numeric) AS broker_paid_value,
    (COALESCE(l.total_sc, (0)::numeric) * COALESCE(bm.commission_per_sc, (0)::numeric)) AS broker_total_due,
    COALESCE(bf.broker_balance, (0)::numeric) AS broker_balance_value,
    po.company_id,
    po.created_at,
    po.metadata
   FROM (((((ops_purchase_orders po
     LEFT JOIN order_loadings l ON ((po.id = l.purchase_order_id)))
     LEFT JOIN order_financial_entries fe ON ((po.id = fe.purchase_order_id)))
     LEFT JOIN broker_metadata bm ON ((po.id = bm.purchase_order_id)))
     LEFT JOIN broker_financial_entries bf ON ((po.id = bf.purchase_order_id)))
     LEFT JOIN parceiros_parceiros p ON ((po.partner_id = p.id)));

-- 7. Recreate Sales Orders View with customer_name_unaccented
CREATE OR REPLACE VIEW public.vw_sales_orders_enriched AS
 SELECT so.id,
    so.company_id,
    so.legacy_id,
    so.number,
    so.order_date,
    so.status,
    so.customer_id,
    so.customer_name,
    unaccent(so.customer_name) AS customer_name_unaccented,
    p.nickname AS customer_nickname,
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
   FROM ((((ops_sales_orders so
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
     LEFT JOIN parceiros_parceiros p ON ((so.customer_id = p.id)));
