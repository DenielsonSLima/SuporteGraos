-- ============================================================================
-- FUNCTION PARA GERAR SENHA ALEATÓRIA E CRIAR USUÁRIO
-- ============================================================================

create or replace function generate_random_password()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  result text := '';
  i int;
begin
  for i in 1..12 loop
    result := result || substr(chars, (random() * length(chars))::int + 1, 1);
  end loop;
  return result;
end;
$$;

-- ============================================================================
-- FUNCTION ATUALIZADA PARA CRIAR USUÁRIO COM SENHA ALEATÓRIA
-- ============================================================================

create or replace function create_user_with_random_password(
  p_first_name text,
  p_last_name text,
  p_cpf text,
  p_email text,
  p_phone text,
  p_role text default 'Operador',
  p_permissions jsonb default '[]'::jsonb,
  p_active boolean default true,
  p_can_generate_tokens boolean default false
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_password text;
  v_password_hash text;
begin
  -- Gerar senha aleatória
  v_password := generate_random_password();
  v_password_hash := crypt(v_password, gen_salt('bf'));
  
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
    must_change_password,
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
    p_can_generate_tokens,
    true,
    now(),
    now()
  )
  returning id into v_user_id;
  
  return jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'generated_password', v_password
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

grant execute on function generate_random_password() to authenticated;
grant execute on function create_user_with_random_password(text, text, text, text, text, text, jsonb, boolean, boolean) to authenticated;
