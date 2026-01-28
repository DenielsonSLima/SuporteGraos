-- ============================================================================
-- SCRIPT SUPABASE: SÓCIOS (SHAREHOLDERS)
-- Módulo: Sócios, Transações de Sócios
-- Ordem: 1) Tabelas → 2) RLS → 3) Realtime → 4) Seed
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1) TABELAS
-- ============================================================================

-- 1.1 SÓCIOS (SHAREHOLDERS)
create table if not exists public.shareholders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cpf text unique,
  email text,
  phone text,
  
  -- Endereço
  address_street text,
  address_number text,
  address_neighborhood text,
  address_city text,
  address_state text,
  address_zip text,
  
  -- Financeiro
  pro_labore_value numeric(15,2) default 0,
  current_balance numeric(15,2) default 0,
  last_pro_labore_date date,
  
  -- Recorrência
  recurrence_active boolean default false,
  recurrence_amount numeric(15,2) default 0,
  recurrence_day integer default 1,
  recurrence_last_generated_month text,
  
  -- Metadata
  company_id uuid references public.companies(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 1.2 TRANSAÇÕES DE SÓCIOS (SHAREHOLDER TRANSACTIONS)
create table if not exists public.shareholder_transactions (
  id uuid primary key default gen_random_uuid(),
  shareholder_id uuid not null references public.shareholders(id) on delete cascade,
  date date not null,
  type text not null check (type in ('credit', 'debit')),
  value numeric(15,2) not null,
  description text not null,
  account_id uuid references public.contas_bancarias(id),
  account_name text,
  company_id uuid references public.companies(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- ============================================================================
-- 2) ÍNDICES PARA PERFORMANCE
-- ============================================================================

create index if not exists idx_shareholders_cpf on public.shareholders(cpf);
create index if not exists idx_shareholders_company on public.shareholders(company_id);
create index if not exists idx_shareholder_transactions_shareholder on public.shareholder_transactions(shareholder_id);
create index if not exists idx_shareholder_transactions_date on public.shareholder_transactions(date);
create index if not exists idx_shareholder_transactions_type on public.shareholder_transactions(type);
create index if not exists idx_shareholder_transactions_company on public.shareholder_transactions(company_id);

-- ============================================================================
-- 3) TRIGGERS PARA UPDATE AUTOMÁTICO
-- ============================================================================

create or replace function public.update_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_shareholders_updated_at on public.shareholders;
create trigger trg_shareholders_updated_at
before update on public.shareholders
for each row execute function public.update_updated_at();

drop trigger if exists trg_shareholder_transactions_updated_at on public.shareholder_transactions;
create trigger trg_shareholder_transactions_updated_at
before update on public.shareholder_transactions
for each row execute function public.update_updated_at();

-- ============================================================================
-- 4) ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.shareholders enable row level security;
alter table public.shareholder_transactions enable row level security;

-- SHAREHOLDERS
drop policy if exists "Shareholders select" on public.shareholders;
create policy "Shareholders select" on public.shareholders
for select using (true);

drop policy if exists "Shareholders insert" on public.shareholders;
create policy "Shareholders insert" on public.shareholders
for insert with check (true);

drop policy if exists "Shareholders update" on public.shareholders;
create policy "Shareholders update" on public.shareholders
for update using (true) with check (true);

drop policy if exists "Shareholders delete" on public.shareholders;
create policy "Shareholders delete" on public.shareholders
for delete using (true);

-- SHAREHOLDER TRANSACTIONS
drop policy if exists "Shareholder transactions select" on public.shareholder_transactions;
create policy "Shareholder transactions select" on public.shareholder_transactions
for select using (true);

drop policy if exists "Shareholder transactions insert" on public.shareholder_transactions;
create policy "Shareholder transactions insert" on public.shareholder_transactions
for insert with check (true);

drop policy if exists "Shareholder transactions update" on public.shareholder_transactions;
create policy "Shareholder transactions update" on public.shareholder_transactions
for update using (true) with check (true);

drop policy if exists "Shareholder transactions delete" on public.shareholder_transactions;
create policy "Shareholder transactions delete" on public.shareholder_transactions
for delete using (true);

-- ============================================================================
-- 5) REALTIME (ATIVE AS TABELAS PARA WEBSOCKET)
-- ============================================================================

do $$
begin
  -- Shareholders
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shareholders'
  ) then
    alter publication supabase_realtime add table public.shareholders;
  end if;

  -- Shareholder Transactions
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shareholder_transactions'
  ) then
    alter publication supabase_realtime add table public.shareholder_transactions;
  end if;
end $$;

-- ============================================================================
-- 6) SEED INICIAL
-- ============================================================================

-- Adicione dados iniciais se desejar
-- insert into public.shareholders (id, name, cpf, email, phone, pro_labore_value)
-- values (gen_random_uuid(), 'Sócio Padrão', '000.000.000-00', 'socio@example.com', '(00) 00000-0000', 0);

-- ============================================================================
-- 7) COMENTÁRIOS
-- ============================================================================

comment on table public.shareholders is 'Sócios da empresa';
comment on table public.shareholder_transactions is 'Movimentações financeiras dos sócios (créditos e débitos)';
comment on column public.shareholders.pro_labore_value is 'Valor mensal de pro-labore';
comment on column public.shareholders.current_balance is 'Saldo atual (a pagar)';
comment on column public.shareholders.recurrence_active is 'Se tem recorrência mensal ativa';
comment on column public.shareholder_transactions.type is 'credit (entrada) ou debit (saída)';

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================