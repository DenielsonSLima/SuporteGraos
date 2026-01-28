    -- ============================================================================
    -- FIX: Adicionar coluna partner_id na tabela drivers
    -- Execute este script no Supabase SQL Editor
    -- ============================================================================

    -- Adicionar coluna partner_id se não existir
    DO $$
    BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'drivers' 
        AND column_name = 'partner_id'
    ) THEN
        ALTER TABLE public.drivers 
        ADD COLUMN partner_id uuid null references public.partners(id) on delete cascade;
        
        RAISE NOTICE 'Coluna partner_id adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna partner_id já existe.';
    END IF;
    END $$;

    -- Criar índice para performance
    CREATE INDEX IF NOT EXISTS idx_drivers_partner_id ON public.drivers(partner_id);

    -- Verificar se a coluna foi criada
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'drivers' 
    AND column_name = 'partner_id';
