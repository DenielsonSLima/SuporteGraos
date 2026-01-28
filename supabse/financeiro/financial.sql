-- ============================================================================
-- SCRIPT SUPABASE: FINANCEIRO PRINCIPAL
-- Módulo: Contas a Pagar, Contas a Receber, Empréstimos, Adiantamentos, Histórico
-- Ordem: 1) Tabelas → 2) RLS → 3) Realtime
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1) TABELAS
-- ============================================================================

-- 1.1 CONTAS A PAGAR
create table if not exists public.payables (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid references public.purchase_orders(id),
  partner_id uuid not null references public.partners(id),
  partner_name text,
  description text not null,
  due_date date not null,
  amount numeric(15,2) not null,
  paid_amount numeric(15,2) default 0,
  status text not null check (status in ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled')) default 'pending',
  sub_type text check (sub_type in ('purchase_order', 'freight', 'commission', 'other')) default 'other',
  payment_method text,
  bank_account_id uuid references public.contas_bancarias(id),
  payment_date date,
  notes text,
  driver_name text,
  weight_kg numeric(10,2),
  company_id uuid references public.companies(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 1.2 CONTAS A RECEBER
create table if not exists public.receivables (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid references public.sales_orders(id),
  partner_id uuid not null references public.partners(id),
  description text not null,
  due_date date not null,
  amount numeric(15,2) not null,
  received_amount numeric(15,2) default 0,
  status text not null check (status in ('pending', 'partially_received', 'received', 'overdue', 'cancelled')) default 'pending',
  payment_method text,  -- 'bank_transfer', 'check', 'cash', 'pix'
  bank_account_id uuid references public.contas_bancarias(id),
  receipt_date date,
  notes text,
  company_id uuid references public.companies(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 1.3 EMPRÉSTIMOS
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references public.partners(id),  -- Banco/Instituição
  type text not null check (type in ('taken', 'given')),  -- recebido ou concedido
  amount numeric(15,2) not null,
  outstanding_balance numeric(15,2) not null,
  interest_rate numeric(5,2),  -- taxa de juros %
  contract_date date not null,
  due_date date not null,
  status text not null check (status in ('active', 'paid', 'defaulted', 'cancelled')) default 'active',
  notes text,
  company_id uuid references public.companies(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 1.4 ADIANTAMENTOS
create table if not exists public.advances (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id),
  type text not null check (type in ('given', 'received')),  -- dado ou recebido
  amount numeric(15,2) not null,
  outstanding_balance numeric(15,2) not null,
  advance_date date not null,
  related_type text,  -- 'purchase_order', 'sales_order'
  related_id uuid,    -- ID do pedido relacionado
  status text not null check (status in ('pending', 'settled', 'cancelled')) default 'pending',
  notes text,
  company_id uuid references public.companies(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 1.5 TRANSFERÊNCIAS ENTRE CONTAS
create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  from_account_id uuid not null references public.contas_bancarias(id),
  to_account_id uuid not null references public.contas_bancarias(id),
  amount numeric(15,2) not null,
  transfer_date date not null,
  description text not null,
  notes text,
  company_id uuid references public.companies(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint different_accounts check (from_account_id != to_account_id)
);

-- 1.6 HISTÓRICO FINANCEIRO GERAL
create table if not exists public.financial_history (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  type text not null,  -- 'payable', 'receivable', 'loan', 'advance', 'transfer', 'adjustment'
  operation text not null check (operation in ('inflow', 'outflow')),
  reference_type text,  -- tabela de origem
  reference_id uuid,    -- ID da entidade
  partner_id uuid references public.partners(id),
  description text not null,
  amount numeric(15,2) not null,
  balance_before numeric(15,2),
  balance_after numeric(15,2),
  bank_account_id uuid references public.contas_bancarias(id),
  notes text,
  company_id uuid references public.companies(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- ============================================================================
-- 2) ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Payables
create index if not exists idx_payables_purchase on public.payables(purchase_order_id);
create index if not exists idx_payables_partner on public.payables(partner_id);
create index if not exists idx_payables_status on public.payables(status);
create index if not exists idx_payables_due_date on public.payables(due_date);
create index if not exists idx_payables_company on public.payables(company_id);

-- Receivables
create index if not exists idx_receivables_sales on public.receivables(sales_order_id);
create index if not exists idx_receivables_partner on public.receivables(partner_id);
create index if not exists idx_receivables_status on public.receivables(status);
create index if not exists idx_receivables_due_date on public.receivables(due_date);
create index if not exists idx_receivables_company on public.receivables(company_id);

-- Loans
create index if not exists idx_loans_partner on public.loans(partner_id);
create index if not exists idx_loans_type on public.loans(type);
create index if not exists idx_loans_status on public.loans(status);
create index if not exists idx_loans_company on public.loans(company_id);

-- Advances
create index if not exists idx_advances_partner on public.advances(partner_id);
create index if not exists idx_advances_type on public.advances(type);
create index if not exists idx_advances_status on public.advances(status);
create index if not exists idx_advances_related on public.advances(related_type, related_id);
create index if not exists idx_advances_company on public.advances(company_id);

-- Transfers
create index if not exists idx_transfers_from on public.transfers(from_account_id);
create index if not exists idx_transfers_to on public.transfers(to_account_id);
create index if not exists idx_transfers_date on public.transfers(transfer_date);
create index if not exists idx_transfers_company on public.transfers(company_id);

-- Financial History
create index if not exists idx_financial_history_date on public.financial_history(date);
create index if not exists idx_financial_history_type on public.financial_history(type);
create index if not exists idx_financial_history_partner on public.financial_history(partner_id);
create index if not exists idx_financial_history_account on public.financial_history(bank_account_id);
create index if not exists idx_financial_history_company on public.financial_history(company_id);

-- ============================================================================
-- 3) TRIGGERS PARA UPDATE AUTOMÁTICO
-- ============================================================================

create or replace function public.update_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_payables_updated_at on public.payables;
create trigger trg_payables_updated_at
before update on public.payables
for each row execute function public.update_updated_at();

drop trigger if exists trg_receivables_updated_at on public.receivables;
create trigger trg_receivables_updated_at
before update on public.receivables
for each row execute function public.update_updated_at();

drop trigger if exists trg_loans_updated_at on public.loans;
create trigger trg_loans_updated_at
before update on public.loans
for each row execute function public.update_updated_at();

drop trigger if exists trg_advances_updated_at on public.advances;
create trigger trg_advances_updated_at
before update on public.advances
for each row execute function public.update_updated_at();

drop trigger if exists trg_transfers_updated_at on public.transfers;
create trigger trg_transfers_updated_at
before update on public.transfers
for each row execute function public.update_updated_at();

-- ============================================================================
-- 4) ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.payables enable row level security;
alter table public.receivables enable row level security;
alter table public.loans enable row level security;
alter table public.advances enable row level security;
alter table public.transfers enable row level security;
alter table public.financial_history enable row level security;

-- PAYABLES (Contas a Pagar)
drop policy if exists "Payables select" on public.payables;
create policy "Payables select" on public.payables
for select using (true);

drop policy if exists "Payables insert" on public.payables;
create policy "Payables insert" on public.payables
for insert with check (true);

drop policy if exists "Payables update" on public.payables;
create policy "Payables update" on public.payables
for update using (true) with check (true);

drop policy if exists "Payables delete" on public.payables;
create policy "Payables delete" on public.payables
for delete using (true);

-- RECEIVABLES (Contas a Receber)
drop policy if exists "Receivables select" on public.receivables;
create policy "Receivables select" on public.receivables
for select using (true);

drop policy if exists "Receivables insert" on public.receivables;
create policy "Receivables insert" on public.receivables
for insert with check (true);

drop policy if exists "Receivables update" on public.receivables;
create policy "Receivables update" on public.receivables
for update using (true) with check (true);

drop policy if exists "Receivables delete" on public.receivables;
create policy "Receivables delete" on public.receivables
for delete using (true);

-- LOANS (Empréstimos)
drop policy if exists "Loans select" on public.loans;
create policy "Loans select" on public.loans
for select using (true);

drop policy if exists "Loans insert" on public.loans;
create policy "Loans insert" on public.loans
for insert with check (true);

drop policy if exists "Loans update" on public.loans;
create policy "Loans update" on public.loans
for update using (true) with check (true);

drop policy if exists "Loans delete" on public.loans;
create policy "Loans delete" on public.loans
for delete using (true);

-- ADVANCES (Adiantamentos)
drop policy if exists "Advances select" on public.advances;
create policy "Advances select" on public.advances
for select using (true);

drop policy if exists "Advances insert" on public.advances;
create policy "Advances insert" on public.advances
for insert with check (true);

drop policy if exists "Advances update" on public.advances;
create policy "Advances update" on public.advances
for update using (true) with check (true);

drop policy if exists "Advances delete" on public.advances;
create policy "Advances delete" on public.advances
for delete using (true);

-- TRANSFERS (Transferências)
drop policy if exists "Transfers select" on public.transfers;
create policy "Transfers select" on public.transfers
for select using (true);

drop policy if exists "Transfers insert" on public.transfers;
create policy "Transfers insert" on public.transfers
for insert with check (true);

drop policy if exists "Transfers update" on public.transfers;
create policy "Transfers update" on public.transfers
for update using (true) with check (true);

drop policy if exists "Transfers delete" on public.transfers;
create policy "Transfers delete" on public.transfers
for delete using (true);

-- FINANCIAL HISTORY (Histórico)
drop policy if exists "FinancialHistory select" on public.financial_history;
create policy "FinancialHistory select" on public.financial_history
for select using (true);

drop policy if exists "FinancialHistory insert" on public.financial_history;
create policy "FinancialHistory insert" on public.financial_history
for insert with check (true);

drop policy if exists "FinancialHistory update" on public.financial_history;
create policy "FinancialHistory update" on public.financial_history
for update using (true) with check (true);

drop policy if exists "FinancialHistory delete" on public.financial_history;
create policy "FinancialHistory delete" on public.financial_history
for delete using (true);

-- ============================================================================
-- 5) REALTIME (ATIVE AS TABELAS PARA WEBSOCKET)
-- ============================================================================

do $$
begin
  -- Payables
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'payables'
  ) then
    alter publication supabase_realtime add table public.payables;
  end if;

  -- Receivables
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'receivables'
  ) then
    alter publication supabase_realtime add table public.receivables;
  end if;

  -- Loans
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'loans'
  ) then
    alter publication supabase_realtime add table public.loans;
  end if;

  -- Advances
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'advances'
  ) then
    alter publication supabase_realtime add table public.advances;
  end if;

  -- Transfers
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transfers'
  ) then
    alter publication supabase_realtime add table public.transfers;
  end if;

  -- Financial History
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'financial_history'
  ) then
    alter publication supabase_realtime add table public.financial_history;
  end if;
end $$ language plpgsql;

-- ============================================================================
-- 6) COMENTÁRIOS
-- ============================================================================

comment on table public.payables is 'Contas a pagar (fornecedores, despesas)';
comment on table public.receivables is 'Contas a receber (clientes, vendas)';
comment on table public.loans is 'Empréstimos recebidos ou concedidos';
comment on table public.advances is 'Adiantamentos dados ou recebidos';
comment on table public.financial_history is 'Histórico geral de movimentações financeiras';

comment on column public.payables.status is 'pending, partially_paid, paid, overdue, cancelled';
comment on column public.receivables.status is 'pending, partially_received, received, overdue, cancelled';
comment on column public.loans.type is 'taken (recebido) ou given (concedido)';
comment on column public.advances.type is 'given (dado) ou received (recebido)';
comment on column public.financial_history.operation is 'inflow (entrada) ou outflow (saída)';

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
-- Para executar no Supabase:
-- 1. Copie todo o conteúdo acima
-- 2. Vá para: SQL Editor > New Query
-- 3. Cole o conteúdo
-- 4. Clique em "Run"
-- 5. Aguarde a confirmação de sucesso
-- 
-- IMPORTANTE: Certifique-se que as tabelas referenciadas já existem:
-- - partners
-- - purchase_orders
-- - sales_orders
-- - contas_bancarias
-- - companies
