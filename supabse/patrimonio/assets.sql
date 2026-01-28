-- ============================================================================
-- SCRIPT SUPABASE: MÓDULO DE PATRIMÔNIO (ASSETS)
-- Ordem: 1) Tabelas → 2) RLS → 3) Realtime
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1) TABELAS
-- ============================================================================

-- Tabela de Ativos Patrimoniais (Veículos, Máquinas, Imóveis, Equipamentos)
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  asset_type text not null check (asset_type in ('vehicle', 'machine', 'property', 'equipment', 'other')),
  description text,
  
  -- Aquisição
  acquisition_date date not null,
  acquisition_value numeric(15,2) not null,
  origin text not null check (origin in ('purchase', 'trade_in')),
  origin_description text,
  
  -- Status
  status text not null check (status in ('active', 'sold', 'write_off')) default 'active',
  
  -- Venda (se status = 'sold')
  sale_date date,
  sale_value numeric(15,2),
  buyer_name text,
  buyer_id uuid references public.partners(id) on delete set null,
  
  -- Baixa Patrimonial (se status = 'write_off')
  write_off_date date,
  write_off_reason text,
  write_off_notes text,
  
  -- Identificadores (Placa, Chassi, Matrícula, etc)
  identifier text,
  
  -- Metadata completa (backup JSON do objeto frontend)
  metadata jsonb,
  
  company_id uuid null references public.companies(id),
  created_by uuid null references auth.users(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- ============================================================================
-- 2) ÍNDICES PARA PERFORMANCE
-- ============================================================================

create index if not exists idx_assets_type on public.assets(asset_type);
create index if not exists idx_assets_status on public.assets(status);
create index if not exists idx_assets_acquisition_date on public.assets(acquisition_date);
create index if not exists idx_assets_buyer on public.assets(buyer_id);
create index if not exists idx_assets_identifier on public.assets(identifier);

-- ============================================================================
-- 3) TRIGGERS PARA UPDATE AUTOMÁTICO
-- ============================================================================

create or replace function public.update_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_assets_updated_at on public.assets;
create trigger trg_assets_updated_at
before update on public.assets
for each row execute function public.update_updated_at();

-- ============================================================================
-- 4) ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.assets enable row level security;

-- Políticas de acesso completo (authenticated + anon)
drop policy if exists "Assets select" on public.assets;
create policy "Assets select" on public.assets
for select to authenticated, anon using (true);

drop policy if exists "Assets insert" on public.assets;
create policy "Assets insert" on public.assets
for insert to authenticated, anon with check (true);

drop policy if exists "Assets update" on public.assets;
create policy "Assets update" on public.assets
for update to authenticated, anon using (true) with check (true);

drop policy if exists "Assets delete" on public.assets;
create policy "Assets delete" on public.assets
for delete to authenticated, anon using (true);

-- ============================================================================
-- 5) REALTIME (ATIVE A TABELA PARA WEBSOCKET)
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'assets'
  ) then
    alter publication supabase_realtime add table public.assets;
  end if;
end $$ language plpgsql;

-- ============================================================================
-- 6) COMENTÁRIOS
-- ============================================================================

comment on table public.assets is 'Patrimônio da empresa: veículos, máquinas, imóveis, equipamentos';
comment on column public.assets.asset_type is 'Tipo: vehicle, machine, property, equipment, other';
comment on column public.assets.status is 'Status: active, sold, write_off';
comment on column public.assets.origin is 'Origem: purchase (compra direta), trade_in (troca)';
comment on column public.assets.buyer_id is 'FK para partners se o ativo foi vendido';

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
-- Para executar no Supabase:
-- 1. Copie todo o conteúdo acima
-- 2. Vá para: SQL Editor > New Query
-- 3. Cole o conteúdo
-- 4. Clique em "Run"
-- 5. Aguarde a confirmação de sucesso
