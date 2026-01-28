-- ============================================================================
-- SCRIPT SUPABASE: AUDITORIA DE RELATÓRIOS
-- Módulo: Rastreamento de acesso e exportação de relatórios
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ============================================================================
-- 1) TABELAS
-- ============================================================================

-- 1.1 LOGS DE ACESSO A RELATÓRIOS
create table if not exists public.report_access_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  report_id text not null,
  report_title text not null,
  filters jsonb,
  records_count integer default 0,
  exported_to_pdf boolean default false,
  access_time timestamptz not null default timezone('utc'::text, now()),
  company_id uuid,
  created_at timestamptz not null default timezone('utc'::text, now())
);

-- ============================================================================
-- 2) ÍNDICES PARA PERFORMANCE
-- ============================================================================

create index if not exists idx_report_logs_user on public.report_access_logs(user_id);
create index if not exists idx_report_logs_report on public.report_access_logs(report_id);
create index if not exists idx_report_logs_access_time on public.report_access_logs(access_time);
create index if not exists idx_report_logs_pdf on public.report_access_logs(exported_to_pdf);
create index if not exists idx_report_logs_company on public.report_access_logs(company_id);

-- ============================================================================
-- 3) ROW LEVEL SECURITY (RLS)
-- ============================================================================

alter table public.report_access_logs enable row level security;

-- REPORT ACCESS LOGS (Logs de Acesso a Relatórios)
drop policy if exists "ReportLogs select" on public.report_access_logs;
create policy "ReportLogs select" on public.report_access_logs
for select using (true);

drop policy if exists "ReportLogs insert" on public.report_access_logs;
create policy "ReportLogs insert" on public.report_access_logs
for insert with check (true);

-- ============================================================================
-- 4) REALTIME (ATIVE AS TABELAS PARA WEBSOCKET)
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'report_access_logs'
  ) then
    alter publication supabase_realtime add table public.report_access_logs;
  end if;
end $$ language plpgsql;

-- ============================================================================
-- 5) COMENTÁRIOS
-- ============================================================================

comment on table public.report_access_logs is 'Logs de acesso e exportação de relatórios para auditoria';
comment on column public.report_access_logs.report_id is 'ID único do relatório (ex: payables_open, freight_general)';
comment on column public.report_access_logs.exported_to_pdf is 'Se o relatório foi exportado em PDF';
comment on column public.report_access_logs.access_time is 'Timestamp do acesso ao relatório';
