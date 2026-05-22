-- ============================================================================
-- MIGRATION: 20260522202000_fix_purchase_rebuild_zero_loadings.sql
-- Objetivo: Corrigir rebuild financeiro de Pedidos de Compra para recalcular
--           corretamente o valor para baixo quando cargas são deletadas.
-- ============================================================================

SET search_path = public;

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
  v_contract_total NUMERIC(15,2);
  v_paid_amount NUMERIC(15,2);
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

  -- 2. Calcular o Valor Original do Contrato (Itens)
  SELECT COALESCE(SUM(total_value), 0) INTO v_contract_total
  FROM public.ops_purchase_order_items
  WHERE purchase_order_id = v_order.id;

  -- Fallback para metadados/payload caso não existam linhas na tabela de itens
  IF v_contract_total = 0 AND v_order.raw_payload IS NOT NULL THEN
    v_contract_total := COALESCE(
      NULLIF(v_order.raw_payload->>'totalValue', '')::NUMERIC,
      NULLIF(v_order.metadata->>'totalValue', '')::NUMERIC,
      0
    );
  END IF;

  -- 3. Calcular a Soma das Cargas Ativas (Não canceladas)
  SELECT COALESCE(SUM(total_purchase_value), 0) INTO v_loading_total
  FROM public.ops_loadings
  WHERE purchase_order_id = v_order.id
    AND status NOT IN ('canceled', 'cancelled');

  -- O valor real a considerar é o maior entre o contrato e o que foi carregado
  v_total := GREATEST(v_contract_total, v_loading_total);
  v_due_date := COALESCE(v_order.order_date, CURRENT_DATE) + INTERVAL '30 days';

  -- 4. Localizar Título Financeiro Existente (Apenas usando origin_type, pois origin_module não existe)
  SELECT id, COALESCE(paid_amount, 0) INTO v_entry_id, v_paid_amount
  FROM public.financial_entries
  WHERE company_id = v_company_id
    AND type = 'payable'
    AND origin_type = 'purchase_order' 
    AND origin_id = COALESCE(v_order.legacy_id, v_order.id)
  LIMIT 1;

  -- 5. Tratamento de Valores Zerados ou Negativos
  IF v_total <= 0 THEN
    IF v_entry_id IS NOT NULL THEN
      -- Se não houver pagamentos efetuados, deletamos o título financeiro para limpar registros fantasmas
      IF ABS(v_paid_amount) <= 0.01 THEN
        DELETE FROM public.financial_entries WHERE id = v_entry_id;
        v_entry_id := NULL;
      ELSE
        -- Se já houver pagamentos, ajustamos o total para o valor pago
        UPDATE public.financial_entries SET
          total_amount = ABS(v_paid_amount),
          status = 'paid',
          updated_at = now()
        WHERE id = v_entry_id;
      END IF;
    END IF;
  ELSE
    -- Se houver valor positivo, insere ou atualiza o título financeiro
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
        origin_id,
        description,
        total_amount,
        due_date,
        partner_id
      ) VALUES (
        v_company_id,
        'payable',
        'purchase_order',
        COALESCE(v_order.legacy_id, v_order.id),
        CONCAT('Pedido de Compra ', v_order.number),
        v_total,
        v_due_date,
        v_order.partner_id
      ) RETURNING id INTO v_entry_id;
    END IF;
  END IF;

  -- 6. Sincronizar o total_value no Pedido para consistência de UI (Sempre atualiza)
  UPDATE public.ops_purchase_orders 
  SET total_value = v_total, 
      balance_value = GREATEST(v_total - COALESCE(paid_value, 0), 0)
  WHERE id = v_order.id;

  RETURN v_entry_id;
END;
$$;
