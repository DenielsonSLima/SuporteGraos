-- ============================================================================
-- FASE 2 (Compra): RPC canônica com itens/despesas/comissão + rebuild financeiro
-- Data: 2026-02-22
-- Objetivo:
--   - Evoluir upsert canônico de compra para persistir filhos
--   - Sincronizar financial_entries no SQL (frontend apenas exibe)
--   - Manter compatibilidade com legado (origin_id = id do pedido legado)
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

  SELECT id INTO v_entry_id
  FROM public.financial_entries
  WHERE company_id = v_company_id
    AND type = 'payable'
    AND origin_module = 'purchase_order'
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
    'purchase_order',
    COALESCE(v_order.legacy_id, v_order.id),
    CONCAT('Pedido de Compra ', v_order.number),
    v_total,
    v_due_date
  ) RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_ops_purchase_order_upsert_v2(
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
  v_has_broker BOOLEAN;
  v_commission_per_sc NUMERIC(15,4);
  v_total_from_items NUMERIC(15,2);
BEGIN
  v_company_id := public.fn_ops_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  v_order_date := COALESCE(NULLIF(p_payload->>'date', '')::DATE, CURRENT_DATE);
  v_legacy_id := NULLIF(p_payload->>'id', '')::UUID;

  SELECT id INTO v_id
  FROM public.ops_purchase_orders
  WHERE company_id = v_company_id
    AND legacy_id = v_legacy_id
  LIMIT 1;

  IF v_id IS NULL THEN
    v_id := COALESCE(v_legacy_id, gen_random_uuid());
  END IF;

  SELECT COALESCE(SUM(COALESCE((i->>'total')::NUMERIC, 0)), 0)
    INTO v_total_from_items
  FROM jsonb_array_elements(COALESCE(p_payload->'items', '[]'::jsonb)) i;

  INSERT INTO public.ops_purchase_orders (
    id, company_id, legacy_id, number, order_date, status,
    partner_id, partner_name, total_value, paid_value, metadata, raw_payload
  ) VALUES (
    v_id,
    v_company_id,
    v_legacy_id,
    COALESCE(NULLIF(p_payload->>'number', ''), 'SEM-NUMERO'),
    v_order_date,
    COALESCE(NULLIF(p_payload->>'status', ''), 'pending'),
    NULLIF(p_payload->>'partnerId', '')::UUID,
    NULLIF(p_payload->>'partnerName', ''),
    COALESCE(NULLIF(p_payload->>'totalValue', '')::NUMERIC, v_total_from_items, 0),
    COALESCE(NULLIF(p_payload->>'paidValue', '')::NUMERIC, 0),
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

  DELETE FROM public.ops_purchase_order_items
  WHERE company_id = v_company_id
    AND purchase_order_id = v_id;

  INSERT INTO public.ops_purchase_order_items (
    company_id,
    purchase_order_id,
    legacy_id,
    product_name,
    quantity,
    unit,
    unit_price,
    total_value,
    metadata
  )
  SELECT
    v_company_id,
    v_id,
    NULLIF(i->>'id', '')::UUID,
    COALESCE(NULLIF(i->>'productName', ''), 'Produto'),
    COALESCE(NULLIF(i->>'quantity', '')::NUMERIC, 0),
    COALESCE(NULLIF(i->>'unit', ''), 'SC'),
    COALESCE(NULLIF(i->>'unitPrice', '')::NUMERIC, 0),
    COALESCE(NULLIF(i->>'total', '')::NUMERIC, 0),
    i
  FROM jsonb_array_elements(COALESCE(p_payload->'items', '[]'::jsonb)) i;

  DELETE FROM public.ops_purchase_order_expenses
  WHERE company_id = v_company_id
    AND purchase_order_id = v_id;

  INSERT INTO public.ops_purchase_order_expenses (
    company_id,
    purchase_order_id,
    legacy_id,
    description,
    amount,
    expense_date,
    deductible,
    deduct_target,
    metadata
  )
  SELECT
    v_company_id,
    v_id,
    NULLIF(t->>'id', '')::UUID,
    COALESCE(NULLIF(t->>'notes', ''), 'Despesa'),
    COALESCE(NULLIF(t->>'value', '')::NUMERIC, 0),
    COALESCE(NULLIF(t->>'date', '')::DATE, v_order_date),
    COALESCE(NULLIF(t->>'deductFromPartner', '')::BOOLEAN, false),
    CASE
      WHEN COALESCE(NULLIF(t->>'deductFromPartner', '')::BOOLEAN, false) THEN 'supplier'
      ELSE 'none'
    END,
    t
  FROM jsonb_array_elements(COALESCE(p_payload->'transactions', '[]'::jsonb)) t
  WHERE lower(COALESCE(t->>'type', '')) = 'expense';

  DELETE FROM public.ops_purchase_order_commissions
  WHERE company_id = v_company_id
    AND purchase_order_id = v_id;

  v_has_broker := COALESCE(NULLIF(p_payload->>'hasBroker', '')::BOOLEAN, false);
  v_commission_per_sc := COALESCE(NULLIF(p_payload->>'brokerCommissionPerSc', '')::NUMERIC, 0);

  IF v_has_broker OR v_commission_per_sc > 0 THEN
    INSERT INTO public.ops_purchase_order_commissions (
      company_id,
      purchase_order_id,
      legacy_id,
      broker_id,
      broker_name,
      commission_per_sc,
      deductible,
      deduct_target,
      metadata
    ) VALUES (
      v_company_id,
      v_id,
      NULL,
      NULLIF(p_payload->>'brokerId', '')::UUID,
      NULLIF(p_payload->>'brokerName', ''),
      v_commission_per_sc,
      COALESCE(NULLIF(p_payload->>'deductBrokerCommission', '')::BOOLEAN, false),
      CASE
        WHEN COALESCE(NULLIF(p_payload->>'deductBrokerCommission', '')::BOOLEAN, false) THEN 'supplier'
        ELSE 'none'
      END,
      p_payload
    );
  END IF;

  PERFORM public.rpc_ops_purchase_rebuild_financial_v1(COALESCE(v_legacy_id, v_id));

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

  DELETE FROM public.financial_entries
  WHERE company_id = v_company_id
    AND type = 'payable'
    AND origin_module = 'purchase_order'
    AND origin_id = p_legacy_id;

  DELETE FROM public.ops_purchase_orders
  WHERE company_id = v_company_id
    AND legacy_id = p_legacy_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_ops_purchase_rebuild_financial_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_purchase_order_upsert_v2(JSONB) TO authenticated;
