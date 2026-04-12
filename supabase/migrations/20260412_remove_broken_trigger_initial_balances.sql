-- ============================================================================
-- 📊 MIGRATION: Remover Trigger Quebrada de Saldos Iniciais
-- Data: 2026-04-12
-- Objetivo: A trigger trg_initial_balances_recalc_account_balance chamava 
-- fn_update_account_balance que pertencia à tabela de transações, causando 
-- erro ao inserir saldos iniciais pela interface. As RPCs já manipulam os saldos.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_initial_balances_recalc_account_balance ON public.initial_balances;
