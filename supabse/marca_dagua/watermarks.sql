-- Script de implantação Supabase para Marca D'Água
-- Ordem: Tabelas -> RLS -> Realtime

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists public.watermarks (
  id uuid primary key default gen_random_uuid(),
  image_url text null,
  opacity int not null default 15 check (opacity >= 0 and opacity <= 100),
  orientation text not null default 'portrait' check (orientation in ('portrait','landscape')),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create or replace function public.update_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_watermarks_updated_at on public.watermarks;
create trigger trg_watermarks_updated_at
before update on public.watermarks
for each row execute function public.update_updated_at();

alter table public.watermarks enable row level security;

drop policy if exists "Watermarks select" on public.watermarks;
create policy "Watermarks select" on public.watermarks
for select to authenticated, anon using (true);

drop policy if exists "Watermarks insert" on public.watermarks;
create policy "Watermarks insert" on public.watermarks
for insert to authenticated, anon with check (true);

drop policy if exists "Watermarks update" on public.watermarks;
create policy "Watermarks update" on public.watermarks
for update to authenticated, anon using (true) with check (true);

drop policy if exists "Watermarks delete" on public.watermarks;
create policy "Watermarks delete" on public.watermarks
for delete to authenticated, anon using (false);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'watermarks'
  ) then
    alter publication supabase_realtime add table public.watermarks;
  end if;
end $$;
