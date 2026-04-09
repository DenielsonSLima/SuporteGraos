-- [REOPEN] Reabrindo pedidos de compra que foram marcados como finalizados mas possuem saldo em aberto
-- O status 'approved' permite novas edições e pagamentos no frontend.

UPDATE public.ops_purchase_orders
SET status = 'approved',
    updated_at = now()
WHERE status = 'completed';

-- Nota: Caso o status real no banco seja 'received' (como visto em algumas migrations), cobrimos ambos.
UPDATE public.ops_purchase_orders
SET status = 'approved',
    updated_at = now()
WHERE status = 'received';
