-- ============================================================================
-- FIX: Rebuild Financeiro de Compra considerando Cargas (Loadings)
-- Objetivo: Garantir que o Saldo Devedor reflita o que foi efetivamente carregado,
--          mesmo que o contrato inicial (itens) esteja com valor zero.
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
  v_loading_total NUMERIC(15,2);
BEGIN
  v_company_id := public.fn_ops_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  -- 1. Localizar o Pedido (Suporta ID ou Legacy_ID)
  SELECT * INTO v_order
  FROM public.ops_purchase_orders
  WHERE company_id = v_company_id
    AND (legacy_id = p_origin_id OR id = p_origin_id)
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido canônico não encontrado para rebuild financeiro (% )', p_origin_id;
  END IF;

  -- 2. Calcular o Valor Real da Dívida
  -- Prioridade 1: Soma das cargas (O que já foi carregado e gera dívida real)
  SELECT COALESCE(SUM(total_purchase_value), 0) INTO v_loading_total
  FROM public.ops_loadings
  WHERE purchase_order_id = v_order.id;

  -- Valor a considerar é o maior entre o total do pedido e o total carregado
  v_total := GREATEST(COALESCE(v_order.total_value, 0), v_loading_total);
  v_due_date := COALESCE(v_order.order_date, CURRENT_DATE) + INTERVAL '30 days';

  -- 3. Localizar ou Criar o Título Financeiro
  SELECT id INTO v_entry_id
  FROM public.financial_entries
  WHERE company_id = v_company_id
    AND type = 'payable'
    AND origin_type = 'purchase_order' 
    AND origin_id = COALESCE(v_order.legacy_id, v_order.id)
  LIMIT 1;

  -- Legado: pode estar como 'origin_module' em versões antigas
  IF v_entry_id IS NULL THEN
     SELECT id INTO v_entry_id
     FROM public.financial_entries
     WHERE company_id = v_company_id
       AND type = 'payable'
       AND origin_module = 'purchase_order'
       AND origin_id = COALESCE(v_order.legacy_id, v_order.id)
     LIMIT 1;
  END IF;

  IF v_entry_id IS NOT NULL THEN
    UPDATE public.financial_entries SET
      total_amount = v_total,
      description = CONCAT('Pedido de Compra ', v_order.number),
      due_date = v_due_date,
      updated_at = now()
    WHERE id = v_entry_id;
  ELSE
    INSERT INTO public.financial_entries (
      company_id,
      type,
      origin_type, 
      origin_module,
      origin_id,
      description,
      total_amount,
      due_date,
      partner_id
    ) VALUES (
      v_company_id,
      'payable',
      'purchase_order',
      'purchase_order',
      COALESCE(v_order.legacy_id, v_order.id),
      CONCAT('Pedido de Compra ', v_order.number),
      v_total,
      v_due_date,
      v_order.partner_id
    ) RETURNING id INTO v_entry_id;
  END IF;

  -- 4. Sincronizar de volta o total_value no Pedido para consistência de UI
  IF v_total > COALESCE(v_order.total_value, 0) THEN
    UPDATE public.ops_purchase_orders 
    SET total_value = v_total, 
        balance_value = GREATEST(v_total - COALESCE(paid_value, 0), 0)
    WHERE id = v_order.id;
  END IF;

  RETURN v_entry_id;
END;
$$;
