-- ============================================================================
-- 📊 MIGRATION: Fix Sales Order Discount and Financial Status Sincronization
-- Data: 2026-05-23
-- Objetivo: Garantir que descontos liquidem títulos corretamente e apareçam na view enriquecida.
-- ============================================================================

-- 1. Atualizar a lógica de status no banco para considerar discount_amount
CREATE OR REPLACE FUNCTION public.fn_sync_financial_entry_status()
RETURNS trigger AS $$
BEGIN
  -- Re-calcular o status baseado nos valores atuais da linha
  NEW.status := CASE
    WHEN NEW.status IN ('cancelled', 'reversed') THEN NEW.status
    WHEN (NEW.paid_amount + COALESCE(NEW.discount_amount, 0)) >= NEW.total_amount AND NEW.total_amount > 0 THEN 'paid'::public.financial_entry_status
    WHEN NEW.paid_amount > 0 OR COALESCE(NEW.discount_amount, 0) > 0 THEN 'partially_paid'::public.financial_entry_status
    ELSE 'pending'::public.financial_entry_status
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Garantir que o gatilho rode em qualquer UPDATE ou INSERT (sem restrição de colunas)
DROP TRIGGER IF EXISTS trg_sync_financial_entry_status ON public.financial_entries;
CREATE TRIGGER trg_sync_financial_entry_status
BEFORE INSERT OR UPDATE ON public.financial_entries
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_financial_entry_status();

-- 3. Atualizar retroativamente os status inconsistentes no banco
UPDATE public.financial_entries
SET status = 'paid'::public.financial_entry_status,
    updated_at = now()
WHERE status = 'partially_paid'::public.financial_entry_status
  AND (paid_amount + COALESCE(discount_amount, 0)) >= total_amount
  AND total_amount > 0;

-- 4. Refatorar a view vw_sales_orders_enriched para trazer discount_value e balance_value calculados live
DROP VIEW IF EXISTS public.vw_sales_orders_enriched CASCADE;

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
  COALESCE(fin.total_paid, 0)::numeric(15,2)      AS received_value,
  COALESCE(fin.total_discount, 0)::numeric(15,2)  AS discount_value,
  GREATEST(0, COALESCE(delivered.delivered_value, 0) - COALESCE(fin.total_paid, 0) - COALESCE(fin.total_discount, 0))::numeric(15,2) AS balance_value,
  
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
    SUM(fe.paid_amount) AS total_paid,
    SUM(fe.discount_amount) AS total_discount
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

-- Habilitar RLS de View
ALTER VIEW public.vw_sales_orders_enriched SET (security_invoker = on);

GRANT SELECT ON public.vw_sales_orders_enriched TO anon, authenticated;

COMMENT ON VIEW public.vw_sales_orders_enriched IS 'View enriquecida corrigida para computar valores recebidos e abatimentos (descontos) via LATERAL JOIN e expor saldos live.';
