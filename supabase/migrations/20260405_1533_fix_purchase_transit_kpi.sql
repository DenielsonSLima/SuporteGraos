-- [FIX] Purchase Order Transit KPI
-- This migration updates the vw_purchase_orders_enriched view to include a correct calculation 
-- for total_in_transit_val_calc, replacing previous incorrect logic that used freight values.

DROP VIEW IF EXISTS vw_purchase_orders_enriched;

CREATE OR REPLACE VIEW vw_purchase_orders_enriched AS
 WITH order_loadings AS (
         SELECT ops_loadings.purchase_order_id,
            COALESCE(sum(ops_loadings.total_purchase_value), (0)::numeric) AS total_purchase_val_calc,
            COALESCE(sum(ops_loadings.total_freight_value), (0)::numeric) AS total_freight_val_calc,
            COALESCE(sum(ops_loadings.total_sales_value), (0)::numeric) AS total_sales_val_calc,
            COALESCE(sum(ops_loadings.weight_kg), (0)::numeric) AS total_kg,
            COALESCE(sum((ops_loadings.weight_kg / 60.0)), (0)::numeric) AS total_sc,
            -- NEW FIELD: Actual merchandise value in transit (not unloaded, not canceled, not finished)
            COALESCE(sum(ops_loadings.total_purchase_value) FILTER (
                WHERE (ops_loadings.unload_weight_kg IS NULL OR ops_loadings.unload_weight_kg = 0) 
                AND ops_loadings.status NOT IN ('canceled', 'completed', 'finished', 'descarregado')
            ), (0)::numeric) AS total_in_transit_val_calc
           FROM ops_loadings
          WHERE (ops_loadings.status <> 'canceled'::text)
          GROUP BY ops_loadings.purchase_order_id
        ), order_financials AS (
         SELECT fl.purchase_order_id,
            COALESCE(sum(ft.amount), (0)::numeric) AS paid_value,
            COALESCE(sum(COALESCE(((fl.metadata ->> 'discount'::text))::numeric, (0)::numeric)), (0)::numeric) AS total_discounts
           FROM (financial_links fl
             JOIN financial_transactions ft ON ((fl.transaction_id = ft.id)))
          WHERE (fl.purchase_order_id IS NOT NULL)
          GROUP BY fl.purchase_order_id
        )
 SELECT po.id,
    po.number,
    po.order_date,
    po.status AS row_status,
    po.partner_id,
    po.partner_name,
    po.total_value,
    COALESCE(f.paid_value, (0)::numeric) AS paid_value,
    COALESCE(f.total_discounts, (0)::numeric) AS discount_value,
    COALESCE(l.total_purchase_val_calc, (0)::numeric) AS total_purchase_val_calc,
    COALESCE(l.total_freight_val_calc, (0)::numeric) AS total_freight_val_calc,
    COALESCE(l.total_sales_val_calc, (0)::numeric) AS total_sales_val_calc,
    COALESCE(l.total_kg, (0)::numeric) AS total_kg,
    COALESCE(l.total_sc, (0)::numeric) AS total_sc,
    COALESCE(l.total_in_transit_val_calc, (0)::numeric) AS total_in_transit_val_calc,
    GREATEST((0)::numeric, (COALESCE(l.total_purchase_val_calc, (0)::numeric) - COALESCE(f.paid_value, (0)::numeric))) AS balance_value,
    po.company_id,
    po.metadata
   FROM ((ops_purchase_orders po
     LEFT JOIN order_loadings l ON ((po.id = l.purchase_order_id)))
     LEFT JOIN order_financials f ON ((po.id = f.purchase_order_id)));
