-- [AUDIT] Buscando dados brutos do pedido PC-2026-610
SELECT id, number, status, total_value, paid_value, created_at
FROM public.ops_purchase_orders
WHERE number = 'PC-2026-610';
