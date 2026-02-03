-- Script de diagnóstico para problemas de exclusão em sales_orders
-- Execute no SQL Editor do Supabase

-- 1. Verificar políticas RLS da tabela sales_orders
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'sales_orders';

-- 2. Verificar se RLS está ativado
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'sales_orders';

-- 3. Verificar foreign keys que podem bloquear exclusão
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND (tc.table_name = 'sales_orders' OR ccu.table_name = 'sales_orders');

-- 4. Verificar se há registros órfãos em receivables
SELECT 
    r.id,
    r.sales_order_id,
    r.description,
    'Receivable órfão - sales_order não existe' as issue
FROM receivables r
LEFT JOIN sales_orders so ON r.sales_order_id = so.id
WHERE r.sales_order_id IS NOT NULL 
    AND so.id IS NULL;

-- 5. Verificar se há registros órfãos em logistics_loadings
SELECT 
    l.id,
    l.sales_order_id,
    l.purchase_order_number,
    'Loading órfão - sales_order não existe' as issue
FROM logistics_loadings l
LEFT JOIN sales_orders so ON l.sales_order_id = so.id
WHERE l.sales_order_id IS NOT NULL 
    AND so.id IS NULL;

-- ============================================
-- POSSÍVEIS SOLUÇÕES
-- ============================================

-- SOLUÇÃO 1: Habilitar RLS com política permissiva para DELETE
-- Descomente se necessário:

-- ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Allow delete for authenticated users" ON sales_orders
--     FOR DELETE
--     TO authenticated
--     USING (true);

-- SOLUÇÃO 2: Adicionar CASCADE nas foreign keys de receivables
-- Descomente se necessário (cuidado: apaga em cascata!):

-- ALTER TABLE receivables 
--     DROP CONSTRAINT IF EXISTS receivables_sales_order_id_fkey,
--     ADD CONSTRAINT receivables_sales_order_id_fkey 
--         FOREIGN KEY (sales_order_id) 
--         REFERENCES sales_orders(id) 
--         ON DELETE CASCADE;

-- SOLUÇÃO 3: Remover constraint de logistics_loadings (não apagar em cascata)
-- Descomente se necessário:

-- ALTER TABLE logistics_loadings 
--     DROP CONSTRAINT IF EXISTS logistics_loadings_sales_order_id_fkey,
--     ADD CONSTRAINT logistics_loadings_sales_order_id_fkey 
--         FOREIGN KEY (sales_order_id) 
--         REFERENCES sales_orders(id) 
--         ON DELETE SET NULL;
