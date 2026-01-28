-- ============================================================================
-- FUNCTION PARA CRIAR NOVO USUÁRIO COM BCRYPT
-- ============================================================================

create or replace function create_user_with_bcrypt(
  p_first_name text,
  p_last_name text,
  p_cpf text,
  p_email text,
  p_phone text,
  p_password text,
  p_role text default 'Operador',
  p_permissions jsonb default '[]'::jsonb,
  p_active boolean default true,
  p_allow_recovery boolean default true
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_password_hash text;
begin
  -- Gerar hash bcrypt da senha
  v_password_hash := crypt(p_password, gen_salt('bf'));
  
  -- Inserir usuário
  insert into public.app_users (
    first_name,
    last_name,
    cpf,
    email,
    phone,
    password_hash,
    role,
    permissions,
    active,
    allow_recovery,
    created_at,
    updated_at
  ) values (
    p_first_name,
    p_last_name,
    p_cpf,
    p_email,
    p_phone,
    v_password_hash,
    p_role,
    p_permissions,
    p_active,
    p_allow_recovery,
    now(),
    now()
  )
  returning id into v_user_id;
  
  return jsonb_build_object(
    'success', true,
    'user_id', v_user_id
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'success', false,
      'error', 'Email ou CPF já cadastrado'
    );
  when others then
    return jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
end;
$$;

-- Garantir acesso
grant execute on function create_user_with_bcrypt(text, text, text, text, text, text, text, jsonb, boolean, boolean) to authenticated;
