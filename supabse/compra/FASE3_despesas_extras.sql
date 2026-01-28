-- FASE 3 - DESPESAS EXTRAS DO PEDIDO DE COMPRA
-- Data: 2026-01-25
-- Integração: Sincroniza despesas da tabela purchase_expenses com metadata do pedido

-- =====================================================================
-- ESTRUTURA
-- =====================================================================
-- Tabela já criada no FASE3_compra.sql
-- Esta fase adiciona apenas a integração no frontend

-- =====================================================================
-- EXEMPLO DE CONSULTA (Despesas por Pedido)
-- =====================================================================
-- SELECT 
--   po.number AS pedido,
--   po.total_value AS valor_produtos,
--   COALESCE(SUM(pe.value), 0) AS despesas_extras,
--   po.total_value + COALESCE(SUM(pe.value), 0) AS custo_total
-- FROM public.purchase_orders po
-- LEFT JOIN public.purchase_expenses pe ON pe.purchase_order_id = po.id
-- GROUP BY po.id, po.number, po.total_value;

-- =====================================================================
-- EXEMPLO DE CRUD (Despesas)
-- =====================================================================
-- 1) INSERT despesa
-- INSERT INTO public.purchase_expenses (
--   purchase_order_id, 
--   expense_category_id, 
--   description, 
--   value, 
--   expense_date
-- ) VALUES (
--   '<pedido_id>', 
--   '<categoria_id>', 
--   'Frete da carga', 
--   2500.00, 
--   CURRENT_DATE
-- );

-- 2) UPDATE despesa
-- UPDATE public.purchase_expenses 
-- SET value = 3000.00, notes = 'Valor ajustado'
-- WHERE id = '<despesa_id>';

-- 3) DELETE despesa
-- DELETE FROM public.purchase_expenses WHERE id = '<despesa_id>';

-- =====================================================================
-- REFERÊNCIAS
-- =====================================================================
-- Tabela: public.purchase_expenses
-- RLS: Já configurado no FASE3_compra.sql
-- Realtime: Já ativado no FASE3_compra.sql
-- Service: purchaseService.ts (funções para sync)
