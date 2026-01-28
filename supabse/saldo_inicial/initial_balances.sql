-- Script de implantacao Supabase para Saldos Iniciais
-- Ordem: Tabela -> RLS -> Realtime

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1) Tabela
create table if not exists public.initial_balances (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.contas_bancarias(id) on delete cascade,
  account_name text not null,
  date date not null,
  value decimal(15,2) not null,
  company_id uuid null references public.companies(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint initial_balances_account_unique unique (account_id)
);

create index if not exists idx_initial_balances_account_id on public.initial_balances(account_id);
create index if not exists idx_initial_balances_date on public.initial_balances(date);

create or replace function public.update_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_initial_balances_updated_at on public.initial_balances;
create trigger trg_initial_balances_updated_at
before update on public.initial_balances
for each row execute function public.update_updated_at();

-- 2) RLS
alter table public.initial_balances enable row level security;

drop policy if exists "Initial balances select" on public.initial_balances;
create policy "Initial balances select" on public.initial_balances
for select to authenticated, anon using (true);

drop policy if exists "Initial balances insert" on public.initial_balances;
create policy "Initial balances insert" on public.initial_balances
for insert to authenticated, anon with check (true);

drop policy if exists "Initial balances update" on public.initial_balances;
create policy "Initial balances update" on public.initial_balances
for update to authenticated, anon using (true) with check (true);

drop policy if exists "Initial balances delete" on public.initial_balances;
create policy "Initial balances delete" on public.initial_balances
for delete to authenticated, anon using (true);

-- 3) Realtime

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'initial_balances'
  ) then
    alter publication supabase_realtime add table public.initial_balances;
  end if;
end $$;
