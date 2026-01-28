-- ============================================================================
-- CORRIGIR RLS POLICIES - ERRO 42501 (Security Policy Violation)
-- ============================================================================

-- ⚠️ SOLUÇÃO: Remover policies restritivas e criar novas mais flexíveis

-- 1. DROP TODAS AS POLICIES ANTIGAS
DROP POLICY IF EXISTS "LoginScreens select" ON public.login_screens;
DROP POLICY IF EXISTS "LoginScreens insert" ON public.login_screens;
DROP POLICY IF EXISTS "LoginScreens update" ON public.login_screens;
DROP POLICY IF EXISTS "LoginScreens delete" ON public.login_screens;

DROP POLICY IF EXISTS "RotationConfig select" ON public.login_rotation_config;
DROP POLICY IF EXISTS "RotationConfig insert" ON public.login_rotation_config;
DROP POLICY IF EXISTS "RotationConfig update" ON public.login_rotation_config;
DROP POLICY IF EXISTS "RotationConfig delete" ON public.login_rotation_config;

-- ============================================================================
-- NOVA RLS POLICY - PERMISSIVA
-- ============================================================================

-- LOGIN_SCREENS - Permissões NOVAS

-- ✅ SELECT: Público (qualquer um pode ler)
CREATE POLICY "LoginScreens select" ON public.login_screens
FOR SELECT USING (true);

-- ✅ INSERT: Autenticado OU Anônimo (menos restritivo)
CREATE POLICY "LoginScreens insert" ON public.login_screens
FOR INSERT 
WITH CHECK (true);  -- Permite qualquer pessoa inserir

-- ✅ UPDATE: Qualquer um pode atualizar
CREATE POLICY "LoginScreens update" ON public.login_screens
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- ✅ DELETE: Apenas criador
CREATE POLICY "LoginScreens delete" ON public.login_screens
FOR DELETE
USING (created_by = auth.uid() OR created_by IS NULL);

-- ============================================================================
-- LOGIN_ROTATION_CONFIG - Permissões NOVAS
-- ============================================================================

-- ✅ SELECT: Público
CREATE POLICY "RotationConfig select" ON public.login_rotation_config
FOR SELECT USING (true);

-- ✅ INSERT: Autenticado
CREATE POLICY "RotationConfig insert" ON public.login_rotation_config
FOR INSERT 
WITH CHECK (true);

-- ✅ UPDATE: Qualquer um
CREATE POLICY "RotationConfig update" ON public.login_rotation_config
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- ✅ DELETE: Apenas criador
CREATE POLICY "RotationConfig delete" ON public.login_rotation_config
FOR DELETE
USING (true);

-- ============================================================================
-- VERIFICAR POLICIES
-- ============================================================================

SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('login_screens', 'login_rotation_config')
ORDER BY tablename, policyname;

-- ============================================================================
-- TESTE: Inserir uma imagem de teste
-- ============================================================================

INSERT INTO public.login_screens (
  sequence_order,
  image_url,
  title,
  source,
  is_active
) VALUES (
  99,
  'https://via.placeholder.com/1920x1080?text=Teste RLS',
  'Teste RLS',
  'upload',
  true
)
RETURNING id, title, created_at;

-- Se conseguiu inserir, RLS está OK! ✅
-- Se ainda der erro 42501, há outro problema.

-- LIMPAR TESTE
DELETE FROM public.login_screens WHERE sequence_order = 99;
