-- Script de implantacao Supabase para Tipos e Categorias de Despesas
-- Ordem: Tabelas -> RLS -> Realtime -> Seed

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1) Tabela de Tipos de Despesas (fixed, variable, administrative)
create table if not exists public.expense_types (
  id text primary key,
  name text not null unique,
  type_key text not null unique check (type_key in ('fixed', 'variable', 'administrative', 'custom')),
  color text not null,
  icon text null,
  is_system boolean not null default false,
  company_id uuid null references public.companies(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 2) Tabela de Categorias de Despesas (subcategorias dentro de cada tipo)
create table if not exists public.expense_categories (
  id text primary key,
  expense_type_id text not null references public.expense_types(id) on delete cascade,
  name text not null,
  description text null,
  is_system boolean not null default false,
  company_id uuid null references public.companies(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint expense_categories_name_type_unique unique (expense_type_id, name)
);

create index if not exists idx_expense_types_type_key on public.expense_types(type_key);
create index if not exists idx_expense_categories_type_id on public.expense_categories(expense_type_id);

create or replace function public.update_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_expense_types_updated_at on public.expense_types;
create trigger trg_expense_types_updated_at
before update on public.expense_types
for each row execute function public.update_updated_at();

drop trigger if exists trg_expense_categories_updated_at on public.expense_categories;
create trigger trg_expense_categories_updated_at
before update on public.expense_categories
for each row execute function public.update_updated_at();

-- 2) RLS
alter table public.expense_types enable row level security;
alter table public.expense_categories enable row level security;

drop policy if exists "Expense types select" on public.expense_types;
create policy "Expense types select" on public.expense_types
for select to authenticated, anon using (true);

drop policy if exists "Expense types insert" on public.expense_types;
create policy "Expense types insert" on public.expense_types
for insert to authenticated, anon with check (true);

drop policy if exists "Expense types update" on public.expense_types;
create policy "Expense types update" on public.expense_types
for update to authenticated, anon using (true) with check (true);

drop policy if exists "Expense types delete" on public.expense_types;
create policy "Expense types delete" on public.expense_types
for delete to authenticated, anon using (false);

drop policy if exists "Expense categories select" on public.expense_categories;
create policy "Expense categories select" on public.expense_categories
for select to authenticated, anon using (true);

drop policy if exists "Expense categories insert" on public.expense_categories;
create policy "Expense categories insert" on public.expense_categories
for insert to authenticated, anon with check (true);

drop policy if exists "Expense categories update" on public.expense_categories;
create policy "Expense categories update" on public.expense_categories
for update to authenticated, anon using (true) with check (true);

drop policy if exists "Expense categories delete" on public.expense_categories;
create policy "Expense categories delete" on public.expense_categories
for delete to authenticated, anon using (false);

-- 3) Realtime

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'expense_types'
  ) then
    alter publication supabase_realtime add table public.expense_types;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'expense_categories'
  ) then
    alter publication supabase_realtime add table public.expense_categories;
  end if;
end $$;

-- 4) Seed inicial (idempotente)

-- Seed Tipos de Despesas
insert into public.expense_types (id, name, type_key, color, icon, is_system, company_id)
values
  ('1', 'Despesas Fixas', 'fixed', 'bg-blue-50 text-blue-700 border-blue-200', 'Anchor', true, null),
  ('2', 'Despesas Variáveis', 'variable', 'bg-amber-50 text-amber-700 border-amber-200', 'TrendingUp', true, null),
  ('3', 'Despesas Administrativas', 'administrative', 'bg-slate-50 text-slate-700 border-slate-200', 'Briefcase', true, null)
on conflict (id) do update
  set name = excluded.name,
      type_key = excluded.type_key,
      color = excluded.color,
      icon = excluded.icon,
      is_system = excluded.is_system;

-- Seed Categorias de Despesas (subcategorias)
insert into public.expense_categories (id, expense_type_id, name, description, is_system, company_id)
values
  -- Fixas
  ('f1', '1', 'Salários', 'Pagamento de funcionários e colaboradores', true, null),
  ('f2', '1', 'Aluguel', 'Aluguel de imóveis e espaços', true, null),
  ('f3', '1', 'Segurança', 'Serviços de segurança patrimonial', true, null),
  ('f4', '1', 'Internet / Telefonia', 'Serviços de telecomunicações', true, null),
  ('f5', '1', 'Energia Elétrica', 'Contas de energia elétrica', true, null),
  ('f6', '1', 'Água e Esgoto', 'Contas de água e saneamento', true, null),
  ('f7', '1', 'IPTU', 'Imposto Predial e Territorial Urbano', true, null),
  ('f8', '1', 'Seguros', 'Seguros diversos (patrimonial, veículos, etc)', true, null),
  ('f9', '1', 'Encargos Trabalhistas', 'INSS, FGTS e outros encargos', true, null),
  ('f10', '1', 'Depreciação', 'Depreciação de bens e equipamentos', true, null),
  
  -- Variáveis
  ('v1', '2', 'Comissões de Venda', 'Comissões pagas sobre vendas realizadas', true, null),
  ('v2', '2', 'Fretes', 'Custos com transporte e logística', true, null),
  ('v3', '2', 'Manutenção de Veículos', 'Reparos e manutenção da frota', true, null),
  ('v4', '2', 'Combustível', 'Abastecimento de veículos', true, null),
  ('v5', '2', 'Corretagem', 'Comissões de corretores', true, null),
  ('v6', '2', 'Embalagens', 'Materiais de embalagem e acondicionamento', true, null),
  ('v7', '2', 'Armazenagem', 'Custos de armazenamento e silos', true, null),
  ('v8', '2', 'Análise de Qualidade', 'Classificação e análise de grãos', true, null),
  ('v9', '2', 'Marketing e Publicidade', 'Divulgação e propaganda', true, null),
  ('v10', '2', 'Viagens e Estadias', 'Despesas com deslocamento', true, null),
  ('v11', '2', 'Taxas Bancárias', 'Tarifas e taxas de bancos', true, null),
  ('v12', '2', 'Pesagem e Movimentação', 'Custos de pesagem e movimentação de cargas', true, null),
  
  -- Administrativas
  ('a1', '3', 'Sistemas / Software', 'Licenças e assinaturas de software', true, null),
  ('a2', '3', 'Material de Escritório', 'Papelaria e suprimentos', true, null),
  ('a3', '3', 'Contabilidade', 'Serviços contábeis e fiscais', true, null),
  ('a4', '3', 'Limpeza e Copa', 'Serviços de limpeza e mantimentos', true, null),
  ('a5', '3', 'Assessoria Jurídica', 'Honorários advocatícios e consultoria', true, null),
  ('a6', '3', 'Recursos Humanos', 'Recrutamento, seleção e treinamento', true, null),
  ('a7', '3', 'Despesas Bancárias', 'Manutenção de contas e serviços', true, null),
  ('a8', '3', 'Certificações', 'Certificados e registros diversos', true, null),
  ('a9', '3', 'Multas e Juros', 'Penalidades e encargos por atraso', true, null),
  ('a10', '3', 'Doações', 'Doações e contribuições', true, null)
on conflict (id) do update
  set name = excluded.name,
      description = excluded.description,
      is_system = excluded.is_system;
