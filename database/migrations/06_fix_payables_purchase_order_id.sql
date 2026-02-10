-- ============================================================================
-- VERIFICAR E CORRIGIR A TABELA PAYABLES
-- Execute este script no Supabase SQL Editor
-- ============================================================================

-- 1. Verificar se a coluna purchase_order_id existe na tabela payables
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payables'
ORDER BY ordinal_position;

-- 2. Se a coluna purchase_order_id não existir, adicionar:
-- (descomente a linha abaixo se necessário)
-- ALTER TABLE payables ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES purchase_orders(id);

-- 3. Verificar os payables existentes
SELECT id, description, purchase_order_id, partner_id, amount, paid_amount, status
FROM payables
WHERE sub_type = 'purchase_order';

-- 4. Verificar os pedidos de compra com pagamentos
SELECT id, number, partner_name, total_value, paid_value
FROM purchase_orders
WHERE paid_value > 0;

-- ============================================================================
-- CORREÇÃO: Associar payables aos pedidos de compra pelo valor e parceiro
-- ============================================================================

-- 5. ATUALIZAR o payable do pedido PC-2026-367 com o paidAmount correto
-- Primeiro, encontre o ID do pedido de compra:
/*
UPDATE payables p
SET 
  purchase_order_id = po.id,
  paid_amount = po.paid_value,
  status = CASE 
    WHEN po.paid_value >= p.amount - 0.01 THEN 'paid'
    WHEN po.paid_value > 0 THEN 'partially_paid'
    ELSE 'pending'
  END
FROM purchase_orders po
WHERE p.sub_type = 'purchase_order'
  AND p.partner_id = po.partner_id
  AND ABS(p.amount - po.total_value) < 1
  AND (p.purchase_order_id IS NULL OR p.purchase_order_id = po.id);
*/

-- 6. Para executar a correção, descomente o bloco acima e execute
