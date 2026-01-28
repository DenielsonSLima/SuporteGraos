-- Script de implantação Supabase para o módulo Empresa
-- Ordem: 1) Tabelas 2) RLS 3) Realtime

-- 1) Extensões necessárias
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1) Tabela: companies
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  razao_social text not null,
  nome_fantasia text not null,
  cnpj text not null unique,
  ie text null,
  endereco text null,
  numero text null,
  bairro text null,
  cidade text null,
  uf char(2) null,
  cep text null,
  telefone text null,
  email text null,
  website text null,
  logo_url text null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint companies_cnpj_format check (char_length(regexp_replace(cnpj, '\\D', '', 'g')) = 14)
);

-- Trigger para updated_at
create or replace function public.update_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_companies_updated_at on public.companies;
create trigger trg_companies_updated_at
before update on public.companies
for each row execute function public.update_updated_at();

-- 2) RLS (Row Level Security)
alter table public.companies enable row level security;

drop policy if exists "Companies select" on public.companies;
create policy "Companies select" on public.companies
for select
  to authenticated, anon
  using (true);

drop policy if exists "Companies insert" on public.companies;
create policy "Companies insert" on public.companies
for insert
  to authenticated, anon
  with check (true);

drop policy if exists "Companies update" on public.companies;
create policy "Companies update" on public.companies
for update
  to authenticated, anon
  using (true)
  with check (true);

drop policy if exists "Companies delete" on public.companies;
create policy "Companies delete" on public.companies
for delete
  to authenticated, anon
  using (false);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'companies'
  ) then
    alter publication supabase_realtime add table public.companies;
  end if;
end $$;
