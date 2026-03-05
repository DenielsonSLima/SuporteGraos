-- Diagnóstico rápido: pedidos canônicos somem no frontend (ops_sales_orders / ops_purchase_orders)
-- Execute no Supabase SQL Editor

-- 1) Estado de RLS nas tabelas canônicas
SELECT schemaname, tablename, rowsecurity, hasrules
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('ops_sales_orders', 'ops_purchase_orders');

-- 2) Policies efetivas nas duas tabelas
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('ops_sales_orders', 'ops_purchase_orders')
ORDER BY tablename, policyname;

-- 3) Confirma função de empresa usada pelo RLS
SELECT proname, prosrc
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('my_company_id', 'fn_ops_my_company_id');

-- 4) Distribuição real por empresa (se o pedido está em outra company_id, some no frontend)
SELECT 'ops_sales_orders' AS table_name, company_id, COUNT(*) AS rows
FROM public.ops_sales_orders
GROUP BY company_id
UNION ALL
SELECT 'ops_purchase_orders' AS table_name, company_id, COUNT(*) AS rows
FROM public.ops_purchase_orders
GROUP BY company_id
ORDER BY table_name, rows DESC;

-- 5) Últimos registros para inspeção manual (inclui legacy_id)
SELECT id, legacy_id, company_id, number, order_date, status, created_at
FROM public.ops_sales_orders
ORDER BY created_at DESC
LIMIT 20;

SELECT id, legacy_id, company_id, number, order_date, status, created_at
FROM public.ops_purchase_orders
ORDER BY created_at DESC
LIMIT 20;

-- 6) Verifique o vínculo do usuário no app_users (troque pelo auth_user_id real da sessão)
-- Dica: pegue o UUID da sessão no JWT/sub ou em auth.users
-- Exemplo:
-- SELECT id, auth_user_id, email, role, active, company_id
-- FROM public.app_users
-- WHERE auth_user_id = '00000000-0000-0000-0000-000000000000'::uuid;

-- 7) Se quiser testar visibilidade por empresa específica, use:
-- SELECT id, number, company_id, order_date
-- FROM public.ops_sales_orders
-- WHERE company_id = '00000000-0000-0000-0000-000000000000'::uuid
-- ORDER BY order_date DESC;
