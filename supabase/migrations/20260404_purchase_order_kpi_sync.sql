-- ============================================================================
-- MIGRATION: Sincronização Automática e View Enriquecida de Pedidos de Compra
-- DATA: 2026-04-04
-- OBJETIVO: Centralizar todos os cálculos financeiros no SQL.
-- ============================================================================

-- 1) VIEW ENRIQUECIDA (A fonte de verdade para a Listagem e KPIs)
-- Esta view faz as agregações em tempo real para garantir que o "burro" frontend não erre.
CREATE OR REPLACE VIEW public.vw_purchase_orders_enriched AS
SELECT 
    po.*,
    -- Agregação de Itens (Valor de Contrato)
    COALESCE((SELECT SUM(total_value) FROM public.ops_purchase_order_items WHERE purchase_order_id = po.id), 0) as total_items_value,
    
    -- Agregação de Carregamentos (Progresso Físico e Financeiro)
    COALESCE(agg_load.total_kg, 0) as total_kg,
    COALESCE(agg_load.total_sc, 0) as total_sc,
    COALESCE(agg_load.total_purchase_val, 0) as total_purchase_val_calc,
    COALESCE(agg_load.total_freight_val, 0) as total_freight_val_calc,
    COALESCE(agg_load.total_sales_val, 0) as total_sales_val_calc,
    
    -- Agregação Financeira (Pagamentos Reais via Links)
    COALESCE(agg_fin.paid_amount, 0) as actual_paid_value,
    (po.total_value - COALESCE(agg_fin.paid_amount, 0)) as balance_value

FROM public.ops_purchase_orders po
LEFT JOIN LATERAL (
    SELECT 
        SUM(weight_kg) as total_kg,
        SUM(weight_kg / 60.0) as total_sc,
        SUM(total_purchase_value) as total_purchase_val,
        SUM(total_freight_value) as total_freight_val,
        SUM(total_sales_value) as total_sales_val
    FROM public.ops_loadings
    WHERE purchase_order_id = po.id AND status != 'canceled'
) agg_load ON true
LEFT JOIN LATERAL (
    SELECT 
        SUM(
            CASE 
                WHEN ft.type = 'debit' THEN ft.amount 
                WHEN ft.type = 'credit' THEN -ft.amount 
                ELSE 0 
            END
        ) as paid_amount
    FROM public.financial_links fl
    JOIN public.financial_transactions ft ON ft.id = fl.transaction_id
    WHERE fl.purchase_order_id = po.id
) agg_fin ON true;

-- 2) FUNÇÃO DE SINCRONIZAÇÃO (Garante que a tabela base ops_purchase_orders também fique ok)
CREATE OR REPLACE FUNCTION public.fn_sync_purchase_order_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_po_id UUID;
  v_total_paid NUMERIC(15,2);
  v_order_total NUMERIC(15,2);
  v_new_status TEXT;
BEGIN
  v_po_id := COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  
  IF v_po_id IS NOT NULL THEN
    -- Recalcula o pago real
    SELECT COALESCE(SUM(
      CASE 
        WHEN ft.type = 'debit' THEN ft.amount 
        WHEN ft.type = 'credit' THEN -ft.amount 
        ELSE 0 
      END
    ), 0) INTO v_total_paid
    FROM public.financial_links fl
    JOIN public.financial_transactions ft ON ft.id = fl.transaction_id
    WHERE fl.purchase_order_id = v_po_id;

    -- Busca o total do pedido
    SELECT total_value INTO v_order_total
    FROM public.ops_purchase_orders
    WHERE id = v_po_id;

    -- Define o status
    IF v_total_paid >= v_order_total AND v_order_total > 0 THEN
      v_new_status := 'received'; -- Corresponde a 'completed' no frontend
    ELSIF v_total_paid > 0 THEN
      v_new_status := 'partially_paid';
    ELSE
      v_new_status := 'pending';
    END IF;

    -- Atualiza a tabela base
    UPDATE public.ops_purchase_orders SET
      paid_value = v_total_paid,
      -- status = v_new_status, -- Removido para permitir finalização manual via frontend
      updated_at = now()
    WHERE id = v_po_id;
  END IF;

  RETURN NULL;
END;
$$;

-- 3) GATILHO NA TABELA financial_links
DROP TRIGGER IF EXISTS trg_sync_purchase_order_on_link ON public.financial_links;
CREATE TRIGGER trg_sync_purchase_order_on_link
AFTER INSERT OR UPDATE OR DELETE ON public.financial_links
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_purchase_order_financials();

-- 4) RPC PARA DETALHES (Única fonte de verdade para o Hook)
CREATE OR REPLACE FUNCTION public.rpc_get_purchase_order_stats(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
SELECT jsonb_build_object(
    'id', id,
    'total_value', total_value,
    'paid_value', actual_paid_value,
    'balance_value', balance_value,
    'status', status,
    'total_purchase_val_calc', total_purchase_val_calc,
    'total_freight_val_calc', total_freight_val_calc,
    'total_sales_val_calc', total_sales_val_calc,
    'total_kg', total_kg,
    'total_sc', total_sc,
    'last_sync', now()
)
FROM public.vw_purchase_orders_enriched
WHERE id = p_order_id;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_purchase_order_stats(UUID) TO authenticated;
GRANT SELECT ON public.vw_purchase_orders_enriched TO authenticated;

