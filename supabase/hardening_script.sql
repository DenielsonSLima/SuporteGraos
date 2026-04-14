-- ==========================================
-- SCRIPT DE ENDURECIMENTO: SEGURANÇA E PERFORMANCE
-- Data: 2026-04-14
-- ==========================================

-- 1. CORREÇÃO DE VIEWs (SECURITY INVOKER)
-- Alterando para INVOKER para respeitar o RLS do usuário logado

ALTER VIEW vw_sales_orders_enriched SET (security_invoker = on);
ALTER VIEW vw_purchase_orders_enriched SET (security_invoker = on);
ALTER VIEW v_logistics_freights SET (security_invoker = on);
ALTER VIEW vw_payables_enriched SET (security_invoker = on);
ALTER VIEW vw_receivables_enriched SET (security_invoker = on);
ALTER VIEW v_payable_balances SET (security_invoker = on);
ALTER VIEW v_receivable_balances SET (security_invoker = on);

-- 2. IMPLEMENTAÇÃO DE RLS FALHANTE (Módulo Caixa - Tabelas DEF)

-- def_caixa_lancamentos
ALTER TABLE def_caixa_lancamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "def_caixa_lancamentos_select" ON def_caixa_lancamentos;
CREATE POLICY "def_caixa_lancamentos_select" ON def_caixa_lancamentos FOR SELECT USING (company_id = my_company_id());
DROP POLICY IF EXISTS "def_caixa_lancamentos_modify" ON def_caixa_lancamentos;
CREATE POLICY "def_caixa_lancamentos_modify" ON def_caixa_lancamentos FOR ALL USING (company_id = my_company_id()) WITH CHECK (company_id = my_company_id());

-- def_saldos_bancarios
ALTER TABLE def_saldos_bancarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "def_saldos_bancarios_select" ON def_saldos_bancarios;
CREATE POLICY "def_saldos_bancarios_select" ON def_saldos_bancarios FOR SELECT USING (company_id = my_company_id());
DROP POLICY IF EXISTS "def_saldos_bancarios_modify" ON def_saldos_bancarios;
CREATE POLICY "def_saldos_bancarios_modify" ON def_saldos_bancarios FOR ALL USING (company_id = my_company_id()) WITH CHECK (company_id = my_company_id());

-- def_creditos_em_aberto
ALTER TABLE def_creditos_em_aberto ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "def_creditos_em_aberto_select" ON def_creditos_em_aberto;
CREATE POLICY "def_creditos_em_aberto_select" ON def_creditos_em_aberto FOR SELECT USING (company_id = my_company_id());

-- def_debitos_em_aberto
ALTER TABLE def_debitos_em_aberto ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "def_debitos_em_aberto_select" ON def_debitos_em_aberto;
CREATE POLICY "def_debitos_em_aberto_select" ON def_debitos_em_aberto FOR SELECT USING (company_id = my_company_id());

-- 3. HARDENING DE FUNÇÕES (Search Path Seguro)
-- Evita ataques de mutação de search_path

ALTER FUNCTION rpc_get_caixa_consolidated_report SET search_path = public;
ALTER FUNCTION rpc_calc_caixa_bank_balances SET search_path = public;
ALTER FUNCTION rpc_calc_caixa_total_assets SET search_path = public;
ALTER FUNCTION rpc_calc_caixa_total_liabilities SET search_path = public;

-- 4. OTIMIZAÇÃO DE PERFORMANCE (ÍNDICES)

CREATE INDEX IF NOT EXISTS idx_admin_expenses_account_id ON admin_expenses(account_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_company_id ON bank_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_cities_company_id ON cities(company_id);
CREATE INDEX IF NOT EXISTS idx_def_entradas_realizadas_credito_id ON def_entradas_realizadas(credito_id);
CREATE INDEX IF NOT EXISTS idx_def_saidas_realizadas_debito_id ON def_saidas_realizadas(debito_id);
CREATE INDEX IF NOT EXISTS idx_def_pagamentos_po_debito_id ON def_pagamentos_pedido_compra(debito_id);
CREATE INDEX IF NOT EXISTS idx_ops_loadings_purchase_order_id ON ops_loadings(purchase_order_id);

-- Remover índice duplicado detectado
DROP INDEX IF EXISTS idx_financial_transactions_entry_id;

COMMIT;
