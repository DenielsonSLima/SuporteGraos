-- ============================================================================
-- MIGRATION: Cria tabela junction parceiros_categorias
-- Permite que um parceiro tenha MÚLTIPLAS categorias (ex: Cliente + Fornecedor)
-- ============================================================================

-- 1. Cria a tabela junction
CREATE TABLE IF NOT EXISTS public.parceiros_categorias (
    id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    partner_id      uuid NOT NULL REFERENCES public.parceiros_parceiros(id) ON DELETE CASCADE,
    partner_type_id text NOT NULL,
    created_at      timestamptz DEFAULT now(),

    -- Impede duplicação: mesmo parceiro não pode ter a mesma categoria duas vezes
    UNIQUE (partner_id, partner_type_id)
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_parceiros_categorias_partner
    ON public.parceiros_categorias(partner_id);
CREATE INDEX IF NOT EXISTS idx_parceiros_categorias_company
    ON public.parceiros_categorias(company_id);
CREATE INDEX IF NOT EXISTS idx_parceiros_categorias_type
    ON public.parceiros_categorias(partner_type_id);

-- 3. RLS (mesmo padrão das demais tabelas parceiros_*)
ALTER TABLE public.parceiros_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parceiros_categorias_all"
    ON public.parceiros_categorias
    USING (company_id = my_company_id())
    WITH CHECK (company_id = my_company_id());

-- 4. Backfill: copia partner_type_id existente de parceiros_parceiros para a junction
INSERT INTO public.parceiros_categorias (company_id, partner_id, partner_type_id)
SELECT company_id, id, partner_type_id
FROM   public.parceiros_parceiros
WHERE  partner_type_id IS NOT NULL
ON CONFLICT (partner_id, partner_type_id) DO NOTHING;

-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.parceiros_categorias;
