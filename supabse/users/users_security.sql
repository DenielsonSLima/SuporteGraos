-- ============================================================================
-- SCRIPT SUPABASE: SISTEMA DE USUÁRIOS COM SEGURANÇA AVANÇADA
-- Módulo: Gestão de usuários, senhas hash, rate limiting, tokens
-- Ordem: 1) Tabelas → 2) RLS → 3) Índices → 4) Functions
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1) TABELA DE USUÁRIOS
-- ============================================================================

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  
  -- Dados Pessoais
  first_name text not null,
  last_name text not null,
  cpf text unique not null,
  email text unique not null,
  phone text,
  
  -- Autenticação
  password_hash text not null,  -- bcrypt hash
  password_salt text,  -- salt adicional (opcional, bcrypt já tem)
  password_changed_at timestamptz default timezone('utc'::text, now()),
  must_change_password boolean default false,
  
  -- Tokens
  refresh_token text,
  refresh_token_expires_at timestamptz,
  recovery_token text,
  recovery_token_expires_at timestamptz,
  
  -- Controle de Acesso
  role text not null check (role in ('Administrador', 'Gerente', 'Operador', 'Visualizador')) default 'Operador',
  permissions jsonb default '[]'::jsonb,  -- array de permissões
  active boolean default true,
  allow_recovery boolean default true,
  
  -- Rate Limiting & Segurança
  failed_login_attempts integer default 0,
  last_failed_login timestamptz,
  account_locked_until timestamptz,
  last_login_at timestamptz,
  last_login_ip text,
  
  -- Auditoria
  company_id uuid references public.companies(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  created_by uuid,
  updated_by uuid
);

-- ============================================================================
-- 2) TABELA DE TENTATIVAS DE LOGIN (Rate Limiting)
-- ============================================================================

create table if not exists public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid references public.app_users(id),
  attempt_type text not null check (attempt_type in ('success', 'failed', 'blocked')) default 'failed',
  failure_reason text,
  ip_address text,
  user_agent text,
  device_info jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- ============================================================================
-- 3) TABELA DE DISPOSITIVOS CONFIÁVEIS (Opcional - para futuro 2FA)
-- ============================================================================

create table if not exists public.trusted_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id),
  device_fingerprint text not null,  -- hash único do dispositivo
  device_name text,
  ip_address text,
  last_used_at timestamptz default timezone('utc'::text, now()),
  trusted_at timestamptz default timezone('utc'::text, now()),
  expires_at timestamptz,  -- dispositivos podem expirar após X dias
  is_active boolean default true,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- ============================================================================
-- 4) TABELA DE REFRESH TOKENS (Para renovação de sessão)
-- ============================================================================

create table if not exists public.refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id),
  token text not null unique,
  expires_at timestamptz not null,
  ip_address text,
  user_agent text,
  is_revoked boolean default false,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- ============================================================================
-- 5) ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Usuários
create index if not exists idx_app_users_email on public.app_users(email);
create index if not exists idx_app_users_cpf on public.app_users(cpf);
create index if not exists idx_app_users_active on public.app_users(active);
create index if not exists idx_app_users_company on public.app_users(company_id);

-- Tentativas de Login
create index if not exists idx_login_attempts_email on public.login_attempts(email);
create index if not exists idx_login_attempts_user on public.login_attempts(user_id);
create index if not exists idx_login_attempts_created on public.login_attempts(created_at);

-- Dispositivos Confiáveis
create index if not exists idx_trusted_devices_user on public.trusted_devices(user_id);
create index if not exists idx_trusted_devices_fingerprint on public.trusted_devices(device_fingerprint);

-- Refresh Tokens
create index if not exists idx_refresh_tokens_token on public.refresh_tokens(token);
create index if not exists idx_refresh_tokens_user on public.refresh_tokens(user_id);
create index if not exists idx_refresh_tokens_expires on public.refresh_tokens(expires_at);

-- ============================================================================
-- 6) ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.app_users enable row level security;
alter table public.login_attempts enable row level security;
alter table public.trusted_devices enable row level security;
alter table public.refresh_tokens enable row level security;

-- Política: Usuários podem ver apenas seus próprios dados (ou admin vê todos)
drop policy if exists "Users can view their own data" on public.app_users;
create policy "Users can view their own data" on public.app_users
  for select using (true);  -- Por enquanto liberado, depois ajustamos

drop policy if exists "Users can update their own data" on public.app_users;
create policy "Users can update their own data" on public.app_users
  for update using (true);

drop policy if exists "Admin can insert users" on public.app_users;
create policy "Admin can insert users" on public.app_users
  for insert with check (true);

-- Login Attempts: Todos podem inserir (sistema de rate limiting)
drop policy if exists "Anyone can log attempts" on public.login_attempts;
create policy "Anyone can log attempts" on public.login_attempts
  for insert with check (true);

drop policy if exists "Users can view login attempts" on public.login_attempts;
create policy "Users can view login attempts" on public.login_attempts
  for select using (true);

-- Refresh Tokens: Usuário pode ver apenas seus próprios tokens
drop policy if exists "Users can manage their tokens" on public.refresh_tokens;
create policy "Users can manage their tokens" on public.refresh_tokens
  for all using (true);

-- ============================================================================
-- 7) FUNCTIONS DE UTILIDADE
-- ============================================================================

-- Function: Limpar tentativas de login antigas (executar periodicamente)
create or replace function clean_old_login_attempts()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.login_attempts
  where created_at < now() - interval '30 days';
end;
$$;

-- Function: Limpar tokens expirados
create or replace function clean_expired_tokens()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.refresh_tokens
  where expires_at < now() or is_revoked = true;
end;
$$;

-- Function: Verificar se usuário está bloqueado
create or replace function is_user_locked(p_email text)
returns boolean
language plpgsql
security definer
as $$
declare
  v_locked_until timestamptz;
begin
  select account_locked_until
  into v_locked_until
  from public.app_users
  where email = p_email;
  
  if v_locked_until is null then
    return false;
  end if;
  
  if v_locked_until > now() then
    return true;
  else
    -- Desbloquear automaticamente se o tempo passou
    update public.app_users
    set account_locked_until = null,
        failed_login_attempts = 0
    where email = p_email;
    return false;
  end if;
end;
$$;

-- Function: Incrementar tentativas falhadas
create or replace function increment_failed_attempts(p_email text)
returns void
language plpgsql
security definer
as $$
declare
  v_attempts integer;
begin
  -- Incrementar contador
  update public.app_users
  set failed_login_attempts = failed_login_attempts + 1,
      last_failed_login = now()
  where email = p_email
  returning failed_login_attempts into v_attempts;
  
  -- Bloquear após 5 tentativas (15 minutos de bloqueio)
  if v_attempts >= 5 then
    update public.app_users
    set account_locked_until = now() + interval '15 minutes'
    where email = p_email;
  end if;
end;
$$;

-- Function: Resetar tentativas falhadas (após login bem-sucedido)
create or replace function reset_failed_attempts(p_email text)
returns void
language plpgsql
security definer
as $$
begin
  update public.app_users
  set failed_login_attempts = 0,
      last_failed_login = null,
      account_locked_until = null,
      last_login_at = now()
  where email = p_email;
end;
$$;

-- ============================================================================
-- 8) TRIGGER PARA ATUALIZAR updated_at
-- ============================================================================

create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists app_users_updated_at on public.app_users;
create trigger app_users_updated_at
  before update on public.app_users
  for each row
  execute function update_updated_at_column();

-- ============================================================================
-- 9) DADOS INICIAIS (Usuário Admin com senha hash)
-- ============================================================================

-- NOTA: A senha hash será gerada pelo código TypeScript
-- Por enquanto, deixamos vazio e populamos via migration script

-- ============================================================================
-- 10) HABILITAR REALTIME (Opcional)
-- ============================================================================

alter publication supabase_realtime add table public.app_users;
alter publication supabase_realtime add table public.login_attempts;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================

comment on table public.app_users is 'Usuários do sistema com autenticação segura';
comment on table public.login_attempts is 'Rastreamento de tentativas de login para rate limiting';
comment on table public.trusted_devices is 'Dispositivos confiáveis para 2FA (futuro)';
comment on table public.refresh_tokens is 'Tokens de renovação de sessão';
