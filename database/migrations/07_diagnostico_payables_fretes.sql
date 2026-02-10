-- ============================================================================
-- DIAGNÓSTICO: Verificar estado dos payables e loadings
-- Execute no Supabase SQL Editor
-- ============================================================================

-- 1. Ver todos os payables de FRETE com pagamentos
SELECT 
  'PAYABLE FRETE' as tipo,
  p.id,
  p.description,
  p.partner_name,
  p.amount,
  p.paid_amount,
  p.status,
  p.sub_type,
  p.purchase_order_id
FROM payables p
WHERE p.sub_type = 'freight'
ORDER BY p.paid_amount DESC;

-- 2. Ver todos os payables de PEDIDO DE COMPRA
SELECT 
  'PAYABLE PO' as tipo,
  p.id,
  p.description,
  p.partner_name,
  p.amount,
  p.paid_amount,
  p.status,
  p.sub_type,
  p.purchase_order_id
FROM payables p
WHERE p.sub_type = 'purchase_order'
ORDER BY p.amount DESC;

-- 3. Ver loadings (fretes) com pagamentos
SELECT 
  'LOADING' as tipo,
  l.id,
  l.driver_name,
  l.transport_company_name,
  l.total_freight_value,
  l.freight_paid,
  l.status
FROM logistics_loadings l
WHERE l.freight_paid > 0
ORDER BY l.freight_paid DESC;

-- 4. Ver purchase_orders com pagamentos
SELECT 
  'PURCHASE ORDER' as tipo,
  po.id,
  po.number,
  po.partner_name,
  po.total_value,
  po.received_value as paid_value
FROM purchase_orders po
WHERE po.received_value > 0;

-- ============================================================================
-- CORREÇÃO: Zerar pagamentos incorretos nos fretes
-- ============================================================================

-- 5. REVERTER pagamentos de payables de frete (SE NECESSÁRIO)
-- Descomente e execute se os fretes estiverem com paid_amount errado:
/*
UPDATE payables
SET 
  paid_amount = 0,
  status = 'pending'
WHERE sub_type = 'freight'
  AND paid_amount > 0;
*/

-- 6. REVERTER pagamentos de loadings (fretes) (SE NECESSÁRIO)
-- Descomente e execute se os loadings estiverem com freight_paid errado:
/*
UPDATE logistics_loadings
SET freight_paid = 0
WHERE freight_paid > 0;
*/
