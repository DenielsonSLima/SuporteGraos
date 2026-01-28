-- Script de implantação Supabase para Pedido de Venda (Etapa 4)
-- Ordem: Tabelas -> RLS -> Realtime

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1) TABELAS (ORDEM CORRETA DE DEPENDÊNCIAS)
-- ============================================================================

-- Cabeçalho do Pedido de Venda
create table if not exists public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique, -- "PV-2026-001"
  partner_id uuid not null references public.partners(id),
  date date not null,
  expected_delivery_date date,
  status text not null check (status in ('pending', 'approved', 'shipped', 'delivered', 'cancelled')),
  total_value decimal(15,2) not null default 0,
  shipped_value decimal(15,2) not null default 0,
  discount decimal(15,2) default 0,
  notes text,
  metadata jsonb,
  company_id uuid null references public.companies(id),
  created_by uuid null references auth.users(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Itens do Pedido de Venda
create table if not exists public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references public.sales_orders(id) on delete cascade,
  product_type_id text not null references public.product_types(id),
  quantity decimal(15,3) not null,
  unit_price decimal(15,2) not null,
  subtotal decimal(15,2) generated always as (quantity * unit_price) stored,
  shipped_quantity decimal(15,3) default 0,
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- Entregas do Pedido de Venda
create table if not exists public.sales_deliveries (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references public.sales_orders(id),
  delivery_date date not null,
  shipped_quantity decimal(15,3) not null,
  notes text,
  delivered_by text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- ============================================================================
-- 2) ÍNDICES PARA PERFORMANCE
-- ============================================================================

create index if not exists idx_sales_orders_partner on public.sales_orders(partner_id);
create index if not exists idx_sales_orders_company on public.sales_orders(company_id);
create index if not exists idx_sales_orders_status on public.sales_orders(status);
create index if not exists idx_sales_orders_date on public.sales_orders(date);

create index if not exists idx_sales_items_order on public.sales_order_items(sales_order_id);
create index if not exists idx_sales_items_product on public.sales_order_items(product_type_id);

create index if not exists idx_sales_deliveries_order on public.sales_deliveries(sales_order_id);
create index if not exists idx_sales_deliveries_date on public.sales_deliveries(delivery_date);

-- ============================================================================
-- 3) TRIGGERS PARA UPDATE AUTOMÁTICO
-- ============================================================================

create or replace function public.update_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Atualiza updated_at
drop trigger if exists trg_sales_orders_updated_at on public.sales_orders;
create trigger trg_sales_orders_updated_at
before update on public.sales_orders
for each row execute function public.update_updated_at();

-- ============================================================================
-- 4) ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;
alter table public.sales_deliveries enable row level security;

-- Sales Orders RLS
drop policy if exists "Sales orders select" on public.sales_orders;
create policy "Sales orders select" on public.sales_orders
for select to authenticated, anon using (true);

drop policy if exists "Sales orders insert" on public.sales_orders;
create policy "Sales orders insert" on public.sales_orders
for insert to authenticated, anon with check (true);

drop policy if exists "Sales orders update" on public.sales_orders;
create policy "Sales orders update" on public.sales_orders
for update to authenticated, anon using (true) with check (true);

drop policy if exists "Sales orders delete" on public.sales_orders;
create policy "Sales orders delete" on public.sales_orders
for delete to authenticated, anon using (true);

-- Sales Order Items RLS
drop policy if exists "Sales order items select" on public.sales_order_items;
create policy "Sales order items select" on public.sales_order_items
for select to authenticated, anon using (true);

drop policy if exists "Sales order items insert" on public.sales_order_items;
create policy "Sales order items insert" on public.sales_order_items
for insert to authenticated, anon with check (true);

drop policy if exists "Sales order items update" on public.sales_order_items;
create policy "Sales order items update" on public.sales_order_items
for update to authenticated, anon using (true) with check (true);

drop policy if exists "Sales order items delete" on public.sales_order_items;
create policy "Sales order items delete" on public.sales_order_items
for delete to authenticated, anon using (true);

-- Sales Deliveries RLS
drop policy if exists "Sales deliveries select" on public.sales_deliveries;
create policy "Sales deliveries select" on public.sales_deliveries
for select to authenticated, anon using (true);

drop policy if exists "Sales deliveries insert" on public.sales_deliveries;
create policy "Sales deliveries insert" on public.sales_deliveries
for insert to authenticated, anon with check (true);

drop policy if exists "Sales deliveries update" on public.sales_deliveries;
create policy "Sales deliveries update" on public.sales_deliveries
for update to authenticated, anon using (true) with check (true);

drop policy if exists "Sales deliveries delete" on public.sales_deliveries;
create policy "Sales deliveries delete" on public.sales_deliveries
for delete to authenticated, anon using (true);

-- ============================================================================
-- 5) REALTIME (ATIVE AS TABELAS PARA WEBSOCKET)
-- ============================================================================

do $$
begin
  -- sales_orders
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sales_orders'
  ) then
    alter publication supabase_realtime add table public.sales_orders;
  end if;

  -- sales_order_items
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sales_order_items'
  ) then
    alter publication supabase_realtime add table public.sales_order_items;
  end if;

  -- sales_deliveries
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sales_deliveries'
  ) then
    alter publication supabase_realtime add table public.sales_deliveries;
  end if;
end $$;

-- ============================================================================
-- 6) COMENTÁRIOS
-- ============================================================================

comment on table public.sales_orders is 'Pedidos de venda (cabeçalho)';
comment on table public.sales_order_items is 'Itens dos pedidos de venda';
comment on table public.sales_deliveries is 'Entregas vinculadas aos pedidos de venda';

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
-- Para executar no Supabase:
-- 1. Copie todo o conteúdo acima
-- 2. Vá para: SQL Editor > New Query
-- 3. Cole o conteúdo
-- 4. Clique em "Run"
-- 5. Aguarde a confirmação de sucesso
