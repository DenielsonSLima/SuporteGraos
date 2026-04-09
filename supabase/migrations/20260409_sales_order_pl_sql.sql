-- ============================================================================
-- 📊 MIGRATION: SQL-First P&L for Sales Orders
-- Data: 2026-04-09
-- Objetivo: Mover cálculos de Lucro Bruto e Custo Direto para a Database View.
-- ============================================================================

CREATE OR REPLACE VIEW public.vw_sales_orders_enriched AS
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
  
  -- ═══════ Valor Recebido (LIVE via financial_entries) ═══════
  COALESCE(fin.total_paid, 0)                     AS received_value,
  
  so.metadata,
  so.raw_payload,
  so.created_at,
  so.updated_at,

  -- ═══════ Dados de entrega (Cargas descarregadas) ═══════
  COALESCE(delivered.delivered_qty_sc, 0)         AS delivered_qty_sc,
  COALESCE(delivered.delivered_value, 0)          AS delivered_value,
  COALESCE(delivered.load_count, 0)::int          AS load_count,
  
  -- 🟢 NOVOS CAMPOS PARA P&L (SQL-First) 🟢
  COALESCE(delivered.total_grain_cost, 0)         AS total_grain_cost,
  COALESCE(delivered.total_freight_cost, 0)       AS total_freight_cost,
  COALESCE(delivered.total_direct_investment, 0)  AS total_direct_investment,
  COALESCE(delivered.delivered_value - delivered.total_direct_investment, 0) AS gross_profit,
  CASE 
    WHEN COALESCE(delivered.delivered_value, 0) > 0 
    THEN ((COALESCE(delivered.delivered_value, 0) - COALESCE(delivered.total_direct_investment, 0)) / delivered.delivered_value) * 100
    ELSE 0 
  END AS margin_percent,

  -- ═══════ Mercadoria em trânsito (Sem descarregamento) ═══════
  COALESCE(transit.transit_count, 0)::int         AS transit_count,
  COALESCE(transit.transit_value, 0)              AS transit_value

FROM public.ops_sales_orders so

-- 1. Agregação financeira vinculada ao pedido
LEFT JOIN LATERAL (
  SELECT 
    SUM(fe.paid_amount) AS total_paid
  FROM public.financial_entries fe
  WHERE (fe.origin_id = so.id OR fe.origin_id = so.legacy_id)
    AND fe.origin_type = 'sales_order'
) fin ON true

-- 2. Cargas entregues (unload_weight_kg > 0) + CÁLCULOS DE CUSTO
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int AS load_count,
    COALESCE(SUM(ol.unload_weight_kg / 60.0), 0) AS delivered_qty_sc,
    
    -- Receita Realizada (Baseada no preço de venda do carregamento ou do pedido)
    COALESCE(SUM(
      (ol.unload_weight_kg / 60.0) *
      COALESCE(
        (ol.metadata->>'salesPrice')::numeric,
        (so.metadata->>'unitPrice')::numeric,
        0
      )
    ), 0) AS delivered_value,

    -- Custo do Grão
    COALESCE(SUM(
      (ol.unload_weight_kg / 60.0) *
      COALESCE(
        (ol.metadata->>'purchasePricePerSc')::numeric,
        0
      )
    ), 0) AS total_grain_cost,

    -- Custo do Frete (Peso em Tonelada)
    COALESCE(SUM(
      (ol.unload_weight_kg / 1000.0) *
      COALESCE(
        (ol.metadata->>'freightPricePerTon')::numeric,
        0
      )
    ), 0) AS total_freight_cost,

    -- Investimento Direto Consolidado
    COALESCE(SUM(
      ((ol.unload_weight_kg / 60.0) * COALESCE((ol.metadata->>'purchasePricePerSc')::numeric, 0)) +
      ((ol.unload_weight_kg / 1000.0) * COALESCE((ol.metadata->>'freightPricePerTon')::numeric, 0))
    ), 0) AS total_direct_investment

  FROM public.ops_loadings ol
  WHERE (ol.sales_order_id = so.id OR ol.sales_order_id = so.legacy_id)
    AND COALESCE(ol.unload_weight_kg, 0) > 0
    AND ol.status NOT IN ('canceled')
) delivered ON true

-- 3. Cargas em trânsito
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int AS transit_count,
    COALESCE(SUM(
      (ol.weight_kg / 60.0) *
      COALESCE(
        (ol.metadata->>'salesPrice')::numeric,
        (so.metadata->>'unitPrice')::numeric,
        0
      )
    ), 0) AS transit_value
  FROM public.ops_loadings ol
  WHERE (ol.sales_order_id = so.id OR ol.sales_order_id = so.legacy_id)
    AND COALESCE(ol.unload_weight_kg, 0) = 0
    AND ol.status IN ('loaded', 'in_transit', 'redirected', 'waiting_unload')
) transit ON true;

COMMENT ON VIEW public.vw_sales_orders_enriched IS 'View consolidada de pedidos de venda com KPIs de performance e lucratividade calculados no banco.';
