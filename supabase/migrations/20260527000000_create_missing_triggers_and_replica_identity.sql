-- 1. Create fn_ops_loading_compute_totals if it doesn't exist
CREATE OR REPLACE FUNCTION fn_ops_loading_compute_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_weight_kg       NUMERIC;
  v_unload_weight   NUMERIC;
  v_price_per_sc    NUMERIC;
  v_freight_per_ton NUMERIC;
  v_sales_price     NUMERIC;
  v_redirect_disp   NUMERIC;
  v_freight_base    TEXT;
  v_freight_wref    NUMERIC;
  v_sales_wref      NUMERIC;
BEGIN
  -- ── Extrair campos-base do metadata JSONB ──────────────────────────
  v_weight_kg       := COALESCE(NEW.weight_kg, (NEW.metadata->>'weightKg')::NUMERIC, 0);
  v_unload_weight   := COALESCE(NEW.unload_weight_kg, (NEW.metadata->>'unloadWeightKg')::NUMERIC, 0);
  v_price_per_sc    := COALESCE((NEW.metadata->>'purchasePricePerSc')::NUMERIC, 0);
  v_freight_per_ton := COALESCE((NEW.metadata->>'freightPricePerTon')::NUMERIC, 0);
  v_sales_price     := COALESCE((NEW.metadata->>'salesPrice')::NUMERIC, 0);
  v_redirect_disp   := COALESCE((NEW.metadata->>'redirectDisplacementValue')::NUMERIC, 0);
  v_freight_base    := COALESCE(NEW.metadata->>'freightBase', 'Origem');

  -- ── Peso de referência para frete ──────────────────────────────────
  IF v_freight_base = 'Destino' AND v_unload_weight > 0 THEN
    v_freight_wref := v_unload_weight;
  ELSE
    v_freight_wref := v_weight_kg;
  END IF;

  -- ── Peso de referência para venda (destino se disponível) ──────────
  IF v_unload_weight > 0 THEN
    v_sales_wref := v_unload_weight;
  ELSE
    v_sales_wref := v_weight_kg;
  END IF;

  -- ── Computar totais canônicos ──────────────────────────────────────
  NEW.total_purchase_value := ROUND((v_weight_kg / 60.0) * v_price_per_sc, 2);
  NEW.total_freight_value  := ROUND((v_freight_wref / 1000.0) * v_freight_per_ton + v_redirect_disp, 2);
  NEW.total_sales_value    := ROUND((v_sales_wref / 60.0) * v_sales_price, 2);

  -- ── Sincronizar totais no metadata JSONB (consistência no mapper) ──
  IF NEW.metadata IS NOT NULL THEN
    NEW.metadata := NEW.metadata || jsonb_build_object(
      'totalPurchaseValue', NEW.total_purchase_value,
      'totalFreightValue',  NEW.total_freight_value,
      'totalSalesValue',    NEW.total_sales_value
    );
  END IF;

  IF NEW.raw_payload IS NOT NULL THEN
    NEW.raw_payload := NEW.raw_payload || jsonb_build_object(
      'totalPurchaseValue', NEW.total_purchase_value,
      'totalFreightValue',  NEW.total_freight_value,
      'totalSalesValue',    NEW.total_sales_value
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the BEFORE INSERT OR UPDATE trigger trg_ops_loading_compute_totals
DROP TRIGGER IF EXISTS trg_ops_loading_compute_totals ON public.ops_loadings;
CREATE TRIGGER trg_ops_loading_compute_totals
  BEFORE INSERT OR UPDATE ON public.ops_loadings
  FOR EACH ROW
  EXECUTE FUNCTION fn_ops_loading_compute_totals();

-- 3. Ensure the AFTER INSERT OR UPDATE trigger trg_loading_unload_sync is installed
DROP TRIGGER IF EXISTS trg_loading_unload_sync ON public.ops_loadings;
CREATE TRIGGER trg_loading_unload_sync
  AFTER INSERT OR UPDATE OF unload_weight_kg, status
  ON public.ops_loadings
  FOR EACH ROW
  WHEN (
    COALESCE(NEW.unload_weight_kg, 0) > 0
    AND NEW.sales_order_id IS NOT NULL
  )
  EXECUTE FUNCTION public.trg_loading_unload_sync();

-- 4. Alter replica identities to FULL to ensure realtime Row-Level Filters receive UPDATE/DELETE columns
ALTER TABLE public.ops_loadings REPLICA IDENTITY FULL;
ALTER TABLE public.ops_purchase_orders REPLICA IDENTITY FULL;
ALTER TABLE public.ops_sales_orders REPLICA IDENTITY FULL;
ALTER TABLE public.ops_purchase_order_expenses REPLICA IDENTITY FULL;
ALTER TABLE public.accounts REPLICA IDENTITY FULL;
ALTER TABLE public.transfers REPLICA IDENTITY FULL;
ALTER TABLE public.advances REPLICA IDENTITY FULL;
ALTER TABLE public.loans REPLICA IDENTITY FULL;
ALTER TABLE public.shareholders REPLICA IDENTITY FULL;
ALTER TABLE public.admin_expenses REPLICA IDENTITY FULL;
