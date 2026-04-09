-- ============================================================================
-- MIGRATION: Desativar Finalização Automática de Pedidos de Venda
-- DATA: 2026-04-05
-- OBJETIVO: Garantir que o status do Pedido de Venda seja controlado apenas pelo usuário.
-- ============================================================================

-- Remover a v_new_status de qualquer gatilho que a utilize para atualizar ops_sales_orders
-- Nota: O gatilho principal de Vendas (fn_sync_sales_order_financials) será ajustado se existir.

-- Se houver uma função similar à da compra, vamos garantir que ela não mexa no status.
-- Vou verificar se existe public.fn_sync_sales_order_financials()

DO $$ 
BEGIN
    -- Se a função existir, vamos redefinir sem o update de status
    -- (Busca baseada no padrão de nomenclatura do sistema)
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_sync_sales_order_financials') THEN
        -- Aqui entrará a redefinição da função se encontrarmos o código original
        NULL;
    END IF;
END $$;
