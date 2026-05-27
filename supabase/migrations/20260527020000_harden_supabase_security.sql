-- ============================================================================
-- Migration: Harden Supabase Security (RLS User Metadata, Security Invoker Views, Logs & Sessions)
-- Date: 2026-05-27
-- ============================================================================

SET search_path = public;

-- 1. Fix RLS on Entradas/Saídas Realizadas (Remove dependence on jwt user_metadata)
DROP POLICY IF EXISTS "Users can view their own company entries" ON public.def_entradas_realizadas;
CREATE POLICY "Users can view their own company entries" ON public.def_entradas_realizadas
  FOR SELECT
  TO authenticated
  USING (company_id = my_company_id());

DROP POLICY IF EXISTS "Users can view their own company entries" ON public.def_saidas_realizadas;
CREATE POLICY "Users can view their own company entries" ON public.def_saidas_realizadas
  FOR SELECT
  TO authenticated
  USING (company_id = my_company_id());


-- 2. Re-create public views WITH (security_invoker = on)
-- Note: Views must be dropped before being recreated with WITH (security_invoker = on) options since options cannot be changed with CREATE OR REPLACE VIEW

DROP VIEW IF EXISTS public.vw_assets_summary CASCADE;
CREATE VIEW public.vw_assets_summary
WITH (security_invoker = on)
AS
 SELECT company_id,
    asset_type,
    count(*) AS total_items,
    sum(acquisition_value) AS total_acquisition_value,
    sum(COALESCE(paid_value, (0)::numeric)) AS total_paid_value,
    sum((acquisition_value - COALESCE(paid_value, (0)::numeric))) AS remaining_to_pay
   FROM public.assets
  WHERE (status = 'active'::text)
  GROUP BY company_id, asset_type;

DROP VIEW IF EXISTS public.vw_purchase_orders_enriched CASCADE;
CREATE VIEW public.vw_purchase_orders_enriched
WITH (security_invoker = on)
AS
 WITH order_loadings AS (
         SELECT ol.purchase_order_id,
            COALESCE(sum(ol.total_purchase_value), (0)::numeric) AS total_purchase_val_calc,
            COALESCE(sum(ol.total_freight_value), (0)::numeric) AS total_freight_val_calc,
            COALESCE(sum(ol.total_sales_value), (0)::numeric) AS total_sales_val_calc,
            COALESCE(sum(ol.weight_kg), (0)::numeric) AS total_kg,
            COALESCE(sum((ol.weight_kg / 60.0)), (0)::numeric) AS total_sc,
            COALESCE(sum(ol.total_purchase_value) FILTER (WHERE (((ol.unload_weight_kg IS NULL) OR (ol.unload_weight_kg = (0)::numeric)) AND (ol.status <> 'canceled'::text))), (0)::numeric) AS total_in_transit_val_calc
           FROM public.ops_loadings ol
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
                   FROM public.financial_entries
                  WHERE ((financial_entries.type = 'payable'::text) AND (financial_entries.status <> 'cancelled'::text))) sub
          WHERE (sub.derived_po_id IS NOT NULL)
          GROUP BY sub.derived_po_id
        ), broker_financial_entries AS (
         SELECT pc.purchase_order_id,
            sum(fe_1.paid_amount) AS broker_paid,
            sum(fe_1.remaining_amount) AS broker_balance
           FROM (public.financial_entries fe_1
             JOIN public.ops_purchase_order_commissions pc ON ((fe_1.origin_id = pc.id)))
          WHERE ((fe_1.origin_type = 'commission'::text) AND (fe_1.status <> 'cancelled'::text))
          GROUP BY pc.purchase_order_id
        ), broker_metadata AS (
         SELECT ops_purchase_order_commissions.purchase_order_id,
            ops_purchase_order_commissions.commission_per_sc,
            ops_purchase_order_commissions.broker_id,
            (ops_purchase_order_commissions.broker_id IS NOT NULL) AS has_broker
           FROM public.ops_purchase_order_commissions
        )
 SELECT po.id,
    po.number,
    po.order_date,
    po.status AS row_status,
    po.partner_id,
    po.partner_name,
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
   FROM (((((public.ops_purchase_orders po
     LEFT JOIN order_loadings l ON ((po.id = l.purchase_order_id)))
     LEFT JOIN order_financial_entries fe ON ((po.id = fe.purchase_order_id)))
     LEFT JOIN broker_metadata bm ON ((po.id = bm.purchase_order_id)))
     LEFT JOIN broker_financial_entries bf ON ((po.id = bf.purchase_order_id)))
     LEFT JOIN public.parceiros_parceiros p ON ((po.partner_id = p.id)));

DROP VIEW IF EXISTS public.v_advances_summaries CASCADE;
CREATE VIEW public.v_advances_summaries
WITH (security_invoker = on)
AS
 SELECT a.company_id,
    a.recipient_id AS partner_id,
    p.name AS partner_name,
    sum(
        CASE
            WHEN (a.recipient_type = ANY (ARRAY['supplier'::text, 'shareholder'::text])) THEN a.remaining_amount
            ELSE (0)::numeric
        END) AS total_given,
    sum(
        CASE
            WHEN (a.recipient_type = 'client'::text) THEN a.remaining_amount
            ELSE (0)::numeric
        END) AS total_taken,
    sum(
        CASE
            WHEN (a.recipient_type = ANY (ARRAY['supplier'::text, 'shareholder'::text])) THEN a.remaining_amount
            ELSE (- a.remaining_amount)
        END) AS net_balance
   FROM (public.advances a
     JOIN public.parceiros_parceiros p ON ((a.recipient_id = p.id)))
  WHERE ((a.status = ANY (ARRAY['open'::text, 'partially_settled'::text])) AND (a.parent_id IS NULL))
  GROUP BY a.company_id, a.recipient_id, p.name;

DROP VIEW IF EXISTS public.vw_logistics_loadings_enriched CASCADE;
CREATE VIEW public.vw_logistics_loadings_enriched
WITH (security_invoker = on)
AS
 SELECT ol.id,
    ol.company_id,
    ol.loading_date,
    ol.vehicle_plate,
    ol.driver_name,
    ol.weight_kg,
    ol.unload_weight_kg,
    ol.total_freight_value,
    ol.status,
    COALESCE(fe.paid_amount, (0)::numeric) AS freight_paid_value,
    COALESCE((fe.total_amount - fe.paid_amount), ol.total_freight_value) AS freight_balance_value,
    (((ol.unload_weight_kg IS NULL) OR (ol.unload_weight_kg = (0)::numeric)) AND (ol.status <> 'canceled'::text)) AS is_in_transit
   FROM (public.ops_loadings ol
     LEFT JOIN public.financial_entries fe ON (((fe.origin_id = ol.id) AND (fe.origin_type = 'freight_loading'::text))));

DROP VIEW IF EXISTS public.vw_financial_entries_enriched CASCADE;
CREATE VIEW public.vw_financial_entries_enriched
WITH (security_invoker = on)
AS
 SELECT id,
    company_id,
    type,
    origin_type,
    origin_id,
    description,
    status,
    total_amount,
    paid_amount,
    remaining_amount,
    due_date,
    created_date,
    COALESCE(( SELECT name
           FROM public.parceiros_parceiros
          WHERE (id = fe.partner_id)), 'Parceiro não identificado'::text) AS partner_name,
        CASE
            WHEN (origin_type = 'purchase_order_loading'::text) THEN 'Compra (Carga)'::text
            WHEN (origin_type = 'purchase_order'::text) THEN 'Compra (Contrato)'::text
            WHEN (origin_type = 'freight_loading'::text) THEN 'Frete (Carga)'::text
            WHEN (origin_type = 'freight'::text) THEN 'Frete (Geral)'::text
            WHEN (origin_type = 'sales_order_loading'::text) THEN 'Venda (Carga)'::text
            WHEN (origin_type = 'commission'::text) THEN 'Comissão'::text
            ELSE origin_type
        END AS category_display
   FROM public.financial_entries fe;

DROP VIEW IF EXISTS public.vw_receivables_enriched CASCADE;
CREATE VIEW public.vw_receivables_enriched
WITH (security_invoker = on)
AS
 SELECT fe.id,
    fe.company_id,
    fe.type,
    fe.origin_type,
    fe.origin_id,
    fe.partner_id,
    fe.total_amount,
    fe.paid_amount,
    fe.remaining_amount,
    fe.discount_amount,
    fe.deductions_amount,
    fe.net_amount,
    fe.status,
    fe.due_date,
    fe.created_date,
    fe.created_at,
    fe.updated_at,
    COALESCE(p.name, left((fe.partner_id)::text, 8), 'Cliente'::text) AS partner_name,
    COALESCE((l.metadata ->> 'salesOrderNumber'::text), so.number) AS sales_order_number,
    COALESCE(l.sales_order_id, so.id) AS sales_order_id,
    (COALESCE(l.unload_weight_kg, agg.total_unload_weight_kg, (0)::numeric))::numeric(15,3) AS loading_weight_kg,
    (round((COALESCE(l.unload_weight_kg, agg.total_unload_weight_kg, (0)::numeric) / 1000.0), 3))::numeric(15,3) AS loading_weight_ton,
    (round((COALESCE(l.unload_weight_kg, agg.total_unload_weight_kg, (0)::numeric) / 60.0), 2))::numeric(15,2) AS loading_weight_sc,
    l.total_sales_value AS loading_sales_value,
        CASE
            WHEN ((fe.origin_type = 'sales_order_loading'::text) AND (COALESCE(l.weight_kg, (0)::numeric) > (0)::numeric)) THEN round((l.total_sales_value / (l.weight_kg / 60.0)), 4)
            WHEN (fe.origin_type = 'sales_order'::text) THEN COALESCE(so.unit_price, (0)::numeric)
            ELSE (0)::numeric
        END AS unit_price_sc
   FROM ((((public.financial_entries fe
     LEFT JOIN public.parceiros_parceiros p ON ((p.id = fe.partner_id)))
     LEFT JOIN public.ops_sales_orders so ON (((so.id = fe.origin_id) AND (fe.origin_type = 'sales_order'::text))))
     LEFT JOIN public.ops_loadings l ON (((l.id = fe.origin_id) AND (fe.origin_type = 'sales_order_loading'::text))))
     LEFT JOIN LATERAL ( SELECT sum(ol.unload_weight_kg) AS total_unload_weight_kg,
            count(*) AS load_count
           FROM public.ops_loadings ol
          WHERE ((ol.sales_order_id = so.id) AND (ol.status <> 'canceled'::text))) agg ON ((fe.origin_type = 'sales_order'::text)))
  WHERE ((fe.type = 'receivable'::text) AND (fe.status <> 'cancelled'::text));

DROP VIEW IF EXISTS public.vw_payables_enriched CASCADE;
CREATE VIEW public.vw_payables_enriched
WITH (security_invoker = on)
AS
 SELECT fe.id,
    fe.company_id,
    fe.type,
    fe.origin_type,
    fe.origin_id,
    fe.partner_id,
    fe.total_amount,
    fe.paid_amount,
    fe.remaining_amount,
    fe.discount_amount,
    fe.deductions_amount,
    fe.net_amount,
    fe.status,
    fe.created_date,
    fe.due_date,
    fe.paid_date,
    fe.created_at,
    fe.updated_at,
    COALESCE(p.name,
        CASE
            WHEN (fe.origin_type = ANY (ARRAY['freight'::text, 'freight_loading'::text])) THEN (l.metadata ->> 'carrierName'::text)
            ELSE NULL::text
        END, left((fe.partner_id)::text, 8), 'Parceiro'::text) AS partner_name,
    COALESCE(po.number, po2.number) AS order_number,
    COALESCE(po.partner_name, po2.partner_name) AS order_partner_name,
    COALESCE(agg.load_count, (0)::bigint) AS load_count,
    COALESCE(agg.total_weight_kg, (0)::numeric) AS total_weight_kg,
    COALESCE(agg.total_weight_ton, 0.000) AS total_weight_ton,
    COALESCE(agg.total_weight_sc, 0.00) AS total_weight_sc,
    COALESCE(agg.total_purchase_value, (0)::numeric) AS agg_purchase_value,
        CASE
            WHEN (agg.total_weight_sc > (0)::numeric) THEN (agg.total_purchase_value / agg.total_weight_sc)
            ELSE (0)::numeric
        END AS unit_price_sc,
    l.vehicle_plate AS freight_vehicle_plate,
    l.driver_name AS freight_driver_name,
    l.weight_kg AS freight_weight_kg,
    (l.weight_kg / (1000)::numeric) AS freight_weight_ton,
    l.total_freight_value AS freight_total_value,
        CASE
            WHEN (l.weight_kg > (0)::numeric) THEN ((l.total_freight_value / l.weight_kg) * (1000)::numeric)
            ELSE (0)::numeric
        END AS freight_price_per_ton
   FROM (((((public.financial_entries fe
     LEFT JOIN public.parceiros_parceiros p ON ((p.id = fe.partner_id)))
     LEFT JOIN public.ops_purchase_orders po ON (((po.id = fe.origin_id) AND (fe.origin_type = 'purchase_order'::text))))
     LEFT JOIN public.ops_loadings l ON (((l.id = fe.origin_id) AND (fe.origin_type = ANY (ARRAY['freight'::text, 'freight_loading'::text, 'purchase_order_loading'::text])))))
     LEFT JOIN public.ops_purchase_orders po2 ON ((po2.id = l.purchase_order_id)))
     LEFT JOIN ( SELECT ops_loadings.purchase_order_id,
            count(*) AS load_count,
            sum(ops_loadings.weight_kg) AS total_weight_kg,
            sum((ops_loadings.weight_kg / (1000)::numeric)) AS total_weight_ton,
            sum((ops_loadings.weight_kg / (60)::numeric)) AS total_weight_sc,
            sum(ops_loadings.total_purchase_value) AS total_purchase_value
           FROM public.ops_loadings
          GROUP BY ops_loadings.purchase_order_id) agg ON ((agg.purchase_order_id = COALESCE(po.id, po2.id))))
  WHERE (fe.type = 'payable'::text);


-- Grants for Views
GRANT SELECT ON public.vw_assets_summary TO anon, authenticated;
GRANT SELECT ON public.vw_purchase_orders_enriched TO anon, authenticated;
GRANT SELECT ON public.v_advances_summaries TO anon, authenticated;
GRANT SELECT ON public.vw_logistics_loadings_enriched TO anon, authenticated;
GRANT SELECT ON public.vw_financial_entries_enriched TO anon, authenticated;
GRANT SELECT ON public.vw_receivables_enriched TO anon, authenticated;
GRANT SELECT ON public.vw_payables_enriched TO anon, authenticated;


-- 3. Harden Auth Log / Session Tables (Audit Logs, Report Access Logs, User Sessions, Login History)

-- A) Login History
DROP POLICY IF EXISTS "Enable select for authenticated login_history" ON public.login_history;
CREATE POLICY "Enable select for authenticated login_history" ON public.login_history
  FOR SELECT
  TO authenticated
  USING (company_id = my_company_id());

DROP POLICY IF EXISTS "Enable insert for authenticated login_history" ON public.login_history;
CREATE POLICY "Enable insert for authenticated login_history" ON public.login_history
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = my_company_id() OR company_id IS NULL);

-- B) User Sessions
DROP POLICY IF EXISTS "Enable modify for authenticated sessions" ON public.user_sessions;
CREATE POLICY "Enable modify for authenticated sessions" ON public.user_sessions
  FOR ALL
  TO authenticated
  USING (company_id = my_company_id())
  WITH CHECK (company_id = my_company_id());

-- C) Report Access Logs
DROP POLICY IF EXISTS "Users can view report logs for their company" ON public.report_access_logs;
CREATE POLICY "Users can view report logs for their company" ON public.report_access_logs
  FOR SELECT
  TO authenticated
  USING (company_id = my_company_id());

DROP POLICY IF EXISTS "Users can insert report logs for their company" ON public.report_access_logs;
CREATE POLICY "Users can insert report logs for their company" ON public.report_access_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = my_company_id());

-- D) Audit Logs
DROP POLICY IF EXISTS "Users can view logs from their own company" ON public.audit_logs;
CREATE POLICY "Users can view logs from their own company" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (company_id = my_company_id());

DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id IS NULL OR company_id = my_company_id());
