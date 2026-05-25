-- ============================================================================
-- MIGRATION: 20260525194600_fix_abc_and_dre_reports_columns.sql
-- Objetivo: Corrigir erros de colunas e tabelas inexistentes nas funções de relatório
--           1. rpc_get_abc_report: Substituir "public.partners" por "public.parceiros_parceiros"
--              e resolver colunas de endereço e nome de parceiro.
--           2. rpc_get_dre_report: Substituir "date" inexistente por "created_date".
--           3. rpc_get_freight_history_report: Obter o nome do transportador diretamente
--              de l.raw_payload ->> 'carrierName' para evitar erro de coluna inexistente (l.carrier_id)
--              e corrigir filtro de sub_type inexistente para origin_type = 'freight'.
-- ============================================================================

SET search_path = public;

-- 1. Redefinir rpc_get_abc_report
CREATE OR REPLACE FUNCTION public.rpc_get_abc_report(
  p_group_by TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_result JSON;
BEGIN
  -- 1. Identificar Empresa
  SELECT company_id INTO v_company_id 
  FROM public.app_users 
  WHERE auth_user_id = auth.uid() 
  LIMIT 1;
  
  IF v_company_id IS NULL THEN 
    RETURN json_build_array();
  END IF;

  -- 2. Agregação e Classificação ABC (Pareto)
  WITH raw_data AS (
    -- Busca faturamento por cliente/UF
    SELECT 
      CASE 
        WHEN p_group_by = 'customer' THEN p.name
        ELSE COALESCE(st.uf, 'N/D')
      END as label,
      SUM(fe.total_amount) as total_value
    FROM public.financial_entries fe
    LEFT JOIN public.parceiros_parceiros p ON fe.partner_id = p.id
    LEFT JOIN public.parceiros_enderecos pe ON pe.partner_id = p.id AND pe.is_primary = true
    LEFT JOIN public.cities c ON pe.city_id = c.id
    LEFT JOIN public.states st ON c.state_id = st.id
    WHERE fe.company_id = v_company_id 
      AND fe.type = 'receivable'
      AND fe.origin_type = 'sales_order'
      AND fe.status != 'cancelled'
      AND COALESCE(fe.created_date, fe.created_at::date) >= p_start_date
      AND COALESCE(fe.created_date, fe.created_at::date) <= p_end_date
    GROUP BY 1
  ),
  totals AS (
    -- Calcula o total geral para o percentual
    SELECT SUM(total_value) as grand_total FROM raw_data
  ),
  ranked AS (
    -- Ordena e calcula acumulado
    SELECT 
      r.label,
      r.total_value,
      (r.total_value / t.grand_total) * 100 as percent,
      SUM(r.total_value) OVER (ORDER BY r.total_value DESC) / t.grand_total * 100 as cumulative_percent,
      t.grand_total
    FROM raw_data r, totals t
    WHERE t.grand_total > 0
  ),
  classified AS (
    -- Atribui classes ABC
    SELECT 
      row_number() OVER (ORDER BY total_value DESC) as rank,
      label as name,
      total_value as total,
      percent,
      cumulative_percent as cumulative,
      CASE 
        WHEN cumulative_percent <= 80 THEN 'A'
        WHEN cumulative_percent <= 95 THEN 'B'
        ELSE 'C'
      END as class
    FROM ranked
  )
  SELECT json_agg(c) INTO v_result FROM classified c;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;


-- 2. Redefinir rpc_get_dre_report
CREATE OR REPLACE FUNCTION public.rpc_get_dre_report(
  p_start_date date,
  p_end_date date
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_revenue NUMERIC := 0;
  v_grain_cost NUMERIC := 0;
  v_freight_cost NUMERIC := 0;
  v_commission_cost NUMERIC := 0;
  v_fixed_expense_total NUMERIC := 0;
  v_admin_expense_total NUMERIC := 0;
  v_other_expense_total NUMERIC := 0;
  v_expense_categories JSONB;
BEGIN
  -- 1. Identificar Empresa
  SELECT company_id INTO v_company_id 
  FROM public.app_users 
  WHERE auth_user_id = auth.uid() 
  LIMIT 1;
  
  IF v_company_id IS NULL THEN 
    RETURN json_build_object('error', 'Company not found');
  END IF;

  -- 2. Receita Bruta (Vendas)
  SELECT COALESCE(SUM(total_amount), 0) INTO v_revenue
  FROM public.financial_entries
  WHERE company_id = v_company_id 
    AND type = 'receivable' 
    AND origin_type = 'sales_order'
    AND status != 'cancelled'
    AND COALESCE(created_date, created_at::date) >= p_start_date
    AND COALESCE(created_date, created_at::date) <= p_end_date;

  -- 3. Custos Variáveis (Grãos, Fretes, Comissões)
  SELECT 
    COALESCE(SUM(CASE WHEN origin_type = 'purchase_order' THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN origin_type = 'freight'        THEN total_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN origin_type = 'commission'     THEN total_amount ELSE 0 END), 0)
  INTO v_grain_cost, v_freight_cost, v_commission_cost
  FROM public.financial_entries
  WHERE company_id = v_company_id 
    AND type = 'payable'
    AND origin_type IN ('purchase_order', 'freight', 'commission')
    AND status != 'cancelled'
    AND COALESCE(created_date, created_at::date) >= p_start_date
    AND COALESCE(created_date, created_at::date) <= p_end_date;

  -- 4. Detalhamento de Despesas por Categoria (Hierárquico)
  WITH category_totals AS (
    SELECT 
      cat.name as category_name,
      cat.type as category_type,
      SUM(fe.total_amount) as total_value
    FROM public.financial_entries fe
    JOIN public.admin_expenses ae ON fe.origin_id = ae.id
    JOIN public.expense_categories cat ON ae.category_id = cat.id
    WHERE fe.company_id = v_company_id 
      AND fe.origin_type = 'expense'
      AND fe.status != 'cancelled'
      AND COALESCE(fe.created_date, fe.created_at::date) >= p_start_date
      AND COALESCE(fe.created_date, fe.created_at::date) <= p_end_date
    GROUP BY cat.id, cat.name, cat.type
  )
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'name', category_name,
        'type', category_type,
        'value', total_value
      )
    ) INTO v_expense_categories
  FROM category_totals;

  -- 5. Totais de Despesas por Tipo (Para o DRE resumido)
  SELECT 
    COALESCE(SUM(CASE WHEN category_type = 'fixed'          THEN total_value ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category_type = 'administrative' THEN total_value ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category_type = 'custom'         THEN total_value ELSE 0 END), 0)
  INTO v_fixed_expense_total, v_admin_expense_total, v_other_expense_total
  FROM (
    SELECT 
      cat.type as category_type,
      fe.total_amount as total_value
    FROM public.financial_entries fe
    JOIN public.admin_expenses ae ON fe.origin_id = ae.id
    JOIN public.expense_categories cat ON ae.category_id = cat.id
    WHERE fe.company_id = v_company_id 
      AND fe.origin_type = 'expense'
      AND fe.status != 'cancelled'
      AND COALESCE(fe.created_date, fe.created_at::date) >= p_start_date
      AND COALESCE(fe.created_date, fe.created_at::date) <= p_end_date
  ) sub;

  -- 6. Retorno Consolidado
  RETURN json_build_object(
    'revenue', v_revenue,
    'grainCost', v_grain_cost,
    'freightCost', v_freight_cost,
    'commissionCost', v_commission_cost,
    'contributionMargin', v_revenue - (v_grain_cost + v_freight_cost + v_commission_cost),
    'fixedCosts', v_fixed_expense_total,
    'adminCosts', v_admin_expense_total,
    'otherCosts', v_other_expense_total,
    'totalExpenses', v_fixed_expense_total + v_admin_expense_total + v_other_expense_total,
    'netProfit', v_revenue - (v_grain_cost + v_freight_cost + v_commission_cost) - (v_fixed_expense_total + v_admin_expense_total + v_other_expense_total),
    'profitMargin', CASE WHEN v_revenue > 0 THEN ((v_revenue - (v_grain_cost + v_freight_cost + v_commission_cost + v_fixed_expense_total + v_admin_expense_total + v_other_expense_total)) / v_revenue) * 100 ELSE 0 END,
    'expenseCategories', COALESCE(v_expense_categories, '[]'::jsonb)
  );
END;
$$;


-- 3. Redefinir rpc_get_freight_history_report
CREATE OR REPLACE FUNCTION public.rpc_get_freight_history_report(
  p_start_date date,
  p_end_date date,
  p_carrier_name text DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_result JSON;
BEGIN
  -- 1. Identificar Empresa
  SELECT company_id INTO v_company_id 
  FROM public.app_users 
  WHERE auth_user_id = auth.uid() 
  LIMIT 1;
  
  IF v_company_id IS NULL THEN 
    RETURN json_build_object('rows', json_build_array(), 'summary', json_build_array());
  END IF;

  -- 2. Query Principal
  WITH raw_loadings AS (
    SELECT 
      l.loading_date as date,
      l.driver_name,
      l.vehicle_plate,
      l.weight_kg,
      l.unload_weight_kg,
      l.total_freight_value,
      COALESCE(l.raw_payload ->> 'carrierName', l.driver_name) as carrier_name,
      -- Cálculo de Pago (Soma dos financial_entries vinculados)
      COALESCE((
        SELECT SUM(paid_amount) 
        FROM public.financial_entries 
        WHERE origin_id = l.id 
          AND type = 'payable' 
          AND origin_type = 'freight'
          AND status != 'cancelled'
      ), 0) as freight_paid
    FROM public.ops_loadings l
    WHERE l.company_id = v_company_id
      AND l.loading_date >= p_start_date
      AND l.loading_date <= p_end_date
      AND l.status != 'canceled'
      AND (
        p_carrier_name IS NULL 
        OR p_carrier_name = '' 
        OR (l.raw_payload ->> 'carrierName') = p_carrier_name 
        OR l.driver_name = p_carrier_name
      )
  ),
  processed AS (
    SELECT 
      *,
      CASE WHEN unload_weight_kg > 0 THEN unload_weight_kg / 1000.0 ELSE weight_kg / 1000.0 END as weight_ton,
      CASE WHEN unload_weight_kg > 0 THEN 'Destino' ELSE 'Origem' END as weight_type,
      COALESCE(weight_kg - unload_weight_kg, 0) as breakage_kg,
      total_freight_value - freight_paid as balance
    FROM raw_loadings
  ),
  aggregated_rows AS (
      SELECT json_agg(p ORDER BY date DESC) as rows FROM processed p
  ),
  summary_stats AS (
      SELECT 
        SUM(weight_ton) as total_ton,
        SUM(total_freight_value) as total_value
      FROM processed
  )
  SELECT 
    json_build_object(
      'rows', COALESCE((SELECT rows FROM aggregated_rows), '[]'::json),
      'summary', json_build_array(
        json_build_object('label', 'Volume Total (Toneladas)', 'value', COALESCE((SELECT total_ton FROM summary_stats), 0), 'format', 'number'),
        json_build_object('label', 'Custo Logístico Total', 'value', COALESCE((SELECT total_value FROM summary_stats), 0), 'format', 'currency')
      )
    ) INTO v_result;

  RETURN v_result;
END;
$$;
