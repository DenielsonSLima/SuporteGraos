# 🔧 Guia de Execução - SQL para Auditoria de Relatórios

## ⚠️ IMPORTANTE: Execute este SQL no Supabase antes de usar o módulo

### Passo a Passo

#### 1️⃣ Abra o Supabase Dashboard
- Vá para: https://app.supabase.com
- Selecione seu projeto
- Navegue para: **SQL Editor**

#### 2️⃣ Crie uma Nova Query
- Clique em: **+ New Query**
- Ou abra: **SQL Editor** > **+ New**

#### 3️⃣ Cole o Seguinte SQL

```sql
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
```

#### 4️⃣ Execute
- Clique em: **▶️ Run** (ou Ctrl+Enter)
- Aguarde a execução (geralmente < 2 segundos)

#### 5️⃣ Verifique a Criação
```sql
-- Teste: Verificar se tabela foi criada
select * from public.report_access_logs limit 1;

-- Deve retornar: (no rows, 0 columns) - isso é OK, significa vazio mas criado
```

---

## ✅ Verificação Pós-Execução

### Query 1: Confirmar Tabela
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'report_access_logs';
```
✅ Deve retornar: `report_access_logs`

### Query 2: Confirmar Índices
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'report_access_logs';
```
✅ Deve retornar: 5 índices (idx_report_logs_*)

### Query 3: Confirmar RLS
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'report_access_logs';
```
✅ Deve mostrar: `rowsecurity = true`

### Query 4: Confirmar Realtime
```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'report_access_logs';
```
✅ Deve retornar: `report_access_logs`

---

## 🚨 Se Algo Falhar

### Erro: "já existe"
Se receber erro que a tabela já existe:
- É normal! Significa que o SQL foi executado antes
- Você pode: 
  - Continuar (tabela está ok)
  - Ou limpar e refazer: 
    ```sql
    drop table if exists public.report_access_logs cascade;
    -- Depois execute o SQL acima novamente
    ```

### Erro: "permission denied"
- Verifique se está usando a role correta (geralmente "postgres" no Supabase)
- Pode ser necessário ser admin do projeto

### Realtime não funciona
- Verifique em **Project Settings** > **Realtime** se está habilitado
- Reinicie o cliente realtime no app

---

## 📋 O que foi criado

| Item | Tipo | Status |
|------|------|--------|
| `report_access_logs` | Tabela | ✅ |
| 5 Índices de Performance | Índices | ✅ |
| RLS Policies (select/insert) | Segurança | ✅ |
| Realtime Subscriptions | Streams | ✅ |
| UUID Primary Key | Campo | ✅ |

---

## 🎯 Próximo Passo

Depois de executar o SQL, o sistema estará pronto para:
1. Registrar acessos a relatórios automaticamente
2. Mostrar analytics em tempo real
3. Rastrear exportações em PDF

**Nenhuma outra ação necessária!** O código já está integrado e esperando pela tabela.

---

## 💡 Dica

Se preferir, você pode:
1. Copiar este SQL
2. Salvar em um arquivo `.sql`
3. Executar via: **SQL Editor** > **Open File** > Selecionar arquivo

Isso facilita a reutilização em outros projetos! 📂

