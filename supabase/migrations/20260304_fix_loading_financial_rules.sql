-- ============================================================================
-- FIX: Regras financeiras de carregamento (Compra + Venda)
-- Data: 2026-03-04  (v2 — inclui trigger de venda + cleanup)
-- Objetivos:
-- 1) Compra: payable de purchase_order deve refletir soma das cargas ativas
-- 2) Compra: sempre recalcular payable ao inserir/editar/excluir loading
-- 3) Venda: não manter/gerar receivable quando não há descarga (unload)
-- 4) Venda: trigger para recalcular receivable ao mudar loading
-- 5) View de receivables: consolidar por pedido (1 linha) e só cargas entregues
-- 6) Cleanup: remover receivable indevidos e duplicados
-- ============================================================================

-- ============================================================================
-- 1) PURCHASE REBUILD: total_amount baseado nas cargas ativas do pedido
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_ops_purchase_rebuild_financial_v1(
  p_origin_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_entry_id UUID;
  v_order RECORD;
  v_due_date DATE;
  v_total NUMERIC(15,2);
  v_total_loadings NUMERIC(15,2);
  v_partner_id UUID;
BEGIN
  v_company_id := public.fn_ops_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  SELECT * INTO v_order
  FROM public.ops_purchase_orders
  WHERE company_id = v_company_id
    AND legacy_id = p_origin_id
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT * INTO v_order
    FROM public.ops_purchase_orders
    WHERE company_id = v_company_id
      AND id = p_origin_id
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido canônico não encontrado para rebuild financeiro';
  END IF;

  v_due_date := (v_order.order_date + INTERVAL '30 days')::DATE;
  v_partner_id := v_order.partner_id;

  SELECT COALESCE(SUM(COALESCE(l.total_purchase_value, 0)), 0)::NUMERIC(15,2)
    INTO v_total_loadings
  FROM public.ops_loadings l
  WHERE l.company_id = v_company_id
    AND l.purchase_order_id = v_order.id
    AND COALESCE(l.status, '') NOT IN ('canceled', 'cancelled');

  -- Regra: se houver carga ativa, o valor a pagar é a soma das cargas.
  -- Fallback: sem cargas ativas, usa total do pedido.
  v_total := CASE
    WHEN v_total_loadings > 0 THEN v_total_loadings
    ELSE COALESCE(v_order.total_value, 0)
  END;

  SELECT id INTO v_entry_id
  FROM public.financial_entries
  WHERE company_id = v_company_id
    AND type = 'payable'
    AND origin_type = 'purchase_order'
    AND origin_id = COALESCE(v_order.legacy_id, v_order.id)
  LIMIT 1;

  IF v_total <= 0 THEN
    IF v_entry_id IS NOT NULL THEN
      UPDATE public.financial_entries
      SET total_amount = 0,
          description = CONCAT('Pedido de Compra ', v_order.number),
          partner_id = COALESCE(v_partner_id, partner_id),
          due_date = v_due_date,
          updated_at = now()
      WHERE id = v_entry_id;
    END IF;
    RETURN v_entry_id;
  END IF;

  IF v_entry_id IS NOT NULL THEN
    UPDATE public.financial_entries
    SET total_amount = v_total,
        description = CONCAT('Pedido de Compra ', v_order.number),
        partner_id = COALESCE(v_partner_id, partner_id),
        due_date = v_due_date,
        updated_at = now()
    WHERE id = v_entry_id;
    RETURN v_entry_id;
  END IF;

  INSERT INTO public.financial_entries (
    company_id, type, origin_type, origin_id,
    partner_id, description, total_amount, due_date
  ) VALUES (
    v_company_id, 'payable', 'purchase_order',
    COALESCE(v_order.legacy_id, v_order.id),
    v_partner_id,
    CONCAT('Pedido de Compra ', v_order.number),
    v_total, v_due_date
  ) RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;

-- ============================================================================
-- 2) TRIGGER: sempre recalcular payable de compra em mudanças de loading
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_ops_loadings_sync_purchase_payable_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_origin_new UUID;
  v_origin_old UUID;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.purchase_order_id IS NOT NULL THEN
    SELECT COALESCE(po.legacy_id, po.id)
      INTO v_origin_new
    FROM public.ops_purchase_orders po
    WHERE po.id = NEW.purchase_order_id
    LIMIT 1;

    IF v_origin_new IS NOT NULL THEN
      PERFORM public.rpc_ops_purchase_rebuild_financial_v1(v_origin_new);
    END IF;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.purchase_order_id IS NOT NULL THEN
    SELECT COALESCE(po.legacy_id, po.id)
      INTO v_origin_old
    FROM public.ops_purchase_orders po
    WHERE po.id = OLD.purchase_order_id
    LIMIT 1;

    IF v_origin_old IS NOT NULL
       AND (v_origin_new IS NULL OR v_origin_new <> v_origin_old) THEN
      PERFORM public.rpc_ops_purchase_rebuild_financial_v1(v_origin_old);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Não bloquear operação logística por erro de sync financeiro
    RAISE WARNING '[trg_ops_loadings_sync_purchase_payable_v1] %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_ops_loadings_sync_purchase_payable_v1 ON public.ops_loadings;
CREATE TRIGGER trg_ops_loadings_sync_purchase_payable_v1
AFTER INSERT OR UPDATE OR DELETE ON public.ops_loadings
FOR EACH ROW
EXECUTE FUNCTION public.trg_ops_loadings_sync_purchase_payable_v1();

-- ============================================================================
-- 3) SALES REBUILD: sem descarga => não manter receivable aberto zerado
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_ops_sales_rebuild_financial_v1(
  p_origin_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_entry_id UUID;
  v_sale RECORD;
  v_due_date DATE;
  v_total NUMERIC(15,2);
  v_origin_id UUID;
  v_partner_id UUID;
  v_paid_amount NUMERIC(15,2);
BEGIN
  v_company_id := public.fn_ops_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  SELECT * INTO v_sale
  FROM public.ops_sales_orders
  WHERE company_id = v_company_id
    AND legacy_id = p_origin_id
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT * INTO v_sale
    FROM public.ops_sales_orders
    WHERE company_id = v_company_id
      AND id = p_origin_id
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido de venda canônico não encontrado para rebuild financeiro';
  END IF;

  v_origin_id := COALESCE(v_sale.legacy_id, v_sale.id);
  v_due_date := COALESCE(v_sale.order_date, CURRENT_DATE);
  v_partner_id := v_sale.customer_id;

  -- Soma apenas cargas COM descarga (unload_weight_kg > 0) e não canceladas
  SELECT COALESCE(SUM(
    CASE
      WHEN COALESCE(l.unload_weight_kg, 0) <= 0 THEN 0
      WHEN COALESCE(l.status, '') IN ('canceled', 'cancelled') THEN 0
      WHEN COALESCE(l.total_sales_value, 0) > 0 AND COALESCE(l.weight_kg, 0) > 0 THEN
        (l.total_sales_value / NULLIF((l.weight_kg / 60.0), 0)) * (l.unload_weight_kg / 60.0)
      WHEN COALESCE(NULLIF(l.raw_payload->>'salesPrice', '')::NUMERIC, 0) > 0 THEN
        COALESCE(NULLIF(l.raw_payload->>'salesPrice', '')::NUMERIC, 0) * (l.unload_weight_kg / 60.0)
      ELSE 0
    END
  ), 0)::NUMERIC(15,2)
  INTO v_total
  FROM public.ops_loadings l
  WHERE l.company_id = v_company_id
    AND l.sales_order_id = v_sale.id;

  -- Buscar entry existente (pode estar com origin_type OU origin_module)
  SELECT id, COALESCE(paid_amount, 0)
    INTO v_entry_id, v_paid_amount
  FROM public.financial_entries
  WHERE company_id = v_company_id
    AND type = 'receivable'
    AND origin_type = 'sales_order'
    AND origin_id = v_origin_id
  LIMIT 1;

  IF v_total <= 0 THEN
    -- Regra de negócio: sem descarga não há conta a receber.
    -- Se ainda não houve recebimento, remove a obrigação.
    IF v_entry_id IS NOT NULL AND COALESCE(v_paid_amount, 0) <= 0 THEN
      DELETE FROM public.financial_entries
      WHERE id = v_entry_id;
      RETURN NULL;
    ELSIF v_entry_id IS NOT NULL THEN
      UPDATE public.financial_entries
      SET total_amount = GREATEST(COALESCE(v_paid_amount, 0), 0),
          status = CASE WHEN COALESCE(v_paid_amount, 0) > 0 THEN 'paid' ELSE 'pending' END,
          description = CONCAT('Venda ', v_sale.number),
          partner_id = COALESCE(v_partner_id, partner_id),
          due_date = v_due_date,
          updated_at = now()
      WHERE id = v_entry_id;
      RETURN v_entry_id;
    END IF;

    RETURN NULL;
  END IF;

  IF v_entry_id IS NOT NULL THEN
    UPDATE public.financial_entries
    SET total_amount = v_total,
        description = CONCAT('Venda ', v_sale.number),
        partner_id = COALESCE(v_partner_id, partner_id),
        due_date = v_due_date,
        updated_at = now()
    WHERE id = v_entry_id;
    RETURN v_entry_id;
  END IF;

  INSERT INTO public.financial_entries (
    company_id, type, origin_type, origin_id,
    partner_id, description, total_amount, due_date
  ) VALUES (
    v_company_id, 'receivable', 'sales_order', v_origin_id,
    v_partner_id,
    CONCAT('Venda ', v_sale.number),
    v_total, v_due_date
  ) RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;

-- ============================================================================
-- 4) TRIGGER: recalcular receivable de VENDA em mudanças de loading
--    (Mesmo padrão do trigger de compra)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_ops_loadings_sync_sales_receivable_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_origin_new UUID;
  v_origin_old UUID;
BEGIN
  -- INSERT ou UPDATE com sales_order_id → recalcular receivable
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.sales_order_id IS NOT NULL THEN
    SELECT COALESCE(so.legacy_id, so.id)
      INTO v_origin_new
    FROM public.ops_sales_orders so
    WHERE so.id = NEW.sales_order_id
    LIMIT 1;

    IF v_origin_new IS NOT NULL THEN
      PERFORM public.rpc_ops_sales_rebuild_financial_v1(v_origin_new);
    END IF;
  END IF;

  -- UPDATE mudou de pedido / DELETE → recalcular o pedido antigo
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.sales_order_id IS NOT NULL THEN
    SELECT COALESCE(so.legacy_id, so.id)
      INTO v_origin_old
    FROM public.ops_sales_orders so
    WHERE so.id = OLD.sales_order_id
    LIMIT 1;

    IF v_origin_old IS NOT NULL
       AND (v_origin_new IS NULL OR v_origin_new <> v_origin_old) THEN
      PERFORM public.rpc_ops_sales_rebuild_financial_v1(v_origin_old);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Não bloquear operação logística por erro de sync financeiro
    RAISE WARNING '[trg_ops_loadings_sync_sales_receivable_v1] %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_ops_loadings_sync_sales_receivable_v1 ON public.ops_loadings;
CREATE TRIGGER trg_ops_loadings_sync_sales_receivable_v1
AFTER INSERT OR UPDATE OR DELETE ON public.ops_loadings
FOR EACH ROW
EXECUTE FUNCTION public.trg_ops_loadings_sync_sales_receivable_v1();

-- ============================================================================
-- 5) VIEW: receivables consolidados por pedido (1 linha) e só cargas entregues
--    CORRIGE: view anterior fazia LEFT JOIN 1:N com ops_loadings, gerando
--    uma linha por carga em vez de uma linha consolidada por pedido de venda.
-- ============================================================================
DROP VIEW IF EXISTS public.vw_receivables_enriched;
CREATE VIEW public.vw_receivables_enriched
WITH (security_invoker = on)
AS
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
  COALESCE(p.name, LEFT(fe.partner_id::text, 8), 'Cliente') AS partner_name,
  so.number AS sales_order_number,
  so.id AS sales_order_id,
  COALESCE(delivered.loading_weight_kg, 0::numeric) AS loading_weight_kg,
  COALESCE(delivered.loading_weight_ton, 0::numeric) AS loading_weight_ton,
  COALESCE(delivered.loading_weight_sc, 0::numeric) AS loading_weight_sc,
  COALESCE(delivered.loading_sales_value, 0::numeric) AS loading_sales_value,
  CASE
    WHEN COALESCE(delivered.loading_weight_sc, 0::numeric) > 0 THEN
      ROUND(COALESCE(delivered.loading_sales_value, 0::numeric) / delivered.loading_weight_sc, 4)
    ELSE 0::numeric
  END AS unit_price_sc
FROM public.financial_entries fe

-- JOIN parceiro
LEFT JOIN public.parceiros_parceiros p ON p.id = fe.partner_id

-- JOIN pedido de venda (compatível com canonical id E legacy_id)
LEFT JOIN public.ops_sales_orders so
  ON (so.id = fe.origin_id OR so.legacy_id = fe.origin_id)
  AND fe.origin_type = 'sales_order'

-- LATERAL: agrega TODAS as cargas entregues em UMA linha (evita 1:N)
LEFT JOIN LATERAL (
  SELECT
    COALESCE(SUM(ol.unload_weight_kg), 0::numeric) AS loading_weight_kg,
    ROUND(COALESCE(SUM(ol.unload_weight_kg), 0::numeric) / 1000.0, 3) AS loading_weight_ton,
    ROUND(COALESCE(SUM(ol.unload_weight_kg), 0::numeric) / 60.0, 2) AS loading_weight_sc,
    COALESCE(SUM(
      CASE
        WHEN COALESCE(ol.total_sales_value, 0) > 0 AND COALESCE(ol.weight_kg, 0) > 0 THEN
          (ol.total_sales_value / NULLIF(ol.weight_kg, 0)) * ol.unload_weight_kg
        WHEN COALESCE((ol.metadata->>'salesPrice')::numeric, 0::numeric) > 0 THEN
          ((ol.metadata->>'salesPrice')::numeric / 60.0) * ol.unload_weight_kg
        WHEN so.id IS NOT NULL AND COALESCE((so.metadata->>'unitPrice')::numeric, 0::numeric) > 0 THEN
          ((so.metadata->>'unitPrice')::numeric / 60.0) * ol.unload_weight_kg
        ELSE 0::numeric
      END
    ), 0::numeric) AS loading_sales_value
  FROM public.ops_loadings ol
  WHERE fe.origin_type = 'sales_order'
    AND (
      ol.sales_order_id = so.id
      OR ol.sales_order_id = so.legacy_id
      OR ol.sales_order_id = fe.origin_id
    )
    AND COALESCE(ol.unload_weight_kg, 0::numeric) > 0
    AND COALESCE(ol.status, '') NOT IN ('canceled', 'cancelled')
) delivered ON true

WHERE fe.type = 'receivable';

GRANT SELECT ON public.vw_receivables_enriched TO anon, authenticated;

-- ============================================================================
-- 6) CLEANUP: remover receivable com total_amount = 0 e sem recebimento,
--    e deduplicar entries de venda (manter apenas o mais recente por origin_id)
-- ============================================================================
DO $$
DECLARE
  v_deleted_zero INT := 0;
  v_deleted_dups INT := 0;
BEGIN
  -- 6a) Remover receivables zerados sem pagamento
  WITH to_delete AS (
    SELECT fe.id
    FROM public.financial_entries fe
    WHERE fe.type = 'receivable'
      AND fe.origin_type = 'sales_order'
      AND COALESCE(fe.total_amount, 0) <= 0
      AND COALESCE(fe.paid_amount, 0) <= 0
  )
  DELETE FROM public.financial_entries
  WHERE id IN (SELECT id FROM to_delete);

  GET DIAGNOSTICS v_deleted_zero = ROW_COUNT;

  -- 6b) Deduplicar: se existem múltiplas entries receivable para o mesmo
  --     origin_id + company_id, manter apenas a mais recente (por updated_at)
  WITH ranked AS (
    SELECT
      fe.id,
      ROW_NUMBER() OVER (
        PARTITION BY fe.company_id, fe.origin_id
        ORDER BY fe.updated_at DESC NULLS LAST, fe.created_at DESC NULLS LAST
      ) AS rn
    FROM public.financial_entries fe
    WHERE fe.type = 'receivable'
      AND fe.origin_type = 'sales_order'
  ),
  dups AS (
    SELECT id FROM ranked WHERE rn > 1
  )
  DELETE FROM public.financial_entries
  WHERE id IN (SELECT id FROM dups);

  GET DIAGNOSTICS v_deleted_dups = ROW_COUNT;

  RAISE NOTICE '[CLEANUP] Removidos: % zerados, % duplicados', v_deleted_zero, v_deleted_dups;
END
$$;
