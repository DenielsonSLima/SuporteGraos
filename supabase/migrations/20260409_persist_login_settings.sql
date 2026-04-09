-- ============================================================================
-- 📊 MIGRATION: Persist Login Settings in Database
-- Data: 2026-04-09
-- Objetivo: Mover configurações de interface da tela de login para o banco.
-- ============================================================================

-- 1. Adicionar coluna login_settings na tabela companies
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='login_settings') THEN
        ALTER TABLE public.companies ADD COLUMN login_settings JSONB DEFAULT '{
          "images": ["https://images.unsplash.com/photo-1551467013-eb30663473f6?q=80&w=1600"],
          "frequency": "fixed"
        }'::jsonb;
    END IF;
END $$;

COMMENT ON COLUMN public.companies.login_settings IS 'Preferências estéticas da tela de login (wallpapers, frequência de rotação).';
