-- ============================================================================
-- DESABILITAR RLS TEMPORARIAMENTE PARA TESTAR LOGIN
-- Execute este SQL no Supabase para verificar se o RLS está bloqueando
-- ============================================================================

-- Desabilitar RLS em todas as tabelas de usuário
alter table public.app_users disable row level security;
alter table public.login_attempts disable row level security;
alter table public.trusted_devices disable row level security;
alter table public.refresh_tokens disable row level security;

-- AVISO: Isso libera TOTAL acesso às tabelas!
-- Use APENAS para DEBUG, depois execute enable_rls_secure.sql
