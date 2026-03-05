-- ============================================================================
-- Migration: Financial Enriched Views
-- ============================================================================
-- VIEWs que entregam dados enriquecidos para Contas a Pagar e Contas a Receber
-- O frontend NÃO faz cálculos — apenas renderiza o que o SQL entrega.
-- ============================================================================

-- ============================================================================
-- VIEW: vw_payables_enriched
-- Contas a Pagar com dados de parceiro, pedido e carregamentos pré-calculados
-- ============================================================================
CREATE OR REPLACE VIEW public.vw_payables_enriched AS
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

  -- ═══════ Parceiro ═══════
  COALESCE(p.name, LEFT(fe.partner_id::text, 8), 'Parceiro') AS partner_name,

  -- ═══════ Pedido de Compra (quando origin_type = 'purchase_order') ═══════
  po.number                AS order_number,
  po.partner_name          AS order_partner_name,

  -- ═══════ Agregações de Carregamentos (purchase_order) ═══════
  COALESCE(agg.load_count, 0)::int             AS load_count,
  COALESCE(agg.total_weight_kg, 0)             AS total_weight_kg,
  ROUND(COALESCE(agg.total_weight_kg, 0) / 1000.0, 3)   AS total_weight_ton,
  ROUND(COALESCE(agg.total_weight_kg, 0) / 60.0, 2)     AS total_weight_sc,
  COALESCE(agg.total_purchase_value, 0)        AS agg_purchase_value,
  CASE
    WHEN COALESCE(agg.total_weight_kg, 0) > 0
    THEN ROUND(COALESCE(agg.total_purchase_value, 0) / (agg.total_weight_kg / 60.0), 4)
    ELSE 0
  END                                          AS unit_price_sc,

  -- ═══════ Dados de Frete (quando origin_type = 'freight') ═══════
  fl.vehicle_plate         AS freight_vehicle_plate,
  fl.driver_name           AS freight_driver_name,
  fl.weight_kg             AS freight_weight_kg,
  ROUND(COALESCE(fl.weight_kg, 0) / 1000.0, 3)          AS freight_weight_ton,
  fl.total_freight_value   AS freight_total_value,
  CASE
    WHEN COALESCE(fl.weight_kg, 0) > 0
    THEN ROUND(fl.total_freight_value / (fl.weight_kg / 1000.0), 4)
    ELSE 0
  END                                          AS freight_price_per_ton

FROM public.financial_entries fe

-- JOIN parceiro
LEFT JOIN public.parceiros_parceiros p
  ON p.id = fe.partner_id

-- JOIN pedido de compra (quando origin_type = 'purchase_order')
LEFT JOIN public.ops_purchase_orders po
  ON po.id = fe.origin_id
  AND fe.origin_type = 'purchase_order'

-- Agregação dos carregamentos do pedido
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int                          AS load_count,
    COALESCE(SUM(ol.weight_kg), 0)         AS total_weight_kg,
    COALESCE(SUM(ol.total_purchase_value), 0) AS total_purchase_value
  FROM public.ops_loadings ol
  WHERE ol.purchase_order_id = fe.origin_id
    AND ol.status != 'canceled'
    AND fe.origin_type = 'purchase_order'
) agg ON true

-- JOIN carregamento individual (quando origin_type = 'freight')
LEFT JOIN public.ops_loadings fl
  ON fl.id = fe.origin_id
  AND fe.origin_type = 'freight'

WHERE fe.type = 'payable';

-- ============================================================================
-- VIEW: vw_receivables_enriched
-- Contas a Receber com dados de parceiro e carregamentos pré-calculados
-- ============================================================================
CREATE OR REPLACE VIEW public.vw_receivables_enriched AS
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

  -- ═══════ Parceiro ═══════
  COALESCE(p.name, LEFT(fe.partner_id::text, 8), 'Cliente') AS partner_name,

  -- ═══════ Carregamento vinculado ═══════
  sl.weight_kg                                 AS loading_weight_kg,
  ROUND(COALESCE(sl.weight_kg, 0) / 1000.0, 3)            AS loading_weight_ton,
  ROUND(COALESCE(sl.weight_kg, 0) / 60.0, 2)              AS loading_weight_sc,
  sl.total_sales_value                         AS loading_sales_value,
  CASE
    WHEN COALESCE(sl.weight_kg, 0) > 0
    THEN ROUND(sl.total_sales_value / (sl.weight_kg / 60.0), 4)
    ELSE 0
  END                                          AS unit_price_sc

FROM public.financial_entries fe

-- JOIN parceiro
LEFT JOIN public.parceiros_parceiros p
  ON p.id = fe.partner_id

-- JOIN carregamento vinculado à venda
LEFT JOIN public.ops_loadings sl
  ON (sl.sales_order_id = fe.origin_id OR sl.id = fe.origin_id)
  AND fe.origin_type = 'sales_order'

WHERE fe.type = 'receivable';

-- ============================================================================
-- Permissões de leitura via RLS (herda da tabela base via security_invoker)
-- ============================================================================
-- No PostgreSQL 15+, VIEWs por padrão usam SECURITY INVOKER,
-- então a RLS de financial_entries se aplica automaticamente.
-- Para versões anteriores, podemos conceder acesso seguro:
GRANT SELECT ON public.vw_payables_enriched TO authenticated;
GRANT SELECT ON public.vw_receivables_enriched TO authenticated;

-- ============================================================================
-- EOF
-- ============================================================================
