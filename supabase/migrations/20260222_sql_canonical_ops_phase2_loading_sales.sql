-- ============================================================================
-- FASE 2 (Loading + Sales): RPCs canônicas com rebuild financeiro SQL-first
-- Data: 2026-02-22
-- Objetivo:
--   - Evoluir upsert canônico de carregamento/venda para v2
--   - Rebuild de financial_entries no SQL (frete e recebível de venda)
--   - Preservar compatibilidade com legado (origin_id = legacy_id quando existir)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_ops_loading_rebuild_freight_financial_v1(
  p_origin_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_entry_id UUID;
  v_loading RECORD;
  v_due_date DATE;
  v_total NUMERIC(15,2);
  v_origin_id UUID;
BEGIN
  v_company_id := public.fn_ops_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  SELECT * INTO v_loading
  FROM public.ops_loadings
  WHERE company_id = v_company_id
    AND legacy_id = p_origin_id
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT * INTO v_loading
    FROM public.ops_loadings
    WHERE company_id = v_company_id
      AND id = p_origin_id
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carregamento canônico não encontrado para rebuild financeiro';
  END IF;

  v_origin_id := COALESCE(v_loading.legacy_id, v_loading.id);
  v_due_date := COALESCE(v_loading.loading_date, CURRENT_DATE);
  v_total := COALESCE(v_loading.total_freight_value, 0);

  SELECT id INTO v_entry_id
  FROM public.financial_entries
  WHERE company_id = v_company_id
    AND type = 'payable'
    AND origin_module = 'freight'
    AND origin_id = v_origin_id
  LIMIT 1;

  IF v_total <= 0 THEN
    IF v_entry_id IS NOT NULL THEN
      UPDATE public.financial_entries
      SET total_amount = 0,
          description = CONCAT('Frete do carregamento ', COALESCE(v_loading.vehicle_plate, 'SEM-PLACA')),
          due_date = v_due_date,
          updated_at = now()
      WHERE id = v_entry_id;
    END IF;

    RETURN v_entry_id;
  END IF;

  IF v_entry_id IS NOT NULL THEN
    UPDATE public.financial_entries
    SET total_amount = v_total,
        description = CONCAT('Frete do carregamento ', COALESCE(v_loading.vehicle_plate, 'SEM-PLACA')),
        due_date = v_due_date,
        updated_at = now()
    WHERE id = v_entry_id;

    RETURN v_entry_id;
  END IF;

  INSERT INTO public.financial_entries (
    company_id,
    type,
    origin_module,
    origin_id,
    description,
    total_amount,
    due_date
  ) VALUES (
    v_company_id,
    'payable',
    'freight',
    v_origin_id,
    CONCAT('Frete do carregamento ', COALESCE(v_loading.vehicle_plate, 'SEM-PLACA')),
    v_total,
    v_due_date
  ) RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;

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

  SELECT COALESCE(SUM(
    CASE
      WHEN COALESCE(l.unload_weight_kg, 0) <= 0 OR COALESCE(l.status, '') = 'canceled' THEN 0
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

  SELECT id INTO v_entry_id
  FROM public.financial_entries
  WHERE company_id = v_company_id
    AND type = 'receivable'
    AND origin_module = 'sales_order'
    AND origin_id = v_origin_id
  LIMIT 1;

  IF v_total <= 0 THEN
    IF v_entry_id IS NOT NULL THEN
      UPDATE public.financial_entries
      SET total_amount = 0,
          description = CONCAT('Venda ', v_sale.number),
          due_date = v_due_date,
          updated_at = now()
      WHERE id = v_entry_id;
    END IF;

    RETURN v_entry_id;
  END IF;

  IF v_entry_id IS NOT NULL THEN
    UPDATE public.financial_entries
    SET total_amount = v_total,
        description = CONCAT('Venda ', v_sale.number),
        due_date = v_due_date,
        updated_at = now()
    WHERE id = v_entry_id;

    RETURN v_entry_id;
  END IF;

  INSERT INTO public.financial_entries (
    company_id,
    type,
    origin_module,
    origin_id,
    description,
    total_amount,
    due_date
  ) VALUES (
    v_company_id,
    'receivable',
    'sales_order',
    v_origin_id,
    CONCAT('Venda ', v_sale.number),
    v_total,
    v_due_date
  ) RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_ops_loading_upsert_v2(
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
  v_legacy_id UUID;
  v_sales_origin UUID;
BEGIN
  v_company_id := public.fn_ops_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  v_legacy_id := NULLIF(p_payload->>'id', '')::UUID;
  v_loading_date := COALESCE(NULLIF(p_payload->>'date', '')::DATE, CURRENT_DATE);

  SELECT id INTO v_id
  FROM public.ops_loadings
  WHERE company_id = v_company_id
    AND legacy_id = v_legacy_id
  LIMIT 1;

  IF v_id IS NULL THEN
    v_id := COALESCE(v_legacy_id, gen_random_uuid());
  END IF;

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
    v_legacy_id,
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

  DELETE FROM public.ops_loading_freight_components
  WHERE company_id = v_company_id
    AND loading_id = v_id;

  INSERT INTO public.ops_loading_freight_components (
    company_id,
    loading_id,
    legacy_id,
    component_type,
    description,
    amount,
    deductible,
    metadata
  ) VALUES (
    v_company_id,
    v_id,
    NULL,
    'freight_base',
    'Frete base',
    COALESCE((p_payload->>'totalFreightValue')::NUMERIC, 0),
    false,
    p_payload
  );

  INSERT INTO public.ops_loading_freight_components (
    company_id,
    loading_id,
    legacy_id,
    component_type,
    description,
    amount,
    deductible,
    metadata
  )
  SELECT
    v_company_id,
    v_id,
    NULLIF(e->>'id', '')::UUID,
    CASE
      WHEN lower(COALESCE(e->>'type', '')) = 'deduction' THEN 'deduction'
      ELSE 'addition'
    END,
    COALESCE(NULLIF(e->>'description', ''), 'Ajuste de frete'),
    COALESCE(NULLIF(e->>'value', '')::NUMERIC, 0),
    lower(COALESCE(e->>'type', '')) = 'deduction',
    e
  FROM jsonb_array_elements(COALESCE(p_payload->'extraExpenses', '[]'::jsonb)) e;

  PERFORM public.rpc_ops_loading_rebuild_freight_financial_v1(COALESCE(v_legacy_id, v_id));

  IF v_sales_id IS NOT NULL THEN
    SELECT COALESCE(legacy_id, id) INTO v_sales_origin
    FROM public.ops_sales_orders
    WHERE company_id = v_company_id
      AND id = v_sales_id
    LIMIT 1;

    IF v_sales_origin IS NOT NULL THEN
      PERFORM public.rpc_ops_sales_rebuild_financial_v1(v_sales_origin);
    END IF;
  END IF;

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
  v_loading_origin UUID;
  v_sales_origin UUID;
BEGIN
  v_company_id := public.fn_ops_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  SELECT COALESCE(l.legacy_id, l.id), COALESCE(s.legacy_id, s.id)
    INTO v_loading_origin, v_sales_origin
  FROM public.ops_loadings l
  LEFT JOIN public.ops_sales_orders s ON s.id = l.sales_order_id
  WHERE l.company_id = v_company_id
    AND (l.legacy_id = p_legacy_id OR l.id = p_legacy_id)
  LIMIT 1;

  DELETE FROM public.ops_loadings
  WHERE company_id = v_company_id
    AND (legacy_id = p_legacy_id OR id = p_legacy_id);

  IF v_loading_origin IS NOT NULL THEN
    DELETE FROM public.financial_entries
    WHERE company_id = v_company_id
      AND type = 'payable'
      AND origin_module = 'freight'
      AND origin_id = v_loading_origin;
  END IF;

  IF v_sales_origin IS NOT NULL THEN
    PERFORM public.rpc_ops_sales_rebuild_financial_v1(v_sales_origin);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_ops_sales_order_upsert_v2(
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
  v_legacy_id UUID;
BEGIN
  v_company_id := public.fn_ops_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  v_legacy_id := NULLIF(p_payload->>'id', '')::UUID;
  v_order_date := COALESCE(NULLIF(p_payload->>'date', '')::DATE, CURRENT_DATE);

  SELECT id INTO v_id
  FROM public.ops_sales_orders
  WHERE company_id = v_company_id
    AND legacy_id = v_legacy_id
  LIMIT 1;

  IF v_id IS NULL THEN
    v_id := COALESCE(v_legacy_id, gen_random_uuid());
  END IF;

  INSERT INTO public.ops_sales_orders (
    id, company_id, legacy_id, number, order_date, status,
    customer_id, customer_name, total_value, received_value, metadata, raw_payload
  ) VALUES (
    v_id,
    v_company_id,
    v_legacy_id,
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

  PERFORM public.rpc_ops_sales_rebuild_financial_v1(COALESCE(v_legacy_id, v_id));

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
  v_sales_origin UUID;
BEGIN
  v_company_id := public.fn_ops_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  SELECT COALESCE(legacy_id, id) INTO v_sales_origin
  FROM public.ops_sales_orders
  WHERE company_id = v_company_id
    AND (legacy_id = p_legacy_id OR id = p_legacy_id)
  LIMIT 1;

  IF v_sales_origin IS NOT NULL THEN
    DELETE FROM public.financial_entries
    WHERE company_id = v_company_id
      AND type = 'receivable'
      AND origin_module = 'sales_order'
      AND origin_id = v_sales_origin;
  END IF;

  DELETE FROM public.ops_sales_orders
  WHERE company_id = v_company_id
    AND (legacy_id = p_legacy_id OR id = p_legacy_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_ops_loading_rebuild_freight_financial_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_sales_rebuild_financial_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_loading_upsert_v2(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_sales_order_upsert_v2(JSONB) TO authenticated;
