-- ============================================================================
-- MIGRAÇÃO: Tabela de junção para múltiplas categorias por parceiro
-- Data: 2026-02-22
-- Motivo: A tabela parceiros_parceiros suportava apenas 1 partner_type_id.
--         Agora cada parceiro pode ter N categorias (ex: Produtor + Fornecedor).
-- ============================================================================

-- ===========================================================================
-- TABELA: parceiros_categorias (junction table)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.parceiros_categorias (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  partner_id      UUID NOT NULL REFERENCES public.parceiros_parceiros(id) ON DELETE CASCADE,
  partner_type_id TEXT NOT NULL REFERENCES public.partner_types(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(partner_id, partner_type_id)
);

CREATE INDEX idx_parceiros_categorias_partner ON public.parceiros_categorias(partner_id);
CREATE INDEX idx_parceiros_categorias_type    ON public.parceiros_categorias(partner_type_id);
CREATE INDEX idx_parceiros_categorias_company ON public.parceiros_categorias(company_id);

-- RLS
ALTER TABLE public.parceiros_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parceiros_categorias_all" ON public.parceiros_categorias
  FOR ALL USING (company_id = public.my_company_id());

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.parceiros_categorias;

-- ===========================================================================
-- MIGRAÇÃO DE DADOS: copiar partner_type_id existente para a junction table
-- ===========================================================================
INSERT INTO public.parceiros_categorias (company_id, partner_id, partner_type_id)
SELECT company_id, id, partner_type_id
FROM public.parceiros_parceiros
WHERE partner_type_id IS NOT NULL
ON CONFLICT (partner_id, partner_type_id) DO NOTHING;
