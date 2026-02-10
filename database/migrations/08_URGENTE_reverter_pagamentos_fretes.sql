-- ============================================================================
-- REVERSÃO URGENTE: Corrigir pagamentos aplicados incorretamente nos fretes
-- Execute no Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PASSO 1: DIAGNÓSTICO - Ver o estado atual
-- ============================================================================

-- 1.1 Ver loadings (fretes) com freight_paid > 0
SELECT 
  id,
  driver_name,
  transport_company_name,
  total_freight_value,
  freight_paid,
  status
FROM loadings
WHERE freight_paid > 0
ORDER BY freight_paid DESC;

-- 1.2 Ver payables de frete com paid_amount > 0
SELECT 
  id,
  description,
  partner_name,
  amount,
  paid_amount,
  status,
  sub_type
FROM payables
WHERE sub_type = 'freight' AND paid_amount > 0
ORDER BY paid_amount DESC;

-- 1.3 Ver payables de pedido de compra
SELECT 
  id,
  description,
  partner_name,
  amount,
  paid_amount,
  status,
  sub_type,
  purchase_order_id
FROM payables
WHERE sub_type = 'purchase_order'
ORDER BY amount DESC;

-- 1.4 Ver purchase_orders
SELECT 
  id,
  number,
  partner_name,
  total_value,
  received_value as paid_value
FROM purchase_orders
ORDER BY total_value DESC;

-- ============================================================================
-- PASSO 2: REVERTER PAGAMENTOS DOS FRETES (loadings)
-- ============================================================================

-- 2.1 ZERAR freight_paid de TODOS os loadings
UPDATE loadings
SET freight_paid = 0
WHERE freight_paid > 0;

-- ============================================================================
-- PASSO 3: REVERTER PAGAMENTOS DOS PAYABLES DE FRETE
-- ============================================================================

-- 3.1 ZERAR paid_amount e status dos payables de frete
UPDATE payables
SET 
  paid_amount = 0,
  status = 'pending'
WHERE sub_type = 'freight'
  AND paid_amount > 0;

-- ============================================================================
-- PASSO 4: REVERTER PAGAMENTOS DOS PEDIDOS DE COMPRA (se necessário)
-- ============================================================================

-- 4.1 ZERAR received_value dos purchase_orders (se você quer resetar tudo)
UPDATE purchase_orders
SET received_value = 0
WHERE received_value > 0;

-- 4.2 ZERAR os payables de purchase_order também
UPDATE payables
SET 
  paid_amount = 0,
  status = 'pending'
WHERE sub_type = 'purchase_order'
  AND paid_amount > 0;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Verificar que todos os pagamentos foram zerados
SELECT 'loadings' as tabela, COUNT(*) as com_pagamento 
FROM loadings WHERE freight_paid > 0
UNION ALL
SELECT 'payables_freight', COUNT(*) 
FROM payables WHERE sub_type = 'freight' AND paid_amount > 0
UNION ALL
SELECT 'payables_po', COUNT(*) 
FROM payables WHERE sub_type = 'purchase_order' AND paid_amount > 0
UNION ALL
SELECT 'purchase_orders', COUNT(*) 
FROM purchase_orders WHERE received_value > 0;
