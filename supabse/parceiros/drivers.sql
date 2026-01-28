-- Script de implantação Supabase para Motoristas (drivers)
-- Ordem: Tabela -> Índices -> Triggers -> RLS -> Realtime

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1) Tabela
create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text not null unique, -- CPF
  license_number text not null unique,
  license_expiry_date date,
  phone text,
  email text,
  birth_date date,
  address text,
  partner_id uuid null references public.partners(id) on delete cascade,
  city_id bigint null references public.cities(id),
  state_id bigint null references public.ufs(id),
  active boolean not null default true,
  company_id uuid null references public.companies(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 2) Índices
create index if not exists idx_drivers_document on public.drivers(document);
create index if not exists idx_drivers_city_id on public.drivers(city_id);
create index if not exists idx_drivers_partner_id on public.drivers(partner_id);

-- 3) Trigger de atualização automática do updated_at
create or replace function public.update_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_drivers_updated_at on public.drivers;
create trigger trg_drivers_updated_at
before update on public.drivers
for each row execute function public.update_updated_at();

-- 4) Row Level Security (RLS)
alter table public.drivers enable row level security;

drop policy if exists "Drivers select" on public.drivers;
create policy "Drivers select" on public.drivers
for select to authenticated, anon using (true);

drop policy if exists "Drivers insert" on public.drivers;
create policy "Drivers insert" on public.drivers
for insert to authenticated, anon with check (true);

drop policy if exists "Drivers update" on public.drivers;
create policy "Drivers update" on public.drivers
for update to authenticated, anon using (true) with check (true);

drop policy if exists "Drivers delete" on public.drivers;
create policy "Drivers delete" on public.drivers
for delete to authenticated, anon using (true);

-- 5) Realtime (ativar tabela)
DO $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'drivers'
  ) then
    alter publication supabase_realtime add table public.drivers;
  end if;
end $$;
