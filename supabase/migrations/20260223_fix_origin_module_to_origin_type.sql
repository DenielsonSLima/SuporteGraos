-- ============================================================================
-- FIX: Corrigir todas as RPCs que usam "origin_module" → "origin_type"
-- Data: 2026-02-23
-- Problema:
--   A tabela financial_entries tem a coluna "origin_type" (definida em 012_financial_entries.sql),
--   mas as RPCs da Phase 2 usam erroneamente "origin_module" que não existe.
--   Isso causa falha silenciosa ao criar/buscar financial_entries.
-- Solução:
--   Recriar todas as funções afetadas com o nome correto da coluna.
-- ============================================================================

-- ============================================================================
-- 1. PURCHASE ORDER: rpc_ops_purchase_rebuild_financial_v1
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
  v_total := COALESCE(v_order.total_value, 0);

  -- FIX: origin_type (era origin_module)
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
        due_date = v_due_date,
        updated_at = now()
    WHERE id = v_entry_id;

    RETURN v_entry_id;
  END IF;

  -- FIX: origin_type (era origin_module)
  INSERT INTO public.financial_entries (
    company_id,
    type,
    origin_type,
    origin_id,
    description,
    total_amount,
    due_date
  ) VALUES (
    v_company_id,
    'payable',
    'purchase_order',
    COALESCE(v_order.legacy_id, v_order.id),
    CONCAT('Pedido de Compra ', v_order.number),
    v_total,
    v_due_date
  ) RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;

-- ============================================================================
-- 2. LOADING (Freight): rpc_ops_loading_rebuild_freight_financial_v1
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

  -- FIX: origin_type (era origin_module)
  SELECT id INTO v_entry_id
  FROM public.financial_entries
  WHERE company_id = v_company_id
    AND type = 'payable'
    AND origin_type = 'freight'
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

  -- FIX: origin_type (era origin_module)
  INSERT INTO public.financial_entries (
    company_id,
    type,
    origin_type,
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

-- ============================================================================
-- 3. SALES ORDER: rpc_ops_sales_rebuild_financial_v1
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

  -- FIX: origin_type (era origin_module)
  SELECT id INTO v_entry_id
  FROM public.financial_entries
  WHERE company_id = v_company_id
    AND type = 'receivable'
    AND origin_type = 'sales_order'
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

  -- FIX: origin_type (era origin_module)
  INSERT INTO public.financial_entries (
    company_id,
    type,
    origin_type,
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

-- ============================================================================
-- 4. DELETE functions also use origin_module — fix them too
-- ============================================================================

-- 4a. Purchase Order Delete
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

  -- FIX: origin_type (era origin_module)
  DELETE FROM public.financial_entries
  WHERE company_id = v_company_id
    AND type = 'payable'
    AND origin_type = 'purchase_order'
    AND origin_id = p_legacy_id;

  DELETE FROM public.ops_purchase_orders
  WHERE company_id = v_company_id
    AND legacy_id = p_legacy_id;
END;
$$;

-- 4b. Loading Delete
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
    -- FIX: origin_type (era origin_module)
    DELETE FROM public.financial_entries
    WHERE company_id = v_company_id
      AND type = 'payable'
      AND origin_type = 'freight'
      AND origin_id = v_loading_origin;
  END IF;

  IF v_sales_origin IS NOT NULL THEN
    PERFORM public.rpc_ops_sales_rebuild_financial_v1(v_sales_origin);
  END IF;
END;
$$;

-- 4c. Sales Order Delete
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
    -- FIX: origin_type (era origin_module)
    DELETE FROM public.financial_entries
    WHERE company_id = v_company_id
      AND type = 'receivable'
      AND origin_type = 'sales_order'
      AND origin_id = v_sales_origin;
  END IF;

  DELETE FROM public.ops_sales_orders
  WHERE company_id = v_company_id
    AND (legacy_id = p_legacy_id OR id = p_legacy_id);
END;
$$;

-- ============================================================================
-- GRANTS (reiterar para garantir)
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.rpc_ops_purchase_rebuild_financial_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_loading_rebuild_freight_financial_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_sales_rebuild_financial_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_purchase_order_upsert_v2(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_loading_upsert_v2(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_sales_order_upsert_v2(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_purchase_order_delete_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_loading_delete_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_sales_order_delete_v1(UUID) TO authenticated;
