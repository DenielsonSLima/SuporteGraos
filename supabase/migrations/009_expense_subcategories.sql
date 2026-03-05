-- =================================================================================
-- 009_expense_subcategories.sql
--
-- Separa os subtipos de despesa em tabela própria.
-- Antes: subtypes armazenado como JSONB em expense_categories (sem FK possível)
-- Depois: expense_subcategories com FK real → permite lançamentos referenciarem
--         uma subcategoria específica por ID.
-- =================================================================================

-- 1. Criar tabela

CREATE TABLE IF NOT EXISTS public.expense_subcategories (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID        NOT NULL REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  company_id  UUID        REFERENCES public.companies(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  is_system   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_subcategories_category
  ON public.expense_subcategories (category_id);

CREATE INDEX IF NOT EXISTS idx_expense_subcategories_company
  ON public.expense_subcategories (company_id);

-- Unicidade: sistema nunca duplica subtipos na mesma categoria
CREATE UNIQUE INDEX IF NOT EXISTS idx_expense_subcategories_system_uniq
  ON public.expense_subcategories (category_id, name)
  WHERE company_id IS NULL;

-- Unicidade: empresa não duplica subtipos na mesma categoria
CREATE UNIQUE INDEX IF NOT EXISTS idx_expense_subcategories_company_uniq
  ON public.expense_subcategories (category_id, name, company_id)
  WHERE company_id IS NOT NULL;

-- 2. RLS

ALTER TABLE public.expense_subcategories ENABLE ROW LEVEL SECURITY;

-- Leitura: vê os de sistema (company_id IS NULL) + os da própria empresa
CREATE POLICY "expense_subcategories_select" ON public.expense_subcategories
  FOR SELECT USING (company_id IS NULL OR company_id = public.my_company_id());

-- Inserção: somente para a própria empresa, nunca registros de sistema
CREATE POLICY "expense_subcategories_insert" ON public.expense_subcategories
  FOR INSERT WITH CHECK (company_id = public.my_company_id() AND is_system = false);

-- Exclusão: somente registros não-sistema da própria empresa
CREATE POLICY "expense_subcategories_delete" ON public.expense_subcategories
  FOR DELETE USING (company_id = public.my_company_id() AND is_system = false);

-- 3. Migrar dados do JSONB → nova tabela (apenas registros de sistema)
--    Cada item do array { "id": "...", "name": "..." } vira uma linha própria.

INSERT INTO public.expense_subcategories (id, category_id, company_id, name, is_system)
SELECT
  gen_random_uuid(),
  ec.id,
  NULL,         -- dados de sistema: sem vínculo de empresa
  sub->>'name',
  true
FROM public.expense_categories ec,
     jsonb_array_elements(ec.subtypes) AS sub
WHERE ec.is_system = true
  AND ec.subtypes IS NOT NULL
  AND jsonb_typeof(ec.subtypes) = 'array'
  AND jsonb_array_length(ec.subtypes) > 0
ON CONFLICT DO NOTHING;

-- 4. Remover coluna JSONB (não mais necessária)

ALTER TABLE public.expense_categories DROP COLUMN IF EXISTS subtypes;

-- 5. Habilitar Realtime

ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_subcategories;
