-- ============================================================================
-- 📊 MIGRATION: SQL-First KPIs for Assets (Patrimônio)
-- Data: 2026-04-09
-- Objetivo: Migrar cálculos de performance de ativos do frontend para o banco.
-- ============================================================================

-- 1. RPC: Resumo Geral do Módulo de Ativos
CREATE OR REPLACE FUNCTION public.rpc_asset_summary(p_company_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_fixed_value NUMERIC(15,2) := 0;
  v_total_sold_open NUMERIC(15,2) := 0;
  v_total_pending_receipt NUMERIC(15,2) := 0;
  v_active_count INTEGER := 0;
  v_sold_count INTEGER := 0;
  result JSON;
BEGIN
  -- A) Bens Ativos
  SELECT 
    COALESCE(SUM(acquisition_value), 0),
    COUNT(*)
  INTO v_total_fixed_value, v_active_count
  FROM public.assets
  WHERE company_id = p_company_id AND status = 'active';

  -- B) Bens Vendidos com Pendência Financeira
  -- Consideramos bens com status 'sold' que possuam admin_expenses vinculados e não pagos
  SELECT 
    COALESCE(SUM(a.sale_value), 0),
    COUNT(DISTINCT a.id)
  INTO v_total_sold_open, v_sold_count
  FROM public.assets a
  INNER JOIN public.admin_expenses ae ON ae.asset_id = a.id
  WHERE a.company_id = p_company_id 
    AND a.status = 'sold'
    AND ae.status NOT IN ('paid', 'received', 'cancelled', 'canceled');

  -- C) Total Pendente de Recebimento (Financeiro Puro)
  SELECT 
    COALESCE(SUM(original_value - paid_value - discount_value), 0)
  INTO v_total_pending_receipt
  FROM public.admin_expenses
  WHERE company_id = p_company_id
    AND asset_id IS NOT NULL
    AND status NOT IN ('paid', 'received', 'cancelled', 'canceled');

  SELECT json_build_object(
    'totalFixedValue', v_total_fixed_value,
    'totalSoldOpen', v_total_sold_open,
    'totalPendingReceipt', v_total_pending_receipt,
    'activeCount', v_active_count,
    'soldCount', v_sold_count
  ) INTO result;

  RETURN result;
END;
$$;

-- 2. RPC: Estatísticas Detalhadas de um Ativo Específico
CREATE OR REPLACE FUNCTION public.rpc_asset_detail_stats(p_asset_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_value NUMERIC(15,2) := 0;
  v_total_received NUMERIC(15,2) := 0;
  v_total_pending NUMERIC(15,2) := 0;
  v_progress NUMERIC(5,2) := 0;
  result JSON;
BEGIN
  -- Obter valor de venda
  SELECT COALESCE(sale_value, 0) INTO v_sale_value 
  FROM public.assets 
  WHERE id = p_asset_id;

  -- Obter total recebido (via admin_expenses vinculado)
  SELECT COALESCE(SUM(paid_value), 0) INTO v_total_received
  FROM public.admin_expenses
  WHERE asset_id = p_asset_id;

  v_total_pending := GREATEST(0, v_sale_value - v_total_received);
  
  IF v_sale_value > 0 THEN
    v_progress := (v_total_received / v_sale_value) * 100;
  END IF;

  SELECT json_build_object(
    'totalSold', v_sale_value,
    'totalReceived', v_total_received,
    'totalPending', v_total_pending,
    'progress', v_progress
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_asset_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_asset_detail_stats(UUID) TO authenticated;

COMMENT ON FUNCTION public.rpc_asset_summary IS 'Retorna indicadores globais de patrimônio para uma empresa.';
COMMENT ON FUNCTION public.rpc_asset_detail_stats IS 'Retorna estatísticas financeiras de recebimento para um ativo vendido específico.';
