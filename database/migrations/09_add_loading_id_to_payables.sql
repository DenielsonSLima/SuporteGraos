-- ============================================================================
-- Adicionar coluna loading_id na tabela payables
-- Execute no Supabase SQL Editor
-- ============================================================================

-- 1. Adicionar a coluna loading_id
ALTER TABLE payables 
ADD COLUMN IF NOT EXISTS loading_id UUID REFERENCES logistics_loadings(id);

-- 2. Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_payables_loading_id ON payables(loading_id);

-- 3. Verificar se a coluna foi criada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payables'
ORDER BY ordinal_position;

-- 4. Atualizar payables de frete existentes com o loading_id correto
-- (Busca por peso + transportadora)
UPDATE payables p
SET loading_id = l.id
FROM logistics_loadings l
WHERE p.sub_type = 'freight'
  AND p.loading_id IS NULL
  AND p.partner_id = l.carrier_id
  AND ABS(COALESCE(p.weight_kg, 0) - COALESCE(l.weight_kg, 0)) < 1;

-- 5. Verificar quantos foram atualizados
SELECT 
  COUNT(*) FILTER (WHERE loading_id IS NOT NULL) as com_loading_id,
  COUNT(*) FILTER (WHERE loading_id IS NULL) as sem_loading_id
FROM payables
WHERE sub_type = 'freight';
