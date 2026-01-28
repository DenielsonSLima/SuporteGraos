-- ============================================================================
-- FIX: Atualizar tipos permitidos de veículos para transporte de grãos
-- Altera a constraint vehicles_type_check com novos tipos
-- Execute este script no Supabase SQL Editor
-- ============================================================================

-- Remover constraint antiga (nome conhecido pelo erro: vehicles_type_check)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'vehicles_type_check'
  ) THEN
    ALTER TABLE public.vehicles DROP CONSTRAINT vehicles_type_check;
  END IF;
END $$;

-- Adicionar nova constraint com os tipos corretos
ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_type_check
  CHECK (type IN (
    'truck',          -- Caminhão / Truck
    'bitruck',        -- Bitruck
    'carreta_ls',     -- Carreta LS
    'vanderleia',     -- Carreta Vanderleia
    'bi_trem',        -- Bi-trem
    'rodotrem',       -- Rodotrem
    'outros'          -- Outros
  ));

-- Verificar
SELECT conname, convalidated
FROM pg_constraint
WHERE conrelid = 'public.vehicles'::regclass
  AND conname = 'vehicles_type_check';
