-- ============================================================================
-- SCRIPT SUPABASE: ESTOQUE (INVENTORY + MOVIMENTAÇÕES)
-- Ordem: 1) Tabelas → 2) RLS → 3) Realtime
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1) TABELAS
-- ============================================================================

-- Saldo por produto/localização
create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_type_id uuid not null references public.product_types(id),
  location_id uuid not null references public.warehouse_locations(id),
  quantity_on_hand numeric(15,3) not null default 0,
  quantity_reserved numeric(15,3) not null default 0,
  quantity_available numeric(15,3) generated always as (quantity_on_hand - quantity_reserved) stored,
  last_movement_date date,
  company_id uuid references public.companies(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique(product_type_id, location_id, company_id)
);

-- Histórico de movimentações
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_type_id uuid not null references public.product_types(id),
  from_location_id uuid references public.warehouse_locations(id),
  to_location_id uuid references public.warehouse_locations(id),
  quantity numeric(15,3) not null,
  movement_type text not null check (movement_type in ('inbound', 'outbound', 'transfer', 'adjustment')),
  reference_type text,   -- 'purchase_order', 'sales_order', 'loading', 'adjustment'
  reference_id uuid,
  movement_date date not null,
  notes text,
  company_id uuid references public.companies(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- ============================================================================
-- 2) ÍNDICES
-- ============================================================================

create index if not exists idx_inventory_product on public.inventory(product_type_id);
create index if not exists idx_inventory_location on public.inventory(location_id);
create index if not exists idx_inventory_company on public.inventory(company_id);

create index if not exists idx_movements_product on public.inventory_movements(product_type_id);
create index if not exists idx_movements_from on public.inventory_movements(from_location_id);
create index if not exists idx_movements_to on public.inventory_movements(to_location_id);
create index if not exists idx_movements_type on public.inventory_movements(movement_type);
create index if not exists idx_movements_date on public.inventory_movements(movement_date);
create index if not exists idx_movements_reference on public.inventory_movements(reference_type, reference_id);
create index if not exists idx_movements_company on public.inventory_movements(company_id);

-- ============================================================================
-- 3) TRIGGER DE UPDATED_AT
-- ============================================================================

create or replace function public.update_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_inventory_updated_at on public.inventory;
create trigger trg_inventory_updated_at
before update on public.inventory
for each row execute function public.update_updated_at();

-- ============================================================================
-- 4) ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.inventory enable row level security;
alter table public.inventory_movements enable row level security;

-- Política simples baseada em usuário autenticado.
-- Ajuste para multi-tenant se usar claim company_id no JWT.

drop policy if exists "Inventory select" on public.inventory;
create policy "Inventory select" on public.inventory
for select to authenticated using (true);

drop policy if exists "Inventory insert" on public.inventory;
create policy "Inventory insert" on public.inventory
for insert to authenticated with check (true);

drop policy if exists "Inventory update" on public.inventory;
create policy "Inventory update" on public.inventory
for update to authenticated using (true) with check (true);

drop policy if exists "Inventory delete" on public.inventory;
create policy "Inventory delete" on public.inventory
for delete to authenticated using (true);

drop policy if exists "InventoryMov select" on public.inventory_movements;
create policy "InventoryMov select" on public.inventory_movements
for select to authenticated using (true);

drop policy if exists "InventoryMov insert" on public.inventory_movements;
create policy "InventoryMov insert" on public.inventory_movements
for insert to authenticated with check (true);

drop policy if exists "InventoryMov update" on public.inventory_movements;
create policy "InventoryMov update" on public.inventory_movements
for update to authenticated using (true) with check (true);

drop policy if exists "InventoryMov delete" on public.inventory_movements;
create policy "InventoryMov delete" on public.inventory_movements
for delete to authenticated using (true);

-- ============================================================================
-- 5) REALTIME
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'inventory'
  ) then
    alter publication supabase_realtime add table public.inventory;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'inventory_movements'
  ) then
    alter publication supabase_realtime add table public.inventory_movements;
  end if;
end $$ language plpgsql;

-- ============================================================================
-- 6) COMENTÁRIOS
-- ============================================================================

comment on table public.inventory is 'Saldo de estoque por produto e localização';
comment on table public.inventory_movements is 'Histórico de movimentações de estoque';
comment on column public.inventory.quantity_available is 'Saldo disponível (on_hand - reserved)';
comment on column public.inventory_movements.movement_type is 'inbound, outbound, transfer, adjustment';

-- ============================================================================
-- FIM
-- ============================================================================
-- Para executar: cole no SQL Editor do Supabase e rode.
