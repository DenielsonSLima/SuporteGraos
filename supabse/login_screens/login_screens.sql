-- ============================================================================
-- SCRIPT SUPABASE: TELA INICIAL / LOGIN SCREENS
-- Módulo: Configurações > Tela Inicial
-- Objetivo: Armazenar imagens geradas por IA ou enviadas manualmente
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1) TABELAS
-- ============================================================================

-- 1.1 IMAGENS DA TELA INICIAL
create table if not exists public.login_screens (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  sequence_order integer not null default 0,
  image_url text not null,
  image_data text, -- base64 fallback para guardar a imagem direto se necessário
  title text, -- ex: "Colheita de Soja"
  description text, -- ex: "A maior safra do ano"
  source text not null default 'upload', -- 'upload' ou 'ai_generated'
  ai_prompt text, -- O prompt usado se gerado por IA
  is_active boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  metadata jsonb -- Para guardar informações extras (resolução, modelo IA, etc)
);

-- 1.2 CONFIGURAÇÕES DE ROTAÇÃO
create table if not exists public.login_rotation_config (
  id uuid primary key default gen_random_uuid(),
  company_id uuid unique,
  rotation_frequency text not null default 'fixed', -- 'daily', 'weekly', 'monthly', 'fixed'
  display_order text not null default 'sequential', -- 'sequential', 'random', 'manual'
  auto_refresh_seconds integer default 0, -- 0 = desabilitado
  last_rotation_at timestamptz,
  next_rotation_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- ============================================================================
-- 2) ÍNDICES PARA PERFORMANCE
-- ============================================================================

create index if not exists idx_login_screens_company on public.login_screens(company_id);
create index if not exists idx_login_screens_active on public.login_screens(is_active);
create index if not exists idx_login_screens_order on public.login_screens(sequence_order);
create index if not exists idx_login_screens_created on public.login_screens(created_at);
create index if not exists idx_rotation_config_company on public.login_rotation_config(company_id);

-- ============================================================================
-- 3) ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.login_screens enable row level security;
alter table public.login_rotation_config enable row level security;

-- LOGIN_SCREENS - Permissões
drop policy if exists "LoginScreens select" on public.login_screens;
create policy "LoginScreens select" on public.login_screens
for select using (true); -- Público pode ler (tela inicial)

drop policy if exists "LoginScreens insert" on public.login_screens;
create policy "LoginScreens insert" on public.login_screens
for insert with check (
  auth.uid() is not null -- Apenas usuários autenticados podem inserir
);

drop policy if exists "LoginScreens update" on public.login_screens;
create policy "LoginScreens update" on public.login_screens
for update using (
  auth.uid() = created_by or auth.uid() is not null -- Criador ou admin
) with check (
  auth.uid() = created_by or auth.uid() is not null
);

drop policy if exists "LoginScreens delete" on public.login_screens;
create policy "LoginScreens delete" on public.login_screens
for delete using (
  auth.uid() = created_by or auth.uid() is not null -- Criador ou admin
);

-- LOGIN_ROTATION_CONFIG - Permissões
drop policy if exists "RotationConfig select" on public.login_rotation_config;
create policy "RotationConfig select" on public.login_rotation_config
for select using (true); -- Público pode ler

drop policy if exists "RotationConfig insert" on public.login_rotation_config;
create policy "RotationConfig insert" on public.login_rotation_config
for insert with check (
  auth.uid() is not null -- Apenas autenticados
);

drop policy if exists "RotationConfig update" on public.login_rotation_config;
create policy "RotationConfig update" on public.login_rotation_config
for update using (
  auth.uid() is not null -- Apenas autenticados
) with check (
  auth.uid() is not null
);

-- ============================================================================
-- 4) TRIGGERS PARA UPDATED_AT
-- ============================================================================

create or replace function update_login_screens_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists login_screens_updated_at_trigger on public.login_screens;
create trigger login_screens_updated_at_trigger
before update on public.login_screens
for each row
execute function update_login_screens_updated_at();

create or replace function update_login_rotation_config_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists login_rotation_config_updated_at_trigger on public.login_rotation_config;
create trigger login_rotation_config_updated_at_trigger
before update on public.login_rotation_config
for each row
execute function update_login_rotation_config_updated_at();

-- ============================================================================
-- 5) REALTIME (ATIVE AS TABELAS PARA WEBSOCKET)
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'login_screens'
  ) then
    alter publication supabase_realtime add table public.login_screens;
  end if;
  
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'login_rotation_config'
  ) then
    alter publication supabase_realtime add table public.login_rotation_config;
  end if;
end $$ language plpgsql;

-- ============================================================================
-- 6) COMENTÁRIOS
-- ============================================================================

comment on table public.login_screens is 'Imagens da tela de login/inicial (upload ou IA gerada)';
comment on column public.login_screens.source is 'upload = enviada manualmente, ai_generated = gerada por IA';
comment on column public.login_screens.image_data is 'Base64 da imagem (fallback se URL falhar)';
comment on column public.login_screens.ai_prompt is 'Prompt usado se gerado por Gemini/IA';

comment on table public.login_rotation_config is 'Configuração de rotação de imagens da tela inicial';
comment on column public.login_rotation_config.rotation_frequency is 'daily, weekly, monthly ou fixed (sem rotação automática)';
comment on column public.login_rotation_config.display_order is 'sequential (ordem), random (aleatória), manual (seleção)';
