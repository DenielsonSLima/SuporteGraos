-- Fix: RPC rebuilds freight financial entry
-- Mudanças:
-- 1. Quando frete = 0, DELETA a entry existente ao invés de atualizar com zero
-- 2. Pega partner_id do carrierId no raw_payload (transportadora, não do PO)

CREATE OR REPLACE FUNCTION public.rpc_ops_loading_rebuild_freight_financial_v1(p_origin_id UUID)
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

  -- Pegar partner_id do raw_payload (carrierId = transportadora)
  v_partner_id := NULLIF(v_loading.raw_payload->>'carrierId', '')::UUID;
  IF v_partner_id IS NULL AND v_loading.purchase_order_id IS NOT NULL THEN
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

  -- Guard: se frete é zero, deleta a entry existente e NÃO cria nova
  IF v_total <= 0 THEN
    IF v_entry_id IS NOT NULL THEN
      DELETE FROM public.financial_entries WHERE id = v_entry_id;
    END IF;
    RETURN NULL;
  END IF;

  IF v_entry_id IS NOT NULL THEN
    UPDATE public.financial_entries
    SET total_amount = v_total,
        description = CONCAT('Frete do carregamento ', COALESCE(v_loading.vehicle_plate, 'SEM-PLACA')),
        due_date = v_due_date,
        partner_id = COALESCE(v_partner_id, partner_id),
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
