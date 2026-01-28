-- ============================================================================
-- TESTE RÁPIDO: VERIFICAR DADOS SALVOS
-- ============================================================================

-- 1. CONTAR IMAGENS SALVAS
SELECT 
  COUNT(*) as total_imagens,
  COUNT(CASE WHEN is_active THEN 1 END) as ativas,
  COUNT(CASE WHEN source = 'upload' THEN 1 END) as uploads,
  COUNT(CASE WHEN source = 'ai_generated' THEN 1 END) as ia_geradas
FROM public.login_screens;

-- 2. LISTAR TODAS AS IMAGENS COM DETALHES
SELECT 
  id,
  sequence_order,
  title,
  source,
  is_active,
  CASE 
    WHEN image_data IS NOT NULL THEN 'SIM (' || LENGTH(image_data)/1024 || 'KB)'
    ELSE 'NÃO'
  END as tem_base64,
  created_at,
  updated_at
FROM public.login_screens
ORDER BY sequence_order;

-- 3. VERIFICAR CONFIGURAÇÃO DE ROTAÇÃO
SELECT 
  id,
  rotation_frequency,
  display_order,
  auto_refresh_seconds,
  created_at,
  updated_at
FROM public.login_rotation_config;

-- 4. TESTE: INSERIR IMAGEM DE TESTE
INSERT INTO public.login_screens (
  sequence_order,
  image_url,
  title,
  source,
  is_active,
  metadata
) VALUES (
  99,
  'https://via.placeholder.com/1920x1080?text=Teste',
  'Imagem de Teste',
  'upload',
  true,
  '{"teste": true, "data": "2026-01-27"}'::jsonb
)
RETURNING id, title, created_at;

-- 5. DELETAR TESTE (descomente se quiser limpar)
-- DELETE FROM public.login_screens WHERE sequence_order = 99;
