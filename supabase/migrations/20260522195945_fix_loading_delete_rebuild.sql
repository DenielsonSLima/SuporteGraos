-- ============================================================================
-- MIGRATION: 20260522195945_fix_loading_delete_rebuild.sql
-- Objetivo: Garantir que a exclusão de carregamentos dispare o rebuild 
--           correto do Pedido de Compra (Purchase Order), além do Pedido de Venda.
-- ============================================================================

SET search_path = public;

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
  v_purchase_origin UUID;
BEGIN
  v_company_id := public.fn_ops_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  -- Capturar os IDs de origem para rebuild
  SELECT 
    COALESCE(l.legacy_id, l.id), 
    COALESCE(s.legacy_id, s.id),
    COALESCE(p.legacy_id, p.id)
  INTO v_loading_origin, v_sales_origin, v_purchase_origin
  FROM public.ops_loadings l
  LEFT JOIN public.ops_sales_orders s ON s.id = l.sales_order_id
  LEFT JOIN public.ops_purchase_orders p ON p.id = l.purchase_order_id
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

  -- F. Rebuild da Compra (Garantir que a dívida gerada seja atualizada/removida)
  IF v_purchase_origin IS NOT NULL THEN
    PERFORM public.rpc_ops_purchase_rebuild_financial_v1(v_purchase_origin);
  END IF;
END;
$$;
