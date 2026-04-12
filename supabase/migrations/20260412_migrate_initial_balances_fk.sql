-- ============================================================================
-- 📊 MIGRATION: Migrar Contas Bancárias Front/Backend p/ Nova Arquitetura
-- Data: 2026-04-12
-- Objetivo: Fazer initial_balances apontar para accounts e não bank_accounts
-- ============================================================================

-- 1. Dropar a chave estrangeira antiga que aponta para bank_accounts
ALTER TABLE public.initial_balances
DROP CONSTRAINT IF EXISTS initial_balances_account_id_fkey;

-- 2. Limpar a tabela de saldos iniciais para tirar sujeira da tabela legada
-- Evita erro de constraint caso os IDs antigos ainda estejam lá
TRUNCATE TABLE public.initial_balances CASCADE;

-- 3. Adicionar a nova chave que aponta para public.accounts
ALTER TABLE public.initial_balances
ADD CONSTRAINT initial_balances_account_id_fkey
FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

-- 4. Atualizar RLS/Privilrégios caso necessário
GRANT ALL ON TABLE public.initial_balances TO authenticated;
