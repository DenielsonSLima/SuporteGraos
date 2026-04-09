-- [FIX] Update vw_purchase_orders_enriched to include broker financials correctly (Foundation V2)
-- This migration fixes the previous attempt by using fl.metadata instead of ft.metadata.

DROP VIEW IF EXISTS vw_purchase_orders_enriched;

CREATE OR REPLACE VIEW vw_purchase_orders_enriched AS
 WITH order_loadings AS (
          SELECT ops_loadings.purchase_order_id,
             COALESCE(sum(ops_loadings.total_purchase_value), (0)::numeric) AS total_purchase_val_calc,
             COALESCE(sum(ops_loadings.total_freight_value), (0)::numeric) AS total_freight_val_calc,
             COALESCE(sum(ops_loadings.total_sales_value), (0)::numeric) AS total_sales_val_calc,
             COALESCE(sum(ops_loadings.weight_kg), (0)::numeric) AS total_kg,
             COALESCE(sum((ops_loadings.weight_kg / 60.0)), (0)::numeric) AS total_sc,
             COALESCE(sum(ops_loadings.total_purchase_value) FILTER (
                 WHERE (ops_loadings.unload_weight_kg IS NULL OR ops_loadings.unload_weight_kg = 0) 
                 AND ops_loadings.status NOT IN ('canceled', 'completed', 'finished', 'descarregado')
             ), (0)::numeric) AS total_in_transit_val_calc
            FROM ops_loadings
           WHERE (ops_loadings.status <> 'canceled'::text)
           GROUP BY ops_loadings.purchase_order_id
         ), 
         order_financials AS (
          SELECT fl.purchase_order_id,
             COALESCE(sum(ft.amount), (0)::numeric) AS paid_value,
             COALESCE(sum(COALESCE(((fl.metadata ->> 'discount'::text))::numeric, (0)::numeric)), (0)::numeric) AS total_discounts
            FROM financial_links fl
              JOIN financial_transactions ft ON fl.transaction_id = ft.id
           WHERE fl.purchase_order_id IS NOT NULL
             AND (fl.metadata ->> 'subType' IS NULL OR fl.metadata ->> 'subType' <> 'commission')
           GROUP BY fl.purchase_order_id
         ),
         broker_financials AS (
           SELECT 
             COALESCE(fl.purchase_order_id, pc.purchase_order_id) as purchase_order_id,
             COALESCE(sum(ft.amount), (0)::numeric) AS broker_paid_value
           FROM financial_links fl
           JOIN financial_transactions ft ON fl.transaction_id = ft.id
           LEFT JOIN ops_purchase_order_commissions pc ON fl.commission_id = pc.id
           WHERE (fl.metadata ->> 'subType' = 'commission')
           GROUP BY 1
         ),
         broker_metadata AS (
           SELECT 
             purchase_order_id,
             commission_per_sc,
             broker_id,
             has_broker
           FROM ops_purchase_order_commissions
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
     -- Broker fields
     COALESCE(bm.has_broker, false) as has_broker,
     COALESCE(bm.commission_per_sc, 0) as broker_commission_per_sc,
     COALESCE(bf.broker_paid_value, 0) as broker_paid_value,
     (COALESCE(l.total_sc, 0) * COALESCE(bm.commission_per_sc, 0)) as broker_total_due,
     ((COALESCE(l.total_sc, 0) * COALESCE(bm.commission_per_sc, 0)) - COALESCE(bf.broker_paid_value, 0)) as broker_balance_value,
     po.company_id,
     po.metadata
    FROM ops_purchase_orders po
      LEFT JOIN order_loadings l ON po.id = l.purchase_order_id
      LEFT JOIN order_financials f ON po.id = f.purchase_order_id
      LEFT JOIN broker_metadata bm ON po.id = bm.purchase_order_id
      LEFT JOIN broker_financials bf ON po.id = bf.purchase_order_id;
