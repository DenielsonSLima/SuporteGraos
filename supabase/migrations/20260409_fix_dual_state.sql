-- [FIX] Sincronizando o JSON de 'metadata' com a coluna real de 'status'.
-- Isso remove o "Fantasma do Estado Antigo" que fazia a UI mostrar o valor errado.

UPDATE public.ops_purchase_orders
SET metadata = metadata || jsonb_build_object('status', 'approved'),
    status = 'approved',
    updated_at = now()
WHERE number = 'PC-2026-610';

-- Garantir que qualquer outro pedido com o mesmo problema também seja corrigido
UPDATE public.ops_purchase_orders
SET metadata = metadata || jsonb_build_object('status', status)
WHERE (metadata->>'status') IS DISTINCT FROM status;
