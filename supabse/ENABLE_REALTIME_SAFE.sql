-- Habilitar Realtime em todas as tabelas (versão segura - não dá erro se já existe)
-- Execute este SQL no SQL Editor do Supabase

DO $$
BEGIN
    -- purchase_orders
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'purchase_orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE purchase_orders;
        RAISE NOTICE 'Realtime habilitado em purchase_orders';
    ELSE
        RAISE NOTICE 'purchase_orders já tem Realtime habilitado';
    END IF;

    -- sales_orders
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'sales_orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE sales_orders;
        RAISE NOTICE 'Realtime habilitado em sales_orders';
    ELSE
        RAISE NOTICE 'sales_orders já tem Realtime habilitado';
    END IF;

    -- logistics_loadings
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'logistics_loadings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE logistics_loadings;
        RAISE NOTICE 'Realtime habilitado em logistics_loadings';
    ELSE
        RAISE NOTICE 'logistics_loadings já tem Realtime habilitado';
    END IF;

    -- partners
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'partners'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE partners;
        RAISE NOTICE 'Realtime habilitado em partners';
    ELSE
        RAISE NOTICE 'partners já tem Realtime habilitado';
    END IF;

    -- partner_addresses
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'partner_addresses'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE partner_addresses;
        RAISE NOTICE 'Realtime habilitado em partner_addresses';
    ELSE
        RAISE NOTICE 'partner_addresses já tem Realtime habilitado';
    END IF;

END $$;

-- Verificar quais tabelas têm Realtime habilitado
SELECT tablename, schemaname 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
