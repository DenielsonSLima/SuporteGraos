-- ============================================================================
-- MIGRATION: Auto-ativar Pedido de Venda ao inserir Carregamento
-- Objetivo: Se um pedido estiver como 'draft' ou 'pending' e receber um
--           carregamento, ele é automaticamente promovido para 'approved'.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_auto_activate_sales_order_on_loading()
RETURNS TRIGGER AS $$
BEGIN
  -- Se houver um pedido de venda vinculado
  IF NEW.sales_order_id IS NOT NULL THEN
    UPDATE public.ops_sales_orders
    SET status = 'approved',
        updated_at = now()
    WHERE id = NEW.sales_order_id
      AND status IN ('draft', 'pending');
  END IF;

  -- Opcional: Fazer o mesmo para Pedido de Compra se necessário
  IF NEW.purchase_order_id IS NOT NULL THEN
    UPDATE public.ops_purchase_orders
    SET status = 'approved',
        updated_at = now()
    WHERE id = NEW.purchase_order_id
      AND status IN ('draft', 'pending');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_activate_sales_order_on_loading ON public.ops_loadings;
CREATE TRIGGER trg_auto_activate_sales_order_on_loading
AFTER INSERT ON public.ops_loadings
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_activate_sales_order_on_loading();
