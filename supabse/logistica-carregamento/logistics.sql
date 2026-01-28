-- Script de implantação Supabase para Logística / Carregamentos (Etapa Principal)
-- Ordem: 1) Tabelas -> 2) RLS -> 3) Realtime

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1) TABELAS (ORDEM CORRETA DE DEPENDÊNCIAS)
-- ============================================================================

-- Cabeçalho de Carregamentos (Romaneios / Movimentações de carga)
create table if not exists public.logistics_loadings (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  invoice_number text,
  
  -- Origem (Compra)
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  purchase_order_number text,
  supplier_name text,

  -- Transporte
  carrier_id uuid references public.partners(id) on delete set null,
  carrier_name text,
  driver_id uuid references public.drivers(id) on delete set null,
  driver_name text,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  vehicle_plate text,
  is_client_transport boolean default false,

  -- Dados da Carga
  product text not null,
  weight_kg numeric(12,2) not null,
  weight_ton numeric(12,3) generated always as (weight_kg / 1000.0) stored,
  weight_sc numeric(12,3),

  -- Dados de Descarga
  unload_weight_kg numeric(12,2),
  breakage_kg numeric(12,2),

  -- Financeiro (Compra)
  purchase_price_per_sc numeric(15,2),
  total_purchase_value numeric(15,2),
  product_paid numeric(15,2) default 0,

  -- Financeiro do Frete
  freight_price_per_ton numeric(15,2),
  total_freight_value numeric(15,2),
  freight_advances numeric(15,2) default 0,
  freight_paid numeric(15,2) default 0,

  -- Gestão de Extras
  notes text,

  -- Destino (Venda)
  sales_order_id uuid references public.sales_orders(id) on delete set null,
  sales_order_number text,
  customer_name text,
  sales_price numeric(15,2),
  total_sales_value numeric(15,2),

  -- Status
  status text not null check (status in ('loaded', 'in_transit', 'unloading', 'completed', 'redirected', 'canceled')),
  is_redirected boolean default false,
  original_destination text,
  redirect_displacement_value numeric(15,2),

  -- Metadata
  metadata jsonb,

  company_id uuid null references public.companies(id),
  created_by uuid null references auth.users(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Despesas Extras de Frete (itens independentes)
create table if not exists public.logistics_loading_expenses (
  id uuid primary key default gen_random_uuid(),
  loading_id uuid not null references public.logistics_loadings(id) on delete cascade,
  description text not null,
  value numeric(15,2) not null,
  type text not null check (type in ('deduction', 'addition')),
  date date not null,
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- Movimentos financeiros do frete (adiantamentos e pagamentos)
create table if not exists public.logistics_freight_transactions (
  id uuid primary key default gen_random_uuid(),
  loading_id uuid not null references public.logistics_loadings(id) on delete cascade,
  txn_type text not null check (txn_type in ('advance', 'payment')),
  value numeric(15,2) not null,
  txn_date date not null,
  account_id text null references public.expense_categories(id), -- ou conta financeira apropriada
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- Redirecionamentos de carga (histórico detalhado)
create table if not exists public.logistics_loading_redirections (
  id uuid primary key default gen_random_uuid(),
  loading_id uuid not null references public.logistics_loadings(id) on delete cascade,
  reason text,
  from_destination text,
  to_destination text,
  displacement_value numeric(15,2),
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- ============================================================================
-- 2) ÍNDICES PARA PERFORMANCE
-- ============================================================================

create index if not exists idx_loadings_date on public.logistics_loadings(date);
create index if not exists idx_loadings_status on public.logistics_loadings(status);
create index if not exists idx_loadings_purchase on public.logistics_loadings(purchase_order_id);
create index if not exists idx_loadings_sales on public.logistics_loadings(sales_order_id);
create index if not exists idx_loadings_carrier on public.logistics_loadings(carrier_id);
create index if not exists idx_loadings_driver on public.logistics_loadings(driver_id);
create index if not exists idx_loadings_vehicle on public.logistics_loadings(vehicle_id);

create index if not exists idx_loading_expenses_loading on public.logistics_loading_expenses(loading_id);
create index if not exists idx_freight_txn_loading on public.logistics_freight_transactions(loading_id);
create index if not exists idx_redirections_loading on public.logistics_loading_redirections(loading_id);

-- ============================================================================
-- 3) TRIGGERS PARA UPDATE AUTOMÁTICO
-- ============================================================================

create or replace function public.update_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_logistics_loadings_updated_at on public.logistics_loadings;
create trigger trg_logistics_loadings_updated_at
before update on public.logistics_loadings
for each row execute function public.update_updated_at();

-- ============================================================================
-- 4) ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.logistics_loadings enable row level security;
alter table public.logistics_loading_expenses enable row level security;
alter table public.logistics_freight_transactions enable row level security;
alter table public.logistics_loading_redirections enable row level security;

-- Loadings RLS
drop policy if exists "Loadings select" on public.logistics_loadings;
create policy "Loadings select" on public.logistics_loadings
for select to authenticated, anon using (true);
drop policy if exists "Loadings insert" on public.logistics_loadings;
create policy "Loadings insert" on public.logistics_loadings
for insert to authenticated, anon with check (true);
drop policy if exists "Loadings update" on public.logistics_loadings;
create policy "Loadings update" on public.logistics_loadings
for update to authenticated, anon using (true) with check (true);
drop policy if exists "Loadings delete" on public.logistics_loadings;
create policy "Loadings delete" on public.logistics_loadings
for delete to authenticated, anon using (true);

-- Loading Expenses RLS
drop policy if exists "Loading expenses select" on public.logistics_loading_expenses;
create policy "Loading expenses select" on public.logistics_loading_expenses
for select to authenticated, anon using (true);
drop policy if exists "Loading expenses insert" on public.logistics_loading_expenses;
create policy "Loading expenses insert" on public.logistics_loading_expenses
for insert to authenticated, anon with check (true);
drop policy if exists "Loading expenses update" on public.logistics_loading_expenses;
create policy "Loading expenses update" on public.logistics_loading_expenses
for update to authenticated, anon using (true) with check (true);
drop policy if exists "Loading expenses delete" on public.logistics_loading_expenses;
create policy "Loading expenses delete" on public.logistics_loading_expenses
for delete to authenticated, anon using (true);

-- Freight Transactions RLS
drop policy if exists "Freight transactions select" on public.logistics_freight_transactions;
create policy "Freight transactions select" on public.logistics_freight_transactions
for select to authenticated, anon using (true);
drop policy if exists "Freight transactions insert" on public.logistics_freight_transactions;
create policy "Freight transactions insert" on public.logistics_freight_transactions
for insert to authenticated, anon with check (true);
drop policy if exists "Freight transactions update" on public.logistics_freight_transactions;
create policy "Freight transactions update" on public.logistics_freight_transactions
for update to authenticated, anon using (true) with check (true);
drop policy if exists "Freight transactions delete" on public.logistics_freight_transactions;
create policy "Freight transactions delete" on public.logistics_freight_transactions
for delete to authenticated, anon using (true);

-- Redirections RLS
drop policy if exists "Redirections select" on public.logistics_loading_redirections;
create policy "Redirections select" on public.logistics_loading_redirections
for select to authenticated, anon using (true);
drop policy if exists "Redirections insert" on public.logistics_loading_redirections;
create policy "Redirections insert" on public.logistics_loading_redirections
for insert to authenticated, anon with check (true);
drop policy if exists "Redirections update" on public.logistics_loading_redirections;
create policy "Redirections update" on public.logistics_loading_redirections
for update to authenticated, anon using (true) with check (true);
drop policy if exists "Redirections delete" on public.logistics_loading_redirections;
create policy "Redirections delete" on public.logistics_loading_redirections
for delete to authenticated, anon using (true);

-- ============================================================================
-- 5) REALTIME (ATIVE AS TABELAS PARA WEBSOCKET)
-- ============================================================================

do $$
begin
  -- logistics_loadings
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'logistics_loadings'
  ) then
    alter publication supabase_realtime add table public.logistics_loadings;
  end if;

  -- logistics_loading_expenses
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'logistics_loading_expenses'
  ) then
    alter publication supabase_realtime add table public.logistics_loading_expenses;
  end if;

  -- logistics_freight_transactions
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'logistics_freight_transactions'
  ) then
    alter publication supabase_realtime add table public.logistics_freight_transactions;
  end if;

  -- logistics_loading_redirections
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'logistics_loading_redirections'
  ) then
    alter publication supabase_realtime add table public.logistics_loading_redirections;
  end if;
end $$ language plpgsql;

-- ============================================================================
-- 6) COMENTÁRIOS
-- ============================================================================

comment on table public.logistics_loadings is 'Carregamentos (romaneios) vinculados a compras e vendas';
comment on table public.logistics_loading_expenses is 'Despesas extras de frete por carregamento';
comment on table public.logistics_freight_transactions is 'Adiantamentos e pagamentos de frete por carregamento';
comment on table public.logistics_loading_redirections is 'Histórico de redirecionamento de carga (recusa/desvio)';

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
-- Para executar no Supabase:
-- 1. Copie todo o conteúdo acima
-- 2. Vá para: SQL Editor > New Query
-- 3. Cole o conteúdo
-- 4. Clique em "Run"
-- 5. Aguarde a confirmação de sucesso
