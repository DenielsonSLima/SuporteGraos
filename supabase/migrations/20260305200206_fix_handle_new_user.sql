-- Corrige a função de trigger para evitar conflitos de constraint
-- de CHECK de role ('Operador' não é válido, apenas 'admin', 'manager', 'user')
-- e sincronizar corretamente os metadados.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.app_users (
    auth_user_id, 
    email, 
    first_name, 
    last_name, 
    company_id, 
    role, 
    cpf,
    permissions,
    active,
    allow_recovery,
    must_change_password
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', 'Novo'),
    COALESCE(new.raw_user_meta_data->>'last_name', 'Usuario'),
    COALESCE((new.raw_user_meta_data->>'company_id')::uuid, (SELECT id FROM public.companies LIMIT 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'user'),
    COALESCE(new.raw_user_meta_data->>'cpf', lpad(floor(random() * 100000000000)::text, 11, '0')),
    COALESCE((new.raw_user_meta_data->>'permissions')::jsonb, '[]'::jsonb),
    COALESCE((new.raw_user_meta_data->>'active')::boolean, true),
    COALESCE((new.raw_user_meta_data->>'allow_recovery')::boolean, true),
    COALESCE((new.raw_user_meta_data->>'must_change_password')::boolean, false)
  )
  ON CONFLICT (auth_user_id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    cpf = EXCLUDED.cpf,
    permissions = EXCLUDED.permissions,
    active = EXCLUDED.active,
    allow_recovery = EXCLUDED.allow_recovery,
    must_change_password = EXCLUDED.must_change_password;
    
  RETURN new;
END;
$function$;
