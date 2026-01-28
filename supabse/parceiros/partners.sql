-- Script de implantação Supabase para Parceiros (Fase 2)
-- Ordem: Tabelas -> RLS -> Realtime -> Seed

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1) TABELAS (ORDEM CORRETA DE DEPENDÊNCIAS)
-- ============================================================================

-- Tabela de Transportadoras (empresas de transporte terceirizadas)
-- Sem dependências, criar primeiro
create table if not exists public.transporters (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  document text not null unique, -- CNPJ
  phone text,
  email text,
  active boolean not null default true,
  company_id uuid null references public.companies(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Tabela de Parceiros (Clientes, Fornecedores, etc)
-- Precisa existir ANTES de vehicles e partner_addresses
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text not null unique, -- CPF ou CNPJ
  type text not null check (type in ('PF', 'PJ')),
  partner_type_id text not null references public.partner_types(id),
  email text,
  phone text,
  mobile_phone text,
  website text,
  notes text,
  active boolean not null default true,
  company_id uuid null references public.companies(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Tabela de Veículos (pertence a parceiro ou transportadora)
-- Agora partners já existe
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  plate text not null unique,
  type text not null check (type in ('truck', 'container', 'van', 'car', 'motorcycle', 'other')),
  capacity_kg decimal(12,2),
  owner_type text not null check (owner_type in ('own', 'third_party')),
  owner_partner_id uuid null references public.partners(id) on delete set null,
  owner_transporter_id uuid null references public.transporters(id) on delete set null,
  year integer,
  model text,
  color text,
  active boolean not null default true,
  company_id uuid null references public.companies(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Tabela de Motoristas
create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text not null unique, -- CPF
  license_number text not null unique,
  license_expiry_date date,
  phone text,
  email text,
  birth_date date,
  address text,
  city_id bigint null references public.cities(id),
  state_id bigint null references public.ufs(id),
  active boolean not null default true,
  company_id uuid null references public.companies(id),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Tabela de Endereços dos Parceiros
-- Agora partners já existe
create table if not exists public.partner_addresses (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  street text not null,
  number text,
  complement text,
  neighborhood text,
  city_id bigint references public.cities(id),
  state_id bigint references public.ufs(id),
  zip_code text,
  address_type text not null check (address_type in ('billing', 'shipping', 'main', 'warehouse')),
  is_primary boolean not null default false,
  coordinates text, -- JSON: {"lat": -23.5505, "lng": -46.6333}
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Ajuste idempotente: garantir que city_id/state_id aceitam NULL, caso versões anteriores tenham NOT NULL
do $$
begin
  begin
    alter table public.partner_addresses alter column city_id drop not null;
  exception when others then
    -- ignora se já está sem NOT NULL
    null;
  end;
  begin
    alter table public.partner_addresses alter column state_id drop not null;
  exception when others then
    null;
  end;
end $$;

-- Tabela de Contatos dos Parceiros (pessoas específicas para contato)
-- Agora partners já existe
create table if not exists public.partner_contacts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  mobile_phone text,
  department text,
  job_title text,
  contact_type text not null check (contact_type in ('commercial', 'financial', 'operational', 'technical', 'general')),
  is_primary boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Tabela de Histórico de Relacionamento (auditoria)
-- Agora partners já existe
create table if not exists public.partner_history (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  action text not null check (action in ('created', 'updated', 'reactivated', 'deactivated', 'contacted', 'quoted', 'ordered')),
  description text,
  changed_by uuid, -- referência a auth.users
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- ============================================================================
-- 2) ÍNDICES PARA PERFORMANCE
-- ============================================================================

create index if not exists idx_vehicles_owner_partner_id on public.vehicles(owner_partner_id);
create index if not exists idx_vehicles_owner_transporter_id on public.vehicles(owner_transporter_id);
create index if not exists idx_vehicles_plate on public.vehicles(plate);
create index if not exists idx_drivers_document on public.drivers(document);
create index if not exists idx_drivers_city_id on public.drivers(city_id);
create index if not exists idx_transporters_document on public.transporters(document);
create index if not exists idx_partners_document on public.partners(document);
create index if not exists idx_partners_partner_type_id on public.partners(partner_type_id);
create index if not exists idx_partners_company_id on public.partners(company_id);
create index if not exists idx_partner_addresses_partner_id on public.partner_addresses(partner_id);
create index if not exists idx_partner_addresses_city_id on public.partner_addresses(city_id);
create index if not exists idx_partner_contacts_partner_id on public.partner_contacts(partner_id);
create index if not exists idx_partner_history_partner_id on public.partner_history(partner_id);

-- ============================================================================
-- 3) TRIGGERS PARA UPDATE AUTOMÁTICO
-- ============================================================================

create or replace function public.update_updated_at() returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_transporters_updated_at on public.transporters;
create trigger trg_transporters_updated_at
before update on public.transporters
for each row execute function public.update_updated_at();

drop trigger if exists trg_vehicles_updated_at on public.vehicles;
create trigger trg_vehicles_updated_at
before update on public.vehicles
for each row execute function public.update_updated_at();

drop trigger if exists trg_drivers_updated_at on public.drivers;
create trigger trg_drivers_updated_at
before update on public.drivers
for each row execute function public.update_updated_at();

drop trigger if exists trg_partners_updated_at on public.partners;
create trigger trg_partners_updated_at
before update on public.partners
for each row execute function public.update_updated_at();

drop trigger if exists trg_partner_addresses_updated_at on public.partner_addresses;
create trigger trg_partner_addresses_updated_at
before update on public.partner_addresses
for each row execute function public.update_updated_at();

drop trigger if exists trg_partner_contacts_updated_at on public.partner_contacts;
create trigger trg_partner_contacts_updated_at
before update on public.partner_contacts
for each row execute function public.update_updated_at();

-- ============================================================================
-- 4) ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Transporters RLS
alter table public.transporters enable row level security;

drop policy if exists "Transporters select" on public.transporters;
create policy "Transporters select" on public.transporters
for select to authenticated, anon using (true);

drop policy if exists "Transporters insert" on public.transporters;
create policy "Transporters insert" on public.transporters
for insert to authenticated, anon with check (true);

drop policy if exists "Transporters update" on public.transporters;
create policy "Transporters update" on public.transporters
for update to authenticated, anon using (true) with check (true);

drop policy if exists "Transporters delete" on public.transporters;
create policy "Transporters delete" on public.transporters
for delete to authenticated, anon using (true);

-- Vehicles RLS
alter table public.vehicles enable row level security;

drop policy if exists "Vehicles select" on public.vehicles;
create policy "Vehicles select" on public.vehicles
for select to authenticated, anon using (true);

drop policy if exists "Vehicles insert" on public.vehicles;
create policy "Vehicles insert" on public.vehicles
for insert to authenticated, anon with check (true);

drop policy if exists "Vehicles update" on public.vehicles;
create policy "Vehicles update" on public.vehicles
for update to authenticated, anon using (true) with check (true);

drop policy if exists "Vehicles delete" on public.vehicles;
create policy "Vehicles delete" on public.vehicles
for delete to authenticated, anon using (true);

-- Drivers RLS
alter table public.drivers enable row level security;

drop policy if exists "Drivers select" on public.drivers;
create policy "Drivers select" on public.drivers
for select to authenticated, anon using (true);

drop policy if exists "Drivers insert" on public.drivers;
create policy "Drivers insert" on public.drivers
for insert to authenticated, anon with check (true);

drop policy if exists "Drivers update" on public.drivers;
create policy "Drivers update" on public.drivers
for update to authenticated, anon using (true) with check (true);

drop policy if exists "Drivers delete" on public.drivers;
create policy "Drivers delete" on public.drivers
for delete to authenticated, anon using (true);

-- Partners RLS
alter table public.partners enable row level security;

drop policy if exists "Partners select" on public.partners;
create policy "Partners select" on public.partners
for select to authenticated, anon using (true);

drop policy if exists "Partners insert" on public.partners;
create policy "Partners insert" on public.partners
for insert to authenticated, anon with check (true);

drop policy if exists "Partners update" on public.partners;
create policy "Partners update" on public.partners
for update to authenticated, anon using (true) with check (true);

drop policy if exists "Partners delete" on public.partners;
create policy "Partners delete" on public.partners
for delete to authenticated, anon using (true);

-- Partner Addresses RLS
alter table public.partner_addresses enable row level security;

drop policy if exists "Partner addresses select" on public.partner_addresses;
create policy "Partner addresses select" on public.partner_addresses
for select to authenticated, anon using (true);

drop policy if exists "Partner addresses insert" on public.partner_addresses;
create policy "Partner addresses insert" on public.partner_addresses
for insert to authenticated, anon with check (true);

drop policy if exists "Partner addresses update" on public.partner_addresses;
create policy "Partner addresses update" on public.partner_addresses
for update to authenticated, anon using (true) with check (true);

drop policy if exists "Partner addresses delete" on public.partner_addresses;
create policy "Partner addresses delete" on public.partner_addresses
for delete to authenticated, anon using (true);

-- Partner Contacts RLS
alter table public.partner_contacts enable row level security;

drop policy if exists "Partner contacts select" on public.partner_contacts;
create policy "Partner contacts select" on public.partner_contacts
for select to authenticated, anon using (true);

drop policy if exists "Partner contacts insert" on public.partner_contacts;
create policy "Partner contacts insert" on public.partner_contacts
for insert to authenticated, anon with check (true);

drop policy if exists "Partner contacts update" on public.partner_contacts;
create policy "Partner contacts update" on public.partner_contacts
for update to authenticated, anon using (true) with check (true);

drop policy if exists "Partner contacts delete" on public.partner_contacts;
create policy "Partner contacts delete" on public.partner_contacts
for delete to authenticated, anon using (true);

-- Partner History RLS (apenas leitura, sem delete)
alter table public.partner_history enable row level security;

drop policy if exists "Partner history select" on public.partner_history;
create policy "Partner history select" on public.partner_history
for select to authenticated, anon using (true);

drop policy if exists "Partner history insert" on public.partner_history;
create policy "Partner history insert" on public.partner_history
for insert to authenticated, anon with check (true);

-- ============================================================================
-- 5) REALTIME (ATIVE AS TABELAS PARA WEBSOCKET)
-- ============================================================================

do $$
begin
  -- Transporters
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transporters'
  ) then
    alter publication supabase_realtime add table public.transporters;
  end if;

  -- Vehicles
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vehicles'
  ) then
    alter publication supabase_realtime add table public.vehicles;
  end if;

  -- Drivers
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'drivers'
  ) then
    alter publication supabase_realtime add table public.drivers;
  end if;

  -- Partners
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'partners'
  ) then
    alter publication supabase_realtime add table public.partners;
  end if;

  -- Partner Addresses
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'partner_addresses'
  ) then
    alter publication supabase_realtime add table public.partner_addresses;
  end if;

  -- Partner Contacts
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'partner_contacts'
  ) then
    alter publication supabase_realtime add table public.partner_contacts;
  end if;

  -- Partner History
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'partner_history'
  ) then
    alter publication supabase_realtime add table public.partner_history;
  end if;
end $$;

-- ============================================================================
-- 6) SEED INICIAL (DADOS PADRÃO)
-- ============================================================================

-- Inserir transportadora padrão "Próprio"
insert into public.transporters (id, name, document, phone, email, active, company_id)
values (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'Transporte Próprio',
  '00.000.000/0000-00',
  null,
  null,
  true,
  null
)
on conflict (name) do nothing;

-- Exemplos de tipos de parceiros (já devem existir da fase 1)
-- SELECT * FROM partner_types;
-- Tipos esperados: Fornecedor, Cliente, Transportadora, Intermediário

-- ============================================================================
-- 7) COMENTÁRIOS DAS TABELAS
-- ============================================================================

comment on table public.partners is 'Cadastro de parceiros: clientes, fornecedores, transportadoras, etc';
comment on table public.partner_addresses is 'Múltiplos endereços por parceiro (cobrança, entrega, matriz, filial)';
comment on table public.partner_contacts is 'Contatos específicos dentro de cada parceiro (pessoas para contato)';
comment on table public.vehicles is 'Veículos próprios ou de terceiros para transporte';
comment on table public.drivers is 'Motoristas com licença de condução';
comment on table public.transporters is 'Empresas de transporte terceirizadas';
comment on table public.partner_history is 'Histórico de ações/eventos com cada parceiro (auditoria)';

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
-- Próximos Passos:
-- 1. Verificar se todas as tabelas foram criadas
-- 2. Integrar no frontend (criar services TypeScript)
-- 3. Configurar listeners de Realtime no frontend
-- ============================================================================
