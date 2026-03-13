-- ============================================================================
-- FIX: Sincronização SQL-First de KPIs de Venda e Recebimentos
-- Data: 2026-03-08
-- ============================================================================

-- 1) GARANTIR TRIGGER EM financial_transactions PARA ATUALIZAR financial_entries
-- Este gatilho garante que o paid_amount de uma entry seja sempre a soma das suas transações.
CREATE OR REPLACE FUNCTION public.fn_update_entry_paid_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  v_entry_id := COALESCE(NEW.entry_id, OLD.entry_id);
  
  IF v_entry_id IS NOT NULL THEN
    UPDATE public.financial_entries SET
      paid_amount = COALESCE((
        SELECT SUM(CASE WHEN type = 'credit' THEN amount WHEN type = 'debit' THEN -amount ELSE amount END)
        FROM public.financial_transactions
        WHERE entry_id = v_entry_id
      ), 0),
      status = CASE
        WHEN COALESCE((
          SELECT SUM(CASE WHEN type = 'credit' THEN amount WHEN type = 'debit' THEN -amount ELSE amount END)
          FROM public.financial_transactions
          WHERE entry_id = v_entry_id
        ), 0) >= total_amount THEN 'paid'::financial_entry_status
        WHEN COALESCE((
          SELECT SUM(CASE WHEN type = 'credit' THEN amount WHEN type = 'debit' THEN -amount ELSE amount END)
          FROM public.financial_transactions
          WHERE entry_id = v_entry_id
        ), 0) > 0 THEN 'partially_paid'::financial_entry_status
        ELSE 'pending'::financial_entry_status
      END,
      updated_at = now()
    WHERE id = v_entry_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_entry_paid_amount ON public.financial_transactions;
CREATE TRIGGER trg_update_entry_paid_amount
AFTER INSERT OR UPDATE OR DELETE ON public.financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_update_entry_paid_amount();

-- 2) ÍNDICE DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_financial_transactions_entry_id ON public.financial_transactions(entry_id);

-- 3) REFEITORAR VIEW vw_sales_orders_enriched PARA AGREGAÇÃO LIVE
-- A View agora soma dinamicamente o total_amount e paid_amount das entries vinculadas ao pedido.
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

  -- ═══════ Dados de entrega (cargas descarregadas) ═══════
  COALESCE(delivered.delivered_qty_sc, 0)         AS delivered_qty_sc,
  COALESCE(delivered.delivered_value, 0)          AS delivered_value,
  COALESCE(delivered.load_count, 0)::int          AS load_count,

  -- ═══════ Mercadoria em trânsito (sem descarregamento) ═══════
  COALESCE(transit.transit_count, 0)::int         AS transit_count,
  COALESCE(transit.transit_value, 0)              AS transit_value

FROM public.ops_sales_orders so

-- Agregação financeira vinculada ao pedido (origin_id)
LEFT JOIN LATERAL (
  SELECT 
    SUM(fe.paid_amount) AS total_paid
  FROM public.financial_entries fe
  WHERE (fe.origin_id = so.id OR fe.origin_id = so.legacy_id)
    AND fe.origin_type = 'sales_order'
) fin ON true

-- Cargas entregues (unload_weight_kg > 0)
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int AS load_count,
    COALESCE(SUM(ol.unload_weight_kg / 60.0), 0) AS delivered_qty_sc,
    COALESCE(SUM(
      (ol.unload_weight_kg / 60.0) *
      COALESCE(
        (ol.metadata->>'salesPrice')::numeric,
        (so.metadata->>'unitPrice')::numeric,
        0
      )
    ), 0) AS delivered_value
  FROM public.ops_loadings ol
  WHERE (ol.sales_order_id = so.id OR ol.sales_order_id = so.legacy_id)
    AND COALESCE(ol.unload_weight_kg, 0) > 0
    AND ol.status NOT IN ('canceled')
) delivered ON true

-- Cargas em trânsito
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

-- 4) BACKFILL: Sincronizar paid_amount atual em todas as entries
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.financial_entries LOOP
    UPDATE public.financial_entries SET
      paid_amount = COALESCE((
        SELECT SUM(CASE WHEN type = 'credit' THEN amount WHEN type = 'debit' THEN -amount ELSE amount END)
        FROM public.financial_transactions
        WHERE entry_id = r.id
      ), 0),
      status = CASE
        WHEN COALESCE((
          SELECT SUM(CASE WHEN type = 'credit' THEN amount WHEN type = 'debit' THEN -amount ELSE amount END)
          FROM public.financial_transactions
          WHERE entry_id = r.id
        ), 0) >= total_amount THEN 'paid'::financial_entry_status
        WHEN COALESCE((
          SELECT SUM(CASE WHEN type = 'credit' THEN amount WHEN type = 'debit' THEN -amount ELSE amount END)
          FROM public.financial_transactions
          WHERE entry_id = r.id
        ), 0) > 0 THEN 'partially_paid'::financial_entry_status
        ELSE 'pending'::financial_entry_status
      END,
      updated_at = now()
    WHERE id = r.id;
  END LOOP;
END;
$$;
