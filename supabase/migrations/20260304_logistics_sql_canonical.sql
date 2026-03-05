-- ============================================================================
-- MIGRATION: Logística SQL Canônica
-- Data: 2026-03-04
-- ============================================================================
-- 1. TRIGGER: Recomputa totais derivados em ops_loadings (autoridade do SQL)
-- 2. RPC: KPIs de Logística via SUM() no banco
-- 3. RPC: Saldo do frete de um carregamento via financial_entries
-- ============================================================================

-- ============================================================================
-- 1. TRIGGER: fn_ops_loading_compute_totals
--    Garante que total_purchase_value, total_freight_value e total_sales_value
--    são SEMPRE computados a partir dos campos-base (peso, preço unitário).
--    Mesmo que o frontend envie valores pré-calculados, o SQL os sobrescreve.
-- ============================================================================

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

-- Idempotente: drop antes de criar
DROP TRIGGER IF EXISTS trg_ops_loading_compute_totals ON ops_loadings;

CREATE TRIGGER trg_ops_loading_compute_totals
  BEFORE INSERT OR UPDATE ON ops_loadings
  FOR EACH ROW
  EXECUTE FUNCTION fn_ops_loading_compute_totals();


-- ============================================================================
-- 2. RPC: rpc_logistics_kpi_totals
--    Retorna KPIs agregados da VIEW v_logistics_freights.
--    Aceita filtros opcionais (transportadora, período, texto).
-- ============================================================================

CREATE OR REPLACE FUNCTION rpc_logistics_kpi_totals(
  p_carrier_name TEXT DEFAULT NULL,
  p_start_date   TEXT DEFAULT NULL,
  p_end_date     TEXT DEFAULT NULL,
  p_search       TEXT DEFAULT NULL
)
RETURNS TABLE(
  total_freight_value NUMERIC,
  total_paid          NUMERIC,
  total_pending       NUMERIC,
  total_volume_ton    NUMERIC,
  active_count        BIGINT,
  total_count         BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(v.total_freight), 0)::NUMERIC         AS total_freight_value,
    COALESCE(SUM(v.paid_value), 0)::NUMERIC             AS total_paid,
    COALESCE(SUM(v.balance_value), 0)::NUMERIC           AS total_pending,
    COALESCE(SUM(v.weight::NUMERIC / 1000.0), 0)::NUMERIC AS total_volume_ton,
    COUNT(*) FILTER (WHERE v.status NOT IN ('completed', 'canceled')) AS active_count,
    COUNT(*)                                              AS total_count
  FROM v_logistics_freights v
  WHERE
    (p_carrier_name IS NULL OR p_carrier_name = '' OR v.carrier_name = p_carrier_name)
    AND (p_start_date IS NULL OR p_start_date = '' OR v.date >= p_start_date)
    AND (p_end_date   IS NULL OR p_end_date   = '' OR v.date <= p_end_date)
    AND (p_search     IS NULL OR p_search     = '' OR (
         v.carrier_name  ILIKE '%' || p_search || '%'
      OR v.driver_name   ILIKE '%' || p_search || '%'
      OR v.vehicle_plate ILIKE '%' || p_search || '%'
      OR v.order_number  ILIKE '%' || p_search || '%'
    ));
END;
$$ LANGUAGE plpgsql STABLE;


-- ============================================================================
-- 3. RPC: rpc_loading_freight_paid_from_entries
--    Retorna o paid_amount + discount_amount acumulado de financial_entries
--    para um carregamento específico (origin_type = 'freight').
-- ============================================================================

CREATE OR REPLACE FUNCTION rpc_loading_freight_paid_from_entries(
  p_loading_id TEXT
)
RETURNS TABLE(
  paid_amount    NUMERIC,
  discount_amount NUMERIC,
  total_amount   NUMERIC,
  balance        NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(fe.paid_amount, 0)::NUMERIC     AS paid_amount,
    COALESCE(fe.discount_amount, 0)::NUMERIC AS discount_amount,
    COALESCE(fe.total_amount, 0)::NUMERIC    AS total_amount,
    GREATEST(0, COALESCE(fe.total_amount, 0) - COALESCE(fe.paid_amount, 0) - COALESCE(fe.discount_amount, 0))::NUMERIC AS balance
  FROM financial_entries fe
  WHERE fe.origin_id = p_loading_id
    AND fe.origin_type = 'freight'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;
