-- ============================================================
-- Migration: Corrigir RLS policies e REPLICA IDENTITY
-- Data: 2026-02-23
-- Problema:
--   1. assets: só tem 1 policy ALL → precisa 4 separadas
--   2. financial_transactions: falta UPDATE e DELETE policies
--   3. REPLICA IDENTITY DEFAULT em todas → precisa FULL para
--      Supabase Realtime enviar dados completos em UPDATE/DELETE
-- ============================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │ 1. ASSETS: Substituir 1 ALL por 4 policies separadas   │
-- └─────────────────────────────────────────────────────────┘

-- Remover a policy ALL existente
DROP POLICY IF EXISTS assets_company_isolation ON public.assets;

-- SELECT: só vê dados da própria empresa
CREATE POLICY assets_select ON public.assets
  FOR SELECT
  USING (company_id = public.my_company_id());

-- INSERT: só insere na própria empresa
CREATE POLICY assets_insert ON public.assets
  FOR INSERT
  WITH CHECK (company_id = public.my_company_id());

-- UPDATE: só atualiza dados da própria empresa
CREATE POLICY assets_update ON public.assets
  FOR UPDATE
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- DELETE: só deleta dados da própria empresa
CREATE POLICY assets_delete ON public.assets
  FOR DELETE
  USING (company_id = public.my_company_id());

-- ┌─────────────────────────────────────────────────────────┐
-- │ 2. FINANCIAL_TRANSACTIONS: Adicionar UPDATE + DELETE    │
-- └─────────────────────────────────────────────────────────┘

-- UPDATE: só atualiza transações da própria empresa
CREATE POLICY financial_transactions_update ON public.financial_transactions
  FOR UPDATE
  USING (company_id = public.my_company_id())
  WITH CHECK (company_id = public.my_company_id());

-- DELETE: só deleta transações da própria empresa
CREATE POLICY financial_transactions_delete ON public.financial_transactions
  FOR DELETE
  USING (company_id = public.my_company_id());

-- ┌─────────────────────────────────────────────────────────┐
-- │ 3. REPLICA IDENTITY FULL para Realtime completo         │
-- │    Necessário para UPDATE/DELETE enviarem dados          │
-- │    completos no payload do Supabase Realtime             │
-- └─────────────────────────────────────────────────────────┘

ALTER TABLE public.assets REPLICA IDENTITY FULL;
ALTER TABLE public.financial_entries REPLICA IDENTITY FULL;
ALTER TABLE public.financial_transactions REPLICA IDENTITY FULL;
