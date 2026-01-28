    -- Script de implantação Supabase para Tipos de Produtos
    -- Ordem: Tabela -> RLS -> Realtime -> Seed

    create extension if not exists "uuid-ossp";
    create extension if not exists "pgcrypto";

    create table if not exists public.product_types (
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

    drop trigger if exists trg_product_types_updated_at on public.product_types;
    create trigger trg_product_types_updated_at
    before update on public.product_types
    for each row execute function public.update_updated_at();

    alter table public.product_types enable row level security;

    drop policy if exists "Product types select" on public.product_types;
    create policy "Product types select" on public.product_types
    for select to authenticated, anon using (true);

    drop policy if exists "Product types insert" on public.product_types;
    create policy "Product types insert" on public.product_types
    for insert to authenticated, anon with check (true);

    drop policy if exists "Product types update" on public.product_types;
    create policy "Product types update" on public.product_types
    for update to authenticated, anon using (true) with check (true);

    drop policy if exists "Product types delete" on public.product_types;
    create policy "Product types delete" on public.product_types
    for delete to authenticated, anon using (false);

    do $$
    begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'product_types'
    ) then
        alter publication supabase_realtime add table public.product_types;
    end if;
    end $$;

    -- Seed inicial: apenas Milho em Grãos
    insert into public.product_types (id, name, description, is_system, company_id)
    select '1', 'Milho em Grãos', 'Grãos de milho in natura destinados à comercialização ou consumo.', true, null
    where not exists (select 1 from public.product_types where id = '1' or name = 'Milho em Grãos');
