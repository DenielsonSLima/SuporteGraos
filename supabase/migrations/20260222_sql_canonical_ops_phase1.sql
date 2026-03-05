-- ============================================================================
-- FASE 1: Base canônica operacional (SQL-first) com rollout por feature flag
-- Data: 2026-02-22
-- Objetivo:
--   - Criar estrutura canônica para Compra, Carregamento e Venda
--   - Preservar fluxo legado (sem quebra)
--   - Expor RPCs skeleton para upsert/delete atômicos por módulo
-- ============================================================================

-- ============================================================================
-- Tabelas canônicas: Purchase
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ops_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  legacy_id UUID NULL,
  number TEXT NOT NULL,
  order_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  partner_id UUID NULL,
  partner_name TEXT NULL,
  total_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, legacy_id)
);

CREATE INDEX IF NOT EXISTS idx_ops_purchase_orders_company_date
  ON public.ops_purchase_orders(company_id, order_date DESC);

CREATE TABLE IF NOT EXISTS public.ops_purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES public.ops_purchase_orders(id) ON DELETE CASCADE,
  legacy_id UUID NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC(15,4) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'SC',
  unit_price NUMERIC(15,4) NOT NULL DEFAULT 0,
  total_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, purchase_order_id, legacy_id)
);

CREATE INDEX IF NOT EXISTS idx_ops_po_items_po
  ON public.ops_purchase_order_items(company_id, purchase_order_id);

CREATE TABLE IF NOT EXISTS public.ops_purchase_order_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES public.ops_purchase_orders(id) ON DELETE CASCADE,
  legacy_id UUID NULL,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  deductible BOOLEAN NOT NULL DEFAULT false,
  deduct_target TEXT NOT NULL DEFAULT 'supplier',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, purchase_order_id, legacy_id)
);

CREATE INDEX IF NOT EXISTS idx_ops_po_expenses_po
  ON public.ops_purchase_order_expenses(company_id, purchase_order_id);

CREATE TABLE IF NOT EXISTS public.ops_purchase_order_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES public.ops_purchase_orders(id) ON DELETE CASCADE,
  legacy_id UUID NULL,
  broker_id UUID NULL,
  broker_name TEXT NULL,
  commission_per_sc NUMERIC(15,4) NOT NULL DEFAULT 0,
  deductible BOOLEAN NOT NULL DEFAULT false,
  deduct_target TEXT NOT NULL DEFAULT 'supplier',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, purchase_order_id, legacy_id)
);

CREATE INDEX IF NOT EXISTS idx_ops_po_commissions_po
  ON public.ops_purchase_order_commissions(company_id, purchase_order_id);

-- ============================================================================
-- Tabelas canônicas: Loading
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ops_loadings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  legacy_id UUID NULL,
  loading_date DATE NOT NULL,
  purchase_order_id UUID NULL REFERENCES public.ops_purchase_orders(id) ON DELETE SET NULL,
  sales_order_id UUID NULL,
  status TEXT NOT NULL DEFAULT 'loaded',
  vehicle_plate TEXT NULL,
  driver_name TEXT NULL,
  weight_kg NUMERIC(15,3) NOT NULL DEFAULT 0,
  unload_weight_kg NUMERIC(15,3) NULL,
  total_purchase_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_sales_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_freight_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, legacy_id)
);

CREATE INDEX IF NOT EXISTS idx_ops_loadings_company_date
  ON public.ops_loadings(company_id, loading_date DESC);

CREATE TABLE IF NOT EXISTS public.ops_loading_freight_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  loading_id UUID NOT NULL REFERENCES public.ops_loadings(id) ON DELETE CASCADE,
  legacy_id UUID NULL,
  component_type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  deductible BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, loading_id, legacy_id)
);

CREATE INDEX IF NOT EXISTS idx_ops_loading_freight_loading
  ON public.ops_loading_freight_components(company_id, loading_id);

-- ============================================================================
-- Tabelas canônicas: Sales
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ops_sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  legacy_id UUID NULL,
  number TEXT NOT NULL,
  order_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  customer_id UUID NULL,
  customer_name TEXT NULL,
  total_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  received_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, legacy_id)
);

CREATE INDEX IF NOT EXISTS idx_ops_sales_orders_company_date
  ON public.ops_sales_orders(company_id, order_date DESC);

CREATE TABLE IF NOT EXISTS public.ops_sales_order_unloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sales_order_id UUID NOT NULL REFERENCES public.ops_sales_orders(id) ON DELETE CASCADE,
  loading_id UUID NULL REFERENCES public.ops_loadings(id) ON DELETE SET NULL,
  legacy_id UUID NULL,
  unload_date DATE NOT NULL DEFAULT CURRENT_DATE,
  unload_weight_kg NUMERIC(15,3) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, sales_order_id, legacy_id)
);

CREATE INDEX IF NOT EXISTS idx_ops_sales_unloads_sales
  ON public.ops_sales_order_unloads(company_id, sales_order_id);

-- ============================================================================
-- Updated_at
-- ============================================================================
DO $$
BEGIN
  IF to_regproc('public.set_updated_at') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_ops_purchase_orders_updated_at ON public.ops_purchase_orders;
    CREATE TRIGGER trg_ops_purchase_orders_updated_at BEFORE UPDATE ON public.ops_purchase_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

    DROP TRIGGER IF EXISTS trg_ops_purchase_order_items_updated_at ON public.ops_purchase_order_items;
    CREATE TRIGGER trg_ops_purchase_order_items_updated_at BEFORE UPDATE ON public.ops_purchase_order_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

    DROP TRIGGER IF EXISTS trg_ops_purchase_order_expenses_updated_at ON public.ops_purchase_order_expenses;
    CREATE TRIGGER trg_ops_purchase_order_expenses_updated_at BEFORE UPDATE ON public.ops_purchase_order_expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

    DROP TRIGGER IF EXISTS trg_ops_purchase_order_commissions_updated_at ON public.ops_purchase_order_commissions;
    CREATE TRIGGER trg_ops_purchase_order_commissions_updated_at BEFORE UPDATE ON public.ops_purchase_order_commissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

    DROP TRIGGER IF EXISTS trg_ops_loadings_updated_at ON public.ops_loadings;
    CREATE TRIGGER trg_ops_loadings_updated_at BEFORE UPDATE ON public.ops_loadings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

    DROP TRIGGER IF EXISTS trg_ops_loading_freight_components_updated_at ON public.ops_loading_freight_components;
    CREATE TRIGGER trg_ops_loading_freight_components_updated_at BEFORE UPDATE ON public.ops_loading_freight_components FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

    DROP TRIGGER IF EXISTS trg_ops_sales_orders_updated_at ON public.ops_sales_orders;
    CREATE TRIGGER trg_ops_sales_orders_updated_at BEFORE UPDATE ON public.ops_sales_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

    DROP TRIGGER IF EXISTS trg_ops_sales_order_unloads_updated_at ON public.ops_sales_order_unloads;
    CREATE TRIGGER trg_ops_sales_order_unloads_updated_at BEFORE UPDATE ON public.ops_sales_order_unloads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE public.ops_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_purchase_order_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_purchase_order_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_loadings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_loading_freight_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ops_sales_order_unloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ops_purchase_orders_policy ON public.ops_purchase_orders;
CREATE POLICY ops_purchase_orders_policy ON public.ops_purchase_orders FOR ALL
USING (company_id = public.my_company_id())
WITH CHECK (company_id = public.my_company_id());

DROP POLICY IF EXISTS ops_purchase_order_items_policy ON public.ops_purchase_order_items;
CREATE POLICY ops_purchase_order_items_policy ON public.ops_purchase_order_items FOR ALL
USING (company_id = public.my_company_id())
WITH CHECK (company_id = public.my_company_id());

DROP POLICY IF EXISTS ops_purchase_order_expenses_policy ON public.ops_purchase_order_expenses;
CREATE POLICY ops_purchase_order_expenses_policy ON public.ops_purchase_order_expenses FOR ALL
USING (company_id = public.my_company_id())
WITH CHECK (company_id = public.my_company_id());

DROP POLICY IF EXISTS ops_purchase_order_commissions_policy ON public.ops_purchase_order_commissions;
CREATE POLICY ops_purchase_order_commissions_policy ON public.ops_purchase_order_commissions FOR ALL
USING (company_id = public.my_company_id())
WITH CHECK (company_id = public.my_company_id());

DROP POLICY IF EXISTS ops_loadings_policy ON public.ops_loadings;
CREATE POLICY ops_loadings_policy ON public.ops_loadings FOR ALL
USING (company_id = public.my_company_id())
WITH CHECK (company_id = public.my_company_id());

DROP POLICY IF EXISTS ops_loading_freight_components_policy ON public.ops_loading_freight_components;
CREATE POLICY ops_loading_freight_components_policy ON public.ops_loading_freight_components FOR ALL
USING (company_id = public.my_company_id())
WITH CHECK (company_id = public.my_company_id());

DROP POLICY IF EXISTS ops_sales_orders_policy ON public.ops_sales_orders;
CREATE POLICY ops_sales_orders_policy ON public.ops_sales_orders FOR ALL
USING (company_id = public.my_company_id())
WITH CHECK (company_id = public.my_company_id());

DROP POLICY IF EXISTS ops_sales_order_unloads_policy ON public.ops_sales_order_unloads;
CREATE POLICY ops_sales_order_unloads_policy ON public.ops_sales_order_unloads FOR ALL
USING (company_id = public.my_company_id())
WITH CHECK (company_id = public.my_company_id());

-- ============================================================================
-- Helper de validação de empresa para RPCs SECURITY DEFINER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_ops_my_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT company_id
  FROM public.app_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================================
-- RPCs skeleton - Purchase
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_ops_purchase_order_upsert_v1(
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_id UUID;
  v_order_date DATE;
BEGIN
  v_company_id := public.fn_ops_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  v_id := COALESCE(NULLIF(p_payload->>'id', '')::UUID, gen_random_uuid());
  v_order_date := COALESCE(NULLIF(p_payload->>'date', '')::DATE, CURRENT_DATE);

  INSERT INTO public.ops_purchase_orders (
    id, company_id, legacy_id, number, order_date, status,
    partner_id, partner_name, total_value, paid_value, metadata, raw_payload
  ) VALUES (
    v_id,
    v_company_id,
    NULLIF(p_payload->>'id', '')::UUID,
    COALESCE(NULLIF(p_payload->>'number', ''), 'SEM-NUMERO'),
    v_order_date,
    COALESCE(NULLIF(p_payload->>'status', ''), 'pending'),
    NULLIF(p_payload->>'partnerId', '')::UUID,
    NULLIF(p_payload->>'partnerName', ''),
    COALESCE((p_payload->>'totalValue')::NUMERIC, 0),
    COALESCE((p_payload->>'paidValue')::NUMERIC, 0),
    COALESCE(p_payload, '{}'::jsonb),
    COALESCE(p_payload, '{}'::jsonb)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    number = EXCLUDED.number,
    order_date = EXCLUDED.order_date,
    status = EXCLUDED.status,
    partner_id = EXCLUDED.partner_id,
    partner_name = EXCLUDED.partner_name,
    total_value = EXCLUDED.total_value,
    paid_value = EXCLUDED.paid_value,
    metadata = EXCLUDED.metadata,
    raw_payload = EXCLUDED.raw_payload,
    updated_at = now();

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_ops_purchase_order_delete_v1(
  p_legacy_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  v_company_id := public.fn_ops_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  DELETE FROM public.ops_purchase_orders
  WHERE company_id = v_company_id
    AND legacy_id = p_legacy_id;
END;
$$;

-- ============================================================================
-- RPCs skeleton - Loading
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_ops_loading_upsert_v1(
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_id UUID;
  v_loading_date DATE;
  v_purchase_id UUID;
  v_sales_id UUID;
BEGIN
  v_company_id := public.fn_ops_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  v_id := COALESCE(NULLIF(p_payload->>'id', '')::UUID, gen_random_uuid());
  v_loading_date := COALESCE(NULLIF(p_payload->>'date', '')::DATE, CURRENT_DATE);

  SELECT id INTO v_purchase_id
  FROM public.ops_purchase_orders
  WHERE company_id = v_company_id
    AND legacy_id = NULLIF(p_payload->>'purchaseOrderId', '')::UUID
  LIMIT 1;

  SELECT id INTO v_sales_id
  FROM public.ops_sales_orders
  WHERE company_id = v_company_id
    AND legacy_id = NULLIF(p_payload->>'salesOrderId', '')::UUID
  LIMIT 1;

  INSERT INTO public.ops_loadings (
    id, company_id, legacy_id, loading_date, purchase_order_id, sales_order_id,
    status, vehicle_plate, driver_name, weight_kg, unload_weight_kg,
    total_purchase_value, total_sales_value, total_freight_value, metadata, raw_payload
  ) VALUES (
    v_id,
    v_company_id,
    NULLIF(p_payload->>'id', '')::UUID,
    v_loading_date,
    v_purchase_id,
    v_sales_id,
    COALESCE(NULLIF(p_payload->>'status', ''), 'loaded'),
    NULLIF(p_payload->>'vehiclePlate', ''),
    NULLIF(p_payload->>'driverName', ''),
    COALESCE((p_payload->>'weightKg')::NUMERIC, 0),
    NULLIF(p_payload->>'unloadWeightKg', '')::NUMERIC,
    COALESCE((p_payload->>'totalPurchaseValue')::NUMERIC, 0),
    COALESCE((p_payload->>'totalSalesValue')::NUMERIC, 0),
    COALESCE((p_payload->>'totalFreightValue')::NUMERIC, 0),
    COALESCE(p_payload, '{}'::jsonb),
    COALESCE(p_payload, '{}'::jsonb)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    loading_date = EXCLUDED.loading_date,
    purchase_order_id = EXCLUDED.purchase_order_id,
    sales_order_id = EXCLUDED.sales_order_id,
    status = EXCLUDED.status,
    vehicle_plate = EXCLUDED.vehicle_plate,
    driver_name = EXCLUDED.driver_name,
    weight_kg = EXCLUDED.weight_kg,
    unload_weight_kg = EXCLUDED.unload_weight_kg,
    total_purchase_value = EXCLUDED.total_purchase_value,
    total_sales_value = EXCLUDED.total_sales_value,
    total_freight_value = EXCLUDED.total_freight_value,
    metadata = EXCLUDED.metadata,
    raw_payload = EXCLUDED.raw_payload,
    updated_at = now();

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_ops_loading_delete_v1(
  p_legacy_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  v_company_id := public.fn_ops_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  DELETE FROM public.ops_loadings
  WHERE company_id = v_company_id
    AND legacy_id = p_legacy_id;
END;
$$;

-- ============================================================================
-- RPCs skeleton - Sales
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_ops_sales_order_upsert_v1(
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_id UUID;
  v_order_date DATE;
BEGIN
  v_company_id := public.fn_ops_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  v_id := COALESCE(NULLIF(p_payload->>'id', '')::UUID, gen_random_uuid());
  v_order_date := COALESCE(NULLIF(p_payload->>'date', '')::DATE, CURRENT_DATE);

  INSERT INTO public.ops_sales_orders (
    id, company_id, legacy_id, number, order_date, status,
    customer_id, customer_name, total_value, received_value, metadata, raw_payload
  ) VALUES (
    v_id,
    v_company_id,
    NULLIF(p_payload->>'id', '')::UUID,
    COALESCE(NULLIF(p_payload->>'number', ''), 'SEM-NUMERO'),
    v_order_date,
    COALESCE(NULLIF(p_payload->>'status', ''), 'pending'),
    NULLIF(p_payload->>'customerId', '')::UUID,
    NULLIF(p_payload->>'customerName', ''),
    COALESCE((p_payload->>'totalValue')::NUMERIC, 0),
    COALESCE((p_payload->>'paidValue')::NUMERIC, 0),
    COALESCE(p_payload, '{}'::jsonb),
    COALESCE(p_payload, '{}'::jsonb)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    number = EXCLUDED.number,
    order_date = EXCLUDED.order_date,
    status = EXCLUDED.status,
    customer_id = EXCLUDED.customer_id,
    customer_name = EXCLUDED.customer_name,
    total_value = EXCLUDED.total_value,
    received_value = EXCLUDED.received_value,
    metadata = EXCLUDED.metadata,
    raw_payload = EXCLUDED.raw_payload,
    updated_at = now();

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_ops_sales_order_delete_v1(
  p_legacy_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  v_company_id := public.fn_ops_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  DELETE FROM public.ops_sales_orders
  WHERE company_id = v_company_id
    AND legacy_id = p_legacy_id;
END;
$$;

-- ============================================================================
-- Grants RPCs
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.rpc_ops_purchase_order_upsert_v1(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_purchase_order_delete_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_loading_upsert_v1(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_loading_delete_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_sales_order_upsert_v1(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_sales_order_delete_v1(UUID) TO authenticated;

-- ============================================================================
-- Realtime publication (best-effort)
-- ============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ops_purchase_orders;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ops_loadings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ops_sales_orders;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
