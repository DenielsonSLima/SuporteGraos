-- ============================================================================
-- Migration: Auto-settle advance on loading (idempotent)
-- ============================================================================
-- Quando um carregamento é criado/atualizado/deletado em um pedido de compra,
-- recalcula automaticamente o settled_amount do adiantamento vinculado.
-- Regra de negócio: adiantamento com origem em PC só pode ser consumido via
-- carregamentos ou despesas do pedido.
-- ============================================================================

-- 1. Função que recalcula o settled_amount do adiantamento baseado nos carregamentos
CREATE OR REPLACE FUNCTION public.fn_auto_settle_advance_from_loadings(p_purchase_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_partner_id UUID;
  v_company_id UUID;
  v_total_loadings NUMERIC(15,2);
  v_advance RECORD;
  v_consumed NUMERIC(15,2);
BEGIN
  -- 1. Buscar o partner_id e company_id do pedido de compra
  SELECT partner_id, company_id INTO v_partner_id, v_company_id
  FROM public.ops_purchase_orders
  WHERE id = p_purchase_order_id;

  IF v_partner_id IS NULL THEN
    RETURN; -- Pedido não encontrado, nada a fazer
  END IF;

  -- 2. Calcular o total de carregamentos ativos do pedido (valor do produtor)
  SELECT COALESCE(SUM(total_purchase_value), 0) INTO v_total_loadings
  FROM public.ops_loadings
  WHERE purchase_order_id = p_purchase_order_id
    AND status NOT IN ('canceled', 'cancelled');

  -- 3. Buscar adiantamentos vinculados a este pedido de compra
  -- Um adiantamento está vinculado quando existe um financial_link com
  -- purchase_order_id apontando para este pedido E a transação tem origin_type = 'advance'
  FOR v_advance IN
    SELECT DISTINCT a.id, a.amount
    FROM public.advances a
    JOIN public.financial_entries fe ON fe.origin_type = 'advance' AND fe.origin_id = a.id
    JOIN public.financial_transactions ft ON ft.entry_id = fe.id
    JOIN public.financial_links fl ON fl.transaction_id = ft.id
    WHERE fl.purchase_order_id = p_purchase_order_id
      AND a.parent_id IS NULL
      AND a.recipient_id = v_partner_id
      AND a.recipient_type = 'supplier'
      AND a.company_id = v_company_id
  LOOP
    -- O valor consumido é o menor entre o total de carregamentos e o valor do adiantamento
    v_consumed := LEAST(v_total_loadings, v_advance.amount);

    -- remaining_amount é generated column (amount - settled_amount STORED), só atualizamos settled_amount
    UPDATE public.advances
    SET
      settled_amount = v_consumed,
      status = CASE
        WHEN v_consumed >= amount THEN 'settled'
        WHEN v_consumed > 0 THEN 'partially_settled'
        ELSE 'open'
      END,
      settlement_date = CASE
        WHEN v_consumed >= amount THEN CURRENT_DATE
        ELSE NULL
      END,
      updated_at = now()
    WHERE id = v_advance.id;

    -- Descontar do total de carregamentos para o próximo adiantamento (se houver múltiplos)
    v_total_loadings := GREATEST(v_total_loadings - v_advance.amount, 0);
  END LOOP;
END;
$function$;

-- 2. Atualizar o trigger de sincronização financeira de carregamentos
-- para chamar a nova função de auto-settle de adiantamento
CREATE OR REPLACE FUNCTION public.fn_trigger_ops_loading_sync_financial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_origin_id UUID;
  v_po_id UUID;
  v_so_id UUID;
BEGIN
  -- Identificar IDs afetados
  IF TG_OP = 'DELETE' THEN
    v_origin_id := OLD.id;
    v_po_id := OLD.purchase_order_id;
    v_so_id := OLD.sales_order_id;
  ELSE
    v_origin_id := NEW.id;
    v_po_id := NEW.purchase_order_id;
    v_so_id := NEW.sales_order_id;
  END IF;

  -- 1. Rebuild Frete
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.financial_entries 
    WHERE (origin_type = 'freight' OR origin_type = 'freight_loading')
      AND (origin_id = OLD.id OR origin_id = OLD.legacy_id);
  ELSE
    PERFORM public.rpc_ops_loading_rebuild_freight_financial_v1(v_origin_id);
  END IF;

  -- 2. Rebuild Compra
  IF v_po_id IS NOT NULL THEN
    PERFORM public.rpc_ops_purchase_rebuild_financial_v1(v_po_id);
    
    -- 3. AUTO-SETTLE: Recalcular o adiantamento vinculado ao pedido
    PERFORM public.fn_auto_settle_advance_from_loadings(v_po_id);
  END IF;

  -- 4. Rebuild Venda
  IF v_so_id IS NOT NULL THEN
    PERFORM public.rpc_ops_sales_rebuild_financial_v1(v_so_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;

-- 3. Backfill: Recalcular todos os adiantamentos existentes que têm pedidos com carregamentos
DO $$
DECLARE
  v_po RECORD;
BEGIN
  FOR v_po IN
    SELECT DISTINCT fl.purchase_order_id
    FROM public.financial_links fl
    JOIN public.financial_transactions ft ON ft.id = fl.transaction_id
    JOIN public.financial_entries fe ON fe.id = ft.entry_id
    WHERE fl.purchase_order_id IS NOT NULL
      AND fe.origin_type = 'advance'
  LOOP
    PERFORM public.fn_auto_settle_advance_from_loadings(v_po.purchase_order_id);
  END LOOP;
END;
$$;
