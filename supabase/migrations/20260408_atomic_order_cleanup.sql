-- ============================================================================
-- MIGRATION: 20260408_atomic_order_cleanup.sql
-- Objetivo: Garantir que a exclusão de pedidos e carregamentos remova 
--           automaticamente todas as transações financeiras e links de caixa.
-- ============================================================================

SET search_path = public;

-- 1. Redefinir rpc_ops_purchase_order_delete_v1 (Atomicidade Total)
CREATE OR REPLACE FUNCTION public.rpc_ops_purchase_order_delete_v1(
  p_legacy_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_loading_id UUID;
BEGIN
  v_company_id := public.fn_ops_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  -- A. Deletar Carregamentos Vinculados (Limpeza recursiva)
  FOR v_loading_id IN 
    SELECT id FROM public.ops_loadings 
    WHERE (purchase_order_id = p_legacy_id OR purchase_order_id IN (SELECT id FROM public.ops_purchase_orders WHERE legacy_id = p_legacy_id))
  LOOP
    PERFORM public.rpc_ops_loading_delete_v1(v_loading_id);
  END LOOP;

  -- B. Deletar Transações Financeiras Vinculadas (Via Links)
  -- Deletar a transação ativa trg_financial_transactions_update_account_balance que restaura o saldo do banco
  DELETE FROM public.financial_transactions
  WHERE id IN (
    SELECT transaction_id FROM public.financial_links 
    WHERE (purchase_order_id = p_legacy_id OR purchase_order_id IN (SELECT id FROM public.ops_purchase_orders WHERE legacy_id = p_legacy_id))
  );

  -- C. Deletar Links Órfãos (caso existam)
  DELETE FROM public.financial_links
  WHERE (purchase_order_id = p_legacy_id OR purchase_order_id IN (SELECT id FROM public.ops_purchase_orders WHERE legacy_id = p_legacy_id));

  -- D. Deletar Entradas Financeiras (Debitos/Titulos)
  DELETE FROM public.financial_entries
  WHERE company_id = v_company_id
    AND type = 'payable'
    AND origin_type = 'purchase_order'
    AND origin_id = p_legacy_id;

  -- E. Deletar o Pedido Próprio
  DELETE FROM public.ops_purchase_orders
  WHERE company_id = v_company_id
    AND (id = p_legacy_id OR legacy_id = p_legacy_id);
END;
$$;

-- 2. Redefinir rpc_ops_sales_order_delete_v1 (Atomicidade Total)
CREATE OR REPLACE FUNCTION public.rpc_ops_sales_order_delete_v1(
  p_legacy_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_loading_id UUID;
BEGIN
  v_company_id := public.fn_ops_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  -- A. Deletar Carregamentos Vinculados
  FOR v_loading_id IN 
    SELECT id FROM public.ops_loadings 
    WHERE (sales_order_id = p_legacy_id OR sales_order_id IN (SELECT id FROM public.ops_sales_orders WHERE legacy_id = p_legacy_id))
  LOOP
    PERFORM public.rpc_ops_loading_delete_v1(v_loading_id);
  END LOOP;

  -- B. Deletar Transações Financeiras Vinculadas (Via Links)
  DELETE FROM public.financial_transactions
  WHERE id IN (
    SELECT transaction_id FROM public.financial_links 
    WHERE (sales_order_id = p_legacy_id OR sales_order_id IN (SELECT id FROM public.ops_sales_orders WHERE legacy_id = p_legacy_id))
  );

  -- C. Deletar Links Órfãos
  DELETE FROM public.financial_links
  WHERE (sales_order_id = p_legacy_id OR sales_order_id IN (SELECT id FROM public.ops_sales_orders WHERE legacy_id = p_legacy_id));

  -- D. Deletar Entradas Financeiras
  DELETE FROM public.financial_entries
  WHERE company_id = v_company_id
    AND type = 'receivable'
    AND origin_type = 'sales_order'
    AND origin_id = p_legacy_id;

  -- E. Deletar o Pedido
  DELETE FROM public.ops_sales_orders
  WHERE company_id = v_company_id
    AND (id = p_legacy_id OR legacy_id = p_legacy_id);
END;
$$;

-- 3. Redefinir rpc_ops_loading_delete_v1 (Atomicidade Total)
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

  -- Capturar os IDs de origem para rebuild
  SELECT COALESCE(l.legacy_id, l.id), COALESCE(s.legacy_id, s.id)
    INTO v_loading_origin, v_sales_origin
  FROM public.ops_loadings l
  LEFT JOIN public.ops_sales_orders s ON s.id = l.sales_order_id
  WHERE l.company_id = v_company_id
    AND (l.legacy_id = p_legacy_id OR l.id = p_legacy_id)
  LIMIT 1;

  -- A. Deletar Transações Financeiras (Fretes e Despesas) vinculadas a este romaneio
  DELETE FROM public.financial_transactions
  WHERE id IN (
    SELECT transaction_id FROM public.financial_links 
    WHERE (loading_id = p_legacy_id OR loading_id = v_loading_origin)
  );

  -- B. Deletar Links Órfãos do romaneio
  DELETE FROM public.financial_links
  WHERE (loading_id = p_legacy_id OR loading_id = v_loading_origin);

  -- C. Deletar o Romaneio
  DELETE FROM public.ops_loadings
  WHERE company_id = v_company_id
    AND (legacy_id = p_legacy_id OR id = p_legacy_id);

  -- D. Deletar Entradas Financeiras de Frete
  IF v_loading_origin IS NOT NULL THEN
    DELETE FROM public.financial_entries
    WHERE company_id = v_company_id
      AND type = 'payable'
      AND origin_type = 'freight'
      AND origin_id = v_loading_origin;
  END IF;

  -- E. Rebuild da Venda (se necessário, para atualizar o total faturado)
  IF v_sales_origin IS NOT NULL THEN
    PERFORM public.rpc_ops_sales_rebuild_financial_v1(v_sales_origin);
  END IF;
END;
$$;

-- Reiterar permissões
GRANT EXECUTE ON FUNCTION public.rpc_ops_purchase_order_delete_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_sales_order_delete_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_loading_delete_v1(UUID) TO authenticated;
