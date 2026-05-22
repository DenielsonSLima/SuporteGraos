CREATE OR REPLACE FUNCTION public.rpc_get_advances_active_totals()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_company_id uuid;
    v_taken_total numeric := 0;
    v_given_total numeric := 0;
    v_count int := 0;
BEGIN
    -- Tenta obter via app_users (padrão principal)
    SELECT company_id INTO v_company_id 
    FROM public.app_users 
    WHERE auth_user_id = auth.uid() 
    LIMIT 1;

    -- Calcular totais apenas de adiantamentos principais ativos
    -- recipient_type = 'client' => Dinheiro Entrando (Taken)
    -- recipient_type != 'client' => Dinheiro Saindo (Given)
    SELECT 
        COALESCE(SUM(remaining_amount) FILTER (WHERE recipient_type = 'client'), 0),
        COALESCE(SUM(remaining_amount) FILTER (WHERE recipient_type != 'client'), 0),
        COUNT(*)
    INTO 
        v_taken_total, 
        v_given_total, 
        v_count
    FROM public.advances
    WHERE company_id = v_company_id
      AND parent_id IS NULL
      AND status IN ('open', 'partially_settled');

    RETURN json_build_object(
        'takenRemaining', v_taken_total,
        'givenRemaining', v_given_total,
        'netBalance', v_taken_total - v_given_total,
        'countActive', v_count
    );
END;
$function$;
