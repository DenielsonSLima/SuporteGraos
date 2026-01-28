-- Script de implantação Supabase para Contas Bancárias
-- Ordem: Tabela -> RLS -> Realtime

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists public.contas_bancarias (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null unique,
  owner text null,
  agency text null,
  account_number text null,
  account_type text null,
  active boolean not null default true,
  company_id uuid null references public.companies(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create or replace function public.update_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_contas_bancarias_updated_at on public.contas_bancarias;
create trigger trg_contas_bancarias_updated_at
before update on public.contas_bancarias
for each row execute function public.update_updated_at();

alter table public.contas_bancarias enable row level security;

drop policy if exists "Bank accounts select" on public.contas_bancarias;
create policy "Bank accounts select" on public.contas_bancarias
for select to authenticated, anon using (true);

drop policy if exists "Bank accounts insert" on public.contas_bancarias;
create policy "Bank accounts insert" on public.contas_bancarias
for insert to authenticated, anon with check (true);

drop policy if exists "Bank accounts update" on public.contas_bancarias;
create policy "Bank accounts update" on public.contas_bancarias
for update to authenticated, anon using (true) with check (true);

drop policy if exists "Bank accounts delete" on public.contas_bancarias;
create policy "Bank accounts delete" on public.contas_bancarias
for delete to authenticated, anon using (false);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'contas_bancarias'
  ) then
    alter publication supabase_realtime add table public.contas_bancarias;
  end if;
end $$;
