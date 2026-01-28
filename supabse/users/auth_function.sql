-- ============================================================================
-- FUNCTION DE AUTENTICAÇÃO NO SERVIDOR (Supabase)
-- Executa bcrypt.compare() no PostgreSQL, não no browser
-- ============================================================================

-- Function: Autenticar usuário com bcrypt no servidor
create or replace function authenticate_user(
  p_email text,
  p_password text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user record;
  v_password_valid boolean;
begin
  -- Buscar usuário
  select * into v_user
  from public.app_users
  where email = p_email;

  -- Usuário não encontrado
  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Credenciais inválidas'
    );
  end if;

  -- Verificar se está bloqueado
  if v_user.account_locked_until is not null and v_user.account_locked_until > now() then
    return jsonb_build_object(
      'success', false,
      'error', 'Conta bloqueada. Tente novamente mais tarde.',
      'locked_until', v_user.account_locked_until
    );
  end if;

  -- Verificar se está ativo
  if not v_user.active then
    return jsonb_build_object(
      'success', false,
      'error', 'Usuário inativo. Contate o administrador.'
    );
  end if;

  -- Verificar senha usando crypt (bcrypt nativo do PostgreSQL)
  v_password_valid := v_user.password_hash = crypt(p_password, v_user.password_hash);

  if not v_password_valid then
    -- Incrementar tentativas falhadas
    update public.app_users
    set 
      failed_login_attempts = coalesce(failed_login_attempts, 0) + 1,
      last_failed_login = now(),
      account_locked_until = case 
        when coalesce(failed_login_attempts, 0) + 1 >= 5 
        then now() + interval '15 minutes'
        else null
      end
    where id = v_user.id;

    -- Registrar tentativa falhada
    insert into public.login_attempts (email, user_id, attempt_type, failure_reason)
    values (p_email, v_user.id, 'failed', 'Senha incorreta');

    return jsonb_build_object(
      'success', false,
      'error', 'Credenciais inválidas'
    );
  end if;

  -- Login bem-sucedido!
  update public.app_users
  set 
    failed_login_attempts = 0,
    last_failed_login = null,
    account_locked_until = null,
    last_login_at = now()
  where id = v_user.id;

  -- Registrar sucesso
  insert into public.login_attempts (email, user_id, attempt_type)
  values (p_email, v_user.id, 'success');

  -- Retornar dados do usuário (SEM A SENHA!)
  return jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'first_name', v_user.first_name,
      'last_name', v_user.last_name,
      'role', v_user.role,
      'permissions', v_user.permissions,
      'active', v_user.active
    )
  );
end;
$$;

-- Garantir que a function pode ser executada por qualquer um (para login)
grant execute on function authenticate_user(text, text) to anon, authenticated;
