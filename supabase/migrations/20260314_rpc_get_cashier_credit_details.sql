-- ============================================================================
-- Migration: Specialized Cashier RPC - Part 5: Credit Details
-- Description: Calcula detalhadamente o card "CRÉDITOS RECEBIDOS NO MÊS"
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_get_cashier_credit_details(
  p_company_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  
  v_credits_received_details JSONB := '{}'::jsonb;
  v_revenue_distribution JSONB := '{}'::jsonb;
BEGIN
  v_start_date := COALESCE(p_start_date, date_trunc('month', CURRENT_DATE)::DATE);
  v_end_date := COALESCE(p_end_date, (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::DATE);

  -- 1. Distribuição de Créditos (Recebidos por Origem)
  SELECT json_build_object(
    'sales_order', COALESCE(SUM(CASE WHEN fe.origin_type = 'sales_order' THEN ft.amount ELSE 0 END), 0),
    'loan', COALESCE(SUM(CASE WHEN fe.origin_type = 'loan' THEN ft.amount ELSE 0 END), 0),
    'others', COALESCE(SUM(CASE WHEN fe.origin_type NOT IN ('sales_order', 'loan') THEN ft.amount ELSE 0 END), 0)
  )
  INTO v_credits_received_details
  FROM public.financial_transactions ft
  LEFT JOIN public.financial_entries fe ON ft.entry_id = fe.id
  WHERE ft.company_id = p_company_id
    AND ft.type = 'credit'
    AND ft.transaction_date >= v_start_date
    AND ft.transaction_date <= v_end_date;

  -- 2. Posição de Recebíveis Futurista
  SELECT json_build_object(
    'opening_receivables', COALESCE((
      SELECT SUM(GREATEST(fe.total_amount - fe.paid_amount, 0)) 
      FROM public.financial_entries fe
      WHERE fe.company_id = p_company_id 
        AND fe.type = 'receivable' 
        AND fe.created_date < v_start_date 
        AND fe.status NOT IN ('paid', 'received', 'cancelled', 'canceled')
    ), 0),
    'future_receivables', COALESCE((
      SELECT SUM(GREATEST(fe.total_amount - fe.paid_amount, 0)) 
      FROM public.financial_entries fe
      WHERE fe.company_id = p_company_id 
        AND fe.type = 'receivable' 
        AND fe.due_date > v_end_date 
        AND fe.status NOT IN ('paid', 'received', 'cancelled', 'canceled')
    ), 0)
  )
  INTO v_revenue_distribution;

  RETURN jsonb_build_object(
    'creditsReceivedDetails', v_credits_received_details,
    'revenueDistribution', v_revenue_distribution
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_cashier_credit_details(UUID, DATE, DATE) TO authenticated, anon;
