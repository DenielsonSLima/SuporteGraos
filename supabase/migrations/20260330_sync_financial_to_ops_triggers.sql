-- ============================================================================
-- MIGRATION: Synchronize financial_entries.paid_amount to OPS tables
-- Objetivo: Garantir que ops_purchase_orders e ops_sales_orders reflitam
--           o valor pago/recebido sem necessidade de cálculo no frontend.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_sync_financial_paid_to_ops()
RETURNS TRIGGER AS $$
DECLARE
  v_origin_id UUID;
  v_company_id UUID;
  v_paid_amount NUMERIC(15,2);
BEGIN
  v_origin_id := NEW.origin_id;
  v_company_id := NEW.company_id;
  v_paid_amount := COALESCE(NEW.paid_amount, 0);

  -- 1. Sync Pedido de Compra (ops_purchase_orders)
  IF NEW.origin_module = 'purchase_order' THEN
    UPDATE public.ops_purchase_orders
    SET paid_value = v_paid_amount,
        updated_at = now()
    WHERE (id = v_origin_id OR legacy_id = v_origin_id)
      AND company_id = v_company_id;
    
    -- Compatibilidade Legada (se existir tabela purchase_orders)
    UPDATE public.purchase_orders
    SET "paidValue" = v_paid_amount,
        updated_at = now()
    WHERE (id = v_origin_id)
      AND company_id = v_company_id;

  -- 2. Sync Pedido de Venda (ops_sales_orders)
  ELSIF NEW.origin_module = 'sales_order' THEN
    UPDATE public.ops_sales_orders
    SET received_value = v_paid_amount,
        updated_at = now()
    WHERE (id = v_origin_id OR legacy_id = v_origin_id)
      AND company_id = v_company_id;
      
    -- Compatibilidade Legada (se existir tabela sales_orders)
    UPDATE public.sales_orders
    SET "receivedValue" = v_paid_amount,
        updated_at = now()
    WHERE (id = v_origin_id)
      AND company_id = v_company_id;

  -- 3. Sync Logística/Frete (ops_loadings)
  -- Nota: Atualmente ops_loadings não tem 'paid_freight_value', 
  -- mas podemos adicionar no futuro se necessário.
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger disparada após atualização do paid_amount em financial_entries
DROP TRIGGER IF EXISTS trg_sync_financial_paid_to_ops ON public.financial_entries;
CREATE TRIGGER trg_sync_financial_paid_to_ops
AFTER UPDATE OF paid_amount ON public.financial_entries
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_financial_paid_to_ops();
