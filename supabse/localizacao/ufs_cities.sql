-- Script de implantacao Supabase para UFs e Cidades
-- Ordem: Tabelas -> RLS -> Realtime -> Seed UFs

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1) Tabelas
create table if not exists public.ufs (
  id bigserial primary key,
  uf char(2) not null unique,
  name text not null,
  code integer not null unique,
  company_id uuid null references public.companies(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint ufs_uf_length check (char_length(uf) = 2)
);

create table if not exists public.cities (
  id bigserial primary key,
  name text not null,
  uf_id bigint not null references public.ufs(id) on delete cascade,
  code integer null,
  company_id uuid null references public.companies(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint cities_name_uf_unique unique (uf_id, name)
);

create unique index if not exists cities_code_unique on public.cities(code) where code is not null;
create index if not exists idx_ufs_uf on public.ufs(uf);
create index if not exists idx_cities_uf_id on public.cities(uf_id);

create or replace function public.update_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ufs_updated_at on public.ufs;
create trigger trg_ufs_updated_at
before update on public.ufs
for each row execute function public.update_updated_at();

drop trigger if exists trg_cities_updated_at on public.cities;
create trigger trg_cities_updated_at
before update on public.cities
for each row execute function public.update_updated_at();

-- 2) RLS
alter table public.ufs enable row level security;
alter table public.cities enable row level security;

drop policy if exists "UFs select" on public.ufs;
create policy "UFs select" on public.ufs
for select to authenticated, anon using (true);

drop policy if exists "UFs insert" on public.ufs;
create policy "UFs insert" on public.ufs
for insert to authenticated, anon with check (true);

drop policy if exists "UFs update" on public.ufs;
create policy "UFs update" on public.ufs
for update to authenticated, anon using (true) with check (true);

drop policy if exists "UFs delete" on public.ufs;
create policy "UFs delete" on public.ufs
for delete to authenticated, anon using (false);

drop policy if exists "Cities select" on public.cities;
create policy "Cities select" on public.cities
for select to authenticated, anon using (true);

drop policy if exists "Cities insert" on public.cities;
create policy "Cities insert" on public.cities
for insert to authenticated, anon with check (true);

drop policy if exists "Cities update" on public.cities;
create policy "Cities update" on public.cities
for update to authenticated, anon using (true) with check (true);

drop policy if exists "Cities delete" on public.cities;
create policy "Cities delete" on public.cities
for delete to authenticated, anon using (false);

-- 3) Realtime

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ufs'
  ) then
    alter publication supabase_realtime add table public.ufs;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cities'
  ) then
    alter publication supabase_realtime add table public.cities;
  end if;
end $$;

-- 4) Seed UFs (idempotente)
insert into public.ufs (uf, name, code, company_id)
values
  ('AC', 'Acre', 12, null),
  ('AL', 'Alagoas', 27, null),
  ('AP', 'Amapa', 16, null),
  ('AM', 'Amazonas', 13, null),
  ('BA', 'Bahia', 29, null),
  ('CE', 'Ceara', 23, null),
  ('DF', 'Distrito Federal', 53, null),
  ('ES', 'Espirito Santo', 32, null),
  ('GO', 'Goias', 52, null),
  ('MA', 'Maranhao', 21, null),
  ('MT', 'Mato Grosso', 51, null),
  ('MS', 'Mato Grosso do Sul', 50, null),
  ('MG', 'Minas Gerais', 31, null),
  ('PA', 'Para', 15, null),
  ('PB', 'Paraiba', 25, null),
  ('PR', 'Parana', 41, null),
  ('PE', 'Pernambuco', 26, null),
  ('PI', 'Piaui', 22, null),
  ('RJ', 'Rio de Janeiro', 33, null),
  ('RN', 'Rio Grande do Norte', 24, null),
  ('RS', 'Rio Grande do Sul', 43, null),
  ('RO', 'Rondonia', 11, null),
  ('RR', 'Roraima', 14, null),
  ('SC', 'Santa Catarina', 42, null),
  ('SP', 'Sao Paulo', 35, null),
  ('SE', 'Sergipe', 28, null),
  ('TO', 'Tocantins', 17, null)
on conflict (uf) do update
  set name = excluded.name,
      code = excluded.code,
      company_id = excluded.company_id;
