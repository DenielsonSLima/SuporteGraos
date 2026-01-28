-- ============================================================================
-- FUNCTION PARA CRIAR USUÁRIO (com opção de senha automática ou manual)
-- ============================================================================

create or replace function create_user_flexible(
  p_first_name text,
  p_last_name text,
  p_cpf text,
  p_email text,
  p_phone text,
  p_password text,
  p_generate_password boolean default true,
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
  v_password_to_use text;
  v_password_hash text;
  v_generated_password text := null;
begin
  -- Se gerar automática, gerar senha. Se não, usar a fornecida
  if p_generate_password then
    v_password_to_use := substr(md5(random()::text || clock_timestamp()::text), 1, 12);
    v_generated_password := v_password_to_use;
  else
    v_password_to_use := p_password;
  end if;
  
  -- Gerar hash bcrypt
  v_password_hash := crypt(v_password_to_use, gen_salt('bf'));
  
  -- Inserir usuário
  insert into public.app_users (
    first_name, last_name, cpf, email, phone,
    password_hash, role, permissions, active, allow_recovery,
    must_change_password, created_at, updated_at
  ) values (
    p_first_name, p_last_name, p_cpf, p_email, p_phone,
    v_password_hash, p_role, p_permissions, p_active, p_can_generate_tokens,
    p_generate_password, now(), now()
  )
  returning id into v_user_id;
  
  return jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'generated_password', v_generated_password
  );
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error', 'Email ou CPF já cadastrado');
  when others then
    return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;

grant execute on function create_user_flexible(text, text, text, text, text, text, boolean, text, jsonb, boolean, boolean) to authenticated;
