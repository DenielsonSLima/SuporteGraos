-- ============================================================================
-- Migration: Adicionar número do pedido de venda na VIEW vw_receivables_enriched
-- Permite exibir "PV-2026-389" na coluna "Nº Venda" e navegar ao pedido
-- ============================================================================

DROP VIEW IF EXISTS public.vw_receivables_enriched;
CREATE VIEW public.vw_receivables_enriched AS
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

  -- ═══════ Pedido de Venda vinculado ═══════
  so.number                                    AS sales_order_number,
  so.id                                        AS sales_order_id,

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

-- JOIN pedido de venda (para obter o número do pedido)
LEFT JOIN public.ops_sales_orders so
  ON so.id = fe.origin_id
  AND fe.origin_type = 'sales_order'

-- JOIN carregamento vinculado à venda
LEFT JOIN public.ops_loadings sl
  ON (sl.sales_order_id = fe.origin_id OR sl.id = fe.origin_id)
  AND fe.origin_type = 'sales_order'

WHERE fe.type = 'receivable';

-- Permissões
GRANT SELECT ON public.vw_receivables_enriched TO authenticated;
