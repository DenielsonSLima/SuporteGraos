-- ============================================================================
-- FIX DEFINITIVO: Corrigir rebuild RPCs + schema + trigger
-- Data: 2026-02-23
-- Problemas corrigidos:
--   1. financial_entries.partner_id é NOT NULL, mas rebuild RPCs não enviam partner_id
--      e ops_loadings não tem partner_id (motorista ≠ parceiro)
--   2. Coluna 'description' não existe em financial_entries mas RPCs a referenciam
--   3. Trigger fn_update_entry_paid_amount usa 'pending' mas frontend espera 'open'
--      e usa cast ::financial_entry_status desnecessário (coluna é TEXT)
-- Solução:
--   - Tornar partner_id nullable
--   - Adicionar coluna description
--   - Corrigir trigger para usar 'open' (sem cast de enum)
--   - Corrigir rebuild RPCs com partner_id + description
-- ============================================================================

-- 1. Tornar partner_id nullable na financial_entries
ALTER TABLE public.financial_entries
  ALTER COLUMN partner_id DROP NOT NULL;

-- 2. Adicionar coluna description (TEXT, nullable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_entries' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.financial_entries ADD COLUMN description TEXT;
  END IF;
END $$;

-- 3. Corrigir trigger fn_update_entry_paid_amount: 'pending' → 'open', sem cast enum
CREATE OR REPLACE FUNCTION public.fn_update_entry_paid_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF COALESCE(NEW.entry_id, OLD.entry_id) IS NOT NULL THEN
    UPDATE public.financial_entries SET
      paid_amount = COALESCE((
        SELECT SUM(amount)
        FROM public.financial_transactions
        WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)
      ), 0),
      status = CASE
        WHEN COALESCE((
          SELECT SUM(amount)
          FROM public.financial_transactions
          WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)
        ), 0) >= total_amount THEN 'paid'
        WHEN COALESCE((
          SELECT SUM(amount)
          FROM public.financial_transactions
          WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id)
        ), 0) > 0 THEN 'partially_paid'
        ELSE 'open'
      END,
      updated_at = now()
    WHERE id = COALESCE(NEW.entry_id, OLD.entry_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2. PURCHASE ORDER: Usar partner_id do ops_purchase_orders
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
  v_total := COALESCE(v_order.total_value, 0);
  v_partner_id := v_order.partner_id;

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

-- 3. LOADING (Freight): Sem partner_id direto — usar purchase_order.partner_id se disponível
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
  v_partner_id UUID;
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

  -- Tentar pegar partner_id do motorista via raw_payload ou do pedido de compra associado
  v_partner_id := NULL;
  IF v_loading.purchase_order_id IS NOT NULL THEN
    SELECT partner_id INTO v_partner_id
    FROM public.ops_purchase_orders
    WHERE id = v_loading.purchase_order_id
    LIMIT 1;
  END IF;

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

  INSERT INTO public.financial_entries (
    company_id, type, origin_type, origin_id,
    partner_id, description, total_amount, due_date
  ) VALUES (
    v_company_id, 'payable', 'freight', v_origin_id,
    v_partner_id,
    CONCAT('Frete do carregamento ', COALESCE(v_loading.vehicle_plate, 'SEM-PLACA')),
    v_total, v_due_date
  ) RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;

-- 4. SALES ORDER: Usar customer_id como partner_id
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
    AND origin_type = 'sales_order'
    AND origin_id = v_origin_id
  LIMIT 1;

  IF v_total <= 0 THEN
    IF v_entry_id IS NOT NULL THEN
      UPDATE public.financial_entries
      SET total_amount = 0,
          description = CONCAT('Venda ', v_sale.number),
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

-- 5. Corrigir apply_discount_financial_entry: remover casts ::financial_entry_status
CREATE OR REPLACE FUNCTION public.apply_discount_financial_entry(p_entry_id UUID, p_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry RECORD;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Desconto deve ser maior que zero';
  END IF;

  SELECT id, total_amount, paid_amount
  INTO v_entry
  FROM public.financial_entries
  WHERE id = p_entry_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lançamento financeiro não encontrado: %', p_entry_id;
  END IF;

  -- Reduzir total_amount (remaining_amount = total_amount - paid_amount é GENERATED)
  UPDATE public.financial_entries
  SET total_amount = GREATEST(total_amount - p_amount, 0),
      status = CASE
        WHEN paid_amount >= GREATEST(total_amount - p_amount, 0) AND paid_amount > 0 THEN 'paid'
        WHEN paid_amount > 0 THEN 'partially_paid'
        ELSE status
      END,
      updated_at = now()
  WHERE id = p_entry_id;
END;
$$;

-- 6. GRANTs
GRANT EXECUTE ON FUNCTION public.rpc_ops_purchase_rebuild_financial_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_loading_rebuild_freight_financial_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_sales_rebuild_financial_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_discount_financial_entry(UUID, NUMERIC) TO authenticated;
