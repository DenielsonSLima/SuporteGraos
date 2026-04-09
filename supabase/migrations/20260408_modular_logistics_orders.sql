-- ============================================================================
-- Migration: Logistics & Order Financial Transitions (SQL-First)
-- Data: 2024-04-08
-- ============================================================================

SET search_path = public;

-- 1. RPC para gerenciar despesas extras de carregamento (Adicionais/Deduções)
-- Garante que o total do carregamento e o total do Payable/Receivable estejam síncronos.
CREATE OR REPLACE FUNCTION public.rpc_ops_loading_manage_expense(
  p_loading_id UUID,
  p_description TEXT,
  p_amount NUMERIC,
  p_type TEXT, -- 'addition' | 'deduction'
  p_date DATE,
  p_account_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_loading RECORD;
  v_entry RECORD;
  v_new_expense JSONB;
  v_tx_id UUID;
BEGIN
  -- 1. Validações
  IF p_type NOT IN ('addition', 'deduction') THEN
    RAISE EXCEPTION 'Tipo de despesa inválido. Use addition ou deduction.';
  END IF;

  SELECT * INTO v_loading FROM ops_loadings WHERE id = p_loading_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carregamento não encontrado: %', p_loading_id;
  END IF;

  -- 2. Atualizar o JSONB de extra_expenses no carregamento
  v_new_expense := jsonb_build_object(
    'id', substring(md5(random()::text) from 1 for 8),
    'description', p_description,
    'value', p_amount,
    'type', p_type,
    'date', p_date
  );

  UPDATE ops_loadings 
  SET extra_expenses = COALESCE(extra_expenses, '[]'::jsonb) || v_new_expense,
      updated_at = now()
  WHERE id = p_loading_id;

  -- 3. Sincronizar com a financial_entry (Payable de Frete)
  -- Buscamos pelo origin_id e origin_type = 'freight' ou 'loading'
  SELECT * INTO v_entry FROM financial_entries 
  WHERE origin_id = p_loading_id AND origin_type IN ('freight', 'loading');

  IF FOUND THEN
    -- Se for adição, o total_amount SOBE. Se for dedução, o total_amount DESCE.
    UPDATE financial_entries
    SET total_amount = CASE 
        WHEN p_type = 'addition' THEN total_amount + p_amount
        ELSE GREATEST(total_amount - p_amount, 0)
      END,
      updated_at = now()
    WHERE id = v_entry.id;
  END IF;

  -- 4. Opcional: Registrar pagamento imediato se account_id for provido
  IF p_account_id IS NOT NULL AND p_amount > 0 THEN
    -- Usamos o RPC atômico existente para processar a baixa
    PERFORM public.rpc_ops_financial_process_action(
      v_entry.id,
      p_account_id,
      p_amount,
      0, -- sem desconto extra aqui
      'Pagamento imediato de ' || p_description,
      p_date,
      p_metadata
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'loading_id', p_loading_id,
    'entry_id', COALESCE(v_entry.id, NULL)
  );
END;
$$;

-- 2. RPC para cancelamento atômico de pedidos (Compra/Venda)
-- Garante que o pedido e o financeiro morram juntos.
CREATE OR REPLACE FUNCTION public.rpc_ops_order_cancel(
  p_order_id UUID,
  p_order_type TEXT, -- 'purchase' | 'sales'
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_name TEXT;
  v_entry_type TEXT;
BEGIN
  -- 1. Determinar tabelas
  IF p_order_type = 'purchase' THEN
    v_table_name := 'ops_purchase_orders';
    v_entry_type := 'purchase_order';
  ELSIF p_order_type = 'sales' THEN
    v_table_name := 'ops_sales_orders';
    v_entry_type := 'sales_order';
  ELSE
    RAISE EXCEPTION 'Tipo de pedido inválido.';
  END IF;

  -- 2. Cancelar o Pedido
  EXECUTE format('UPDATE %I SET status = %L, updated_at = now() WHERE id = %L', 
    v_table_name, 'cancelled', p_order_id);

  -- 3. Cancelar a Financial Entry vinculada
  UPDATE financial_entries
  SET status = 'cancelled',
      notes = COALESCE(notes, '') || ' | Pedido cancelado: ' || COALESCE(p_reason, 'Sem motivo informado'),
      updated_at = now()
  WHERE origin_id = p_order_id AND origin_type = v_entry_type;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', 'cancelled'
  );
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.rpc_ops_loading_manage_expense(UUID, TEXT, NUMERIC, TEXT, DATE, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_order_cancel(UUID, TEXT, TEXT) TO authenticated;
