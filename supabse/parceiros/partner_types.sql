-- Script de implantacao Supabase para Tipos de Parceiros
-- Ordem: Tabela -> RLS -> Realtime -> Seed

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1) Tabela
create table if not exists public.partner_types (
  id text primary key,
  name text not null unique,
  description text null,
  is_system boolean not null default false,
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

drop trigger if exists trg_partner_types_updated_at on public.partner_types;
create trigger trg_partner_types_updated_at
before update on public.partner_types
for each row execute function public.update_updated_at();

-- 2) RLS
alter table public.partner_types enable row level security;

drop policy if exists "Partner types select" on public.partner_types;
create policy "Partner types select" on public.partner_types
for select to authenticated, anon using (true);

drop policy if exists "Partner types insert" on public.partner_types;
create policy "Partner types insert" on public.partner_types
for insert to authenticated, anon with check (true);

drop policy if exists "Partner types update" on public.partner_types;
create policy "Partner types update" on public.partner_types
for update to authenticated, anon using (true) with check (true);

drop policy if exists "Partner types delete" on public.partner_types;
create policy "Partner types delete" on public.partner_types
for delete to authenticated, anon using (false);

-- 3) Realtime

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'partner_types'
  ) then
    alter publication supabase_realtime add table public.partner_types;
  end if;
end $$;

-- 4) Seed inicial (idempotente)
insert into public.partner_types (id, name, description, is_system, company_id)
values
  ('1', 'Produtor Rural', 'Pessoa física ou jurídica que explora atividade agrícola.', true, null),
  ('2', 'Indústria', 'Empresas de transformação e beneficiamento.', true, null),
  ('3', 'Transportadora', 'Responsável pela logística e frete de cargas.', true, null),
  ('4', 'Corretor', 'Intermediário nas negociações de compra e venda.', true, null),
  ('5', 'Cliente', 'Comprador final ou destinatário dos grãos.', true, null),
  ('7', 'Fornecedor', 'Fornecedores de insumos, equipamentos e serviços gerais.', true, null),
  ('6', 'Outros', 'Parceiros diversos não categorizados acima.', true, null)
on conflict (id) do update
  set name = excluded.name,
      description = excluded.description,
      is_system = excluded.is_system,
      company_id = excluded.company_id;
