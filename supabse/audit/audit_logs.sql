-- ============================================================================
-- SCRIPT SUPABASE: AUDITORIA E LOGS DO SISTEMA
-- Módulo: Logs de eventos, Sessões de usuário, Histórico de login
-- Ordem: 1) Tabelas → 2) RLS → 3) Realtime → 4) Triggers
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1) TABELAS
-- ============================================================================

-- 1.1 LOGS DE AUDITORIA (Quem alterou o que, quando)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  user_name text,
  user_email text,
  action text not null check (action in ('create', 'update', 'delete', 'login', 'logout', 'approve', 'cancel', 'export', 'import')),
  module text not null,  -- ex: 'Financeiro', 'Parceiros', 'Sistema'
  description text not null,
  entity_type text,  -- tipo de entidade afetada (ex: 'payable', 'partner')
  entity_id uuid,    -- ID da entidade
  ip_address text,
  user_agent text,
  metadata jsonb,    -- dados extras (ex: {old_value, new_value})
  company_id uuid references public.companies(id),
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 1.2 SESSÕES DE USUÁRIO (Tempo de acesso)
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  user_name text,
  user_email text,
  session_start timestamptz not null default timezone('utc'::text, now()),
  session_end timestamptz,
  duration_minutes integer,  -- calculado automaticamente
  ip_address text,
  user_agent text,
  browser_info text,
  device_info text,
  status text not null check (status in ('active', 'closed', 'timeout')) default 'active',
  company_id uuid references public.companies(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 1.3 HISTÓRICO DE LOGIN (Tentativas e sucessos)
create table if not exists public.login_history (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  user_name text,
  user_id uuid references auth.users(id),
  login_type text not null check (login_type in ('success', 'failed', 'timeout', 'locked')) default 'success',
  failure_reason text,  -- motivo da falha
  ip_address text,
  user_agent text,
  browser_info text,
  device_info text,
  location text,  -- país/cidade (se disponível via IP geolocation)
  two_factor_used boolean default false,
  session_id uuid references public.user_sessions(id),
  company_id uuid references public.companies(id),
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- 1.4 ATIVIDADES CRÍTICAS (Exclusões, aprovações, alterações de permissões)
create table if not exists public.critical_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  user_name text,
  event_type text not null check (event_type in ('data_deletion', 'permission_change', 'bulk_operation', 'failed_security', 'configuration_change')),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')) default 'medium',
  description text not null,
  affected_records_count integer,
  ip_address text,
  requires_approval boolean default false,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  company_id uuid references public.companies(id),
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- ============================================================================
-- 2) ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Audit Logs
create index if not exists idx_audit_logs_user on public.audit_logs(user_id);
create index if not exists idx_audit_logs_action on public.audit_logs(action);
create index if not exists idx_audit_logs_module on public.audit_logs(module);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at);
create index if not exists idx_audit_logs_company on public.audit_logs(company_id);

-- User Sessions
create index if not exists idx_user_sessions_user on public.user_sessions(user_id);
create index if not exists idx_user_sessions_status on public.user_sessions(status);
create index if not exists idx_user_sessions_start on public.user_sessions(session_start);
create index if not exists idx_user_sessions_company on public.user_sessions(company_id);

-- Login History
create index if not exists idx_login_history_email on public.login_history(user_email);
create index if not exists idx_login_history_user on public.login_history(user_id);
create index if not exists idx_login_history_type on public.login_history(login_type);
create index if not exists idx_login_history_created on public.login_history(created_at);
create index if not exists idx_login_history_company on public.login_history(company_id);

-- Critical Events
create index if not exists idx_critical_events_user on public.critical_events(user_id);
create index if not exists idx_critical_events_type on public.critical_events(event_type);
create index if not exists idx_critical_events_severity on public.critical_events(severity);
create index if not exists idx_critical_events_created on public.critical_events(created_at);
create index if not exists idx_critical_events_company on public.critical_events(company_id);

-- ============================================================================
-- 3) TRIGGERS PARA UPDATE AUTOMÁTICO
-- ============================================================================

create or replace function public.update_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_sessions_updated_at on public.user_sessions;
create trigger trg_user_sessions_updated_at
before update on public.user_sessions
for each row execute function public.update_updated_at();

-- Função para calcular duração da sessão
create or replace function public.calculate_session_duration() returns trigger as $$
begin
  if new.session_end is not null then
    new.duration_minutes = extract(epoch from (new.session_end - new.session_start)) / 60;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_session_duration on public.user_sessions;
create trigger trg_session_duration
before update on public.user_sessions
for each row execute function public.calculate_session_duration();

-- ============================================================================
-- 4) ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.audit_logs enable row level security;
alter table public.user_sessions enable row level security;
alter table public.login_history enable row level security;
alter table public.critical_events enable row level security;

-- AUDIT_LOGS (Todos podem ler, apenas sistema insere)
drop policy if exists "AuditLogs select" on public.audit_logs;
create policy "AuditLogs select" on public.audit_logs
for select using (true);

drop policy if exists "AuditLogs insert" on public.audit_logs;
create policy "AuditLogs insert" on public.audit_logs
for insert with check (true);

-- USER_SESSIONS (Todos podem ler/atualizar)
drop policy if exists "UserSessions select" on public.user_sessions;
create policy "UserSessions select" on public.user_sessions
for select using (true);

drop policy if exists "UserSessions insert" on public.user_sessions;
create policy "UserSessions insert" on public.user_sessions
for insert with check (true);

drop policy if exists "UserSessions update" on public.user_sessions;
create policy "UserSessions update" on public.user_sessions
for update using (true) with check (true);

-- LOGIN_HISTORY (Todos podem ler, apenas sistema insere)
drop policy if exists "LoginHistory select" on public.login_history;
create policy "LoginHistory select" on public.login_history
for select using (true);

drop policy if exists "LoginHistory insert" on public.login_history;
create policy "LoginHistory insert" on public.login_history
for insert with check (true);

-- CRITICAL_EVENTS (Todos podem ler/atualizar)
drop policy if exists "CriticalEvents select" on public.critical_events;
create policy "CriticalEvents select" on public.critical_events
for select using (true);

drop policy if exists "CriticalEvents insert" on public.critical_events;
create policy "CriticalEvents insert" on public.critical_events
for insert with check (true);

drop policy if exists "CriticalEvents update" on public.critical_events;
create policy "CriticalEvents update" on public.critical_events
for update using (true) with check (true);

-- ============================================================================
-- 5) REALTIME (ATIVE AS TABELAS PARA WEBSOCKET)
-- ============================================================================

do $$
begin
  -- Audit Logs
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'audit_logs'
  ) then
    alter publication supabase_realtime add table public.audit_logs;
  end if;

  -- User Sessions
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_sessions'
  ) then
    alter publication supabase_realtime add table public.user_sessions;
  end if;

  -- Login History
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'login_history'
  ) then
    alter publication supabase_realtime add table public.login_history;
  end if;

  -- Critical Events
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'critical_events'
  ) then
    alter publication supabase_realtime add table public.critical_events;
  end if;
end $$ language plpgsql;

-- ============================================================================
-- 6) COMENTÁRIOS
-- ============================================================================

comment on table public.audit_logs is 'Registro de auditoria: Quem alterou o quê, quando, onde';
comment on table public.user_sessions is 'Sessões ativas/encerradas de usuários: tempo de acesso, duração';
comment on table public.login_history is 'Histórico de login: sucessos, falhas, tentativas';
comment on table public.critical_events is 'Eventos críticos: exclusões em massa, mudanças de permissão, falhas de segurança';

comment on column public.audit_logs.action is 'Ação realizada: create, update, delete, login, logout, approve, cancel, export, import';
comment on column public.user_sessions.status is 'Status da sessão: active, closed, timeout';
comment on column public.login_history.login_type is 'Tipo de login: success, failed, timeout, locked';
comment on column public.critical_events.severity is 'Severidade: low, medium, high, critical';

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
-- Para executar no Supabase:
-- 1. Copie todo o conteúdo acima
-- 2. Vá para: SQL Editor > New Query
-- 3. Cole o conteúdo
-- 4. Clique em "Run"
-- 5. Aguarde a confirmação de sucesso
-- 
-- IMPORTANTE: Certifique-se que as tabelas referenciadas já existem:
-- - auth.users (tabela padrão do Supabase)
-- - companies
