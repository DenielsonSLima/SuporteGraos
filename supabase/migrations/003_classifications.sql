-- =============================================================================
-- Migration 003: product_types e partner_types
--
-- Estratégia de registros de sistema:
--   company_id = NULL  → registros padrão, visíveis a TODAS as empresas (read-only)
--   company_id = uuid  → registros personalizados de cada empresa
--
-- RLS SELECT permite ambos. INSERT/UPDATE/DELETE apenas registros da própria empresa.
-- =============================================================================

-- ─── product_types ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.product_types (
  id          TEXT PRIMARY KEY,
  company_id  UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_types_company ON public.product_types (company_id);

ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_types_select"
  ON public.product_types FOR SELECT
  USING (company_id IS NULL OR company_id = public.my_company_id());

CREATE POLICY "product_types_insert"
  ON public.product_types FOR INSERT
  WITH CHECK (company_id = public.my_company_id());

CREATE POLICY "product_types_update"
  ON public.product_types FOR UPDATE
  USING (company_id = public.my_company_id());

CREATE POLICY "product_types_delete"
  ON public.product_types FOR DELETE
  USING (company_id = public.my_company_id());

-- Dados de sistema (company_id = NULL → visíveis a todas as empresas)
INSERT INTO public.product_types (id, company_id, name, description, is_system)
VALUES
  ('1', NULL, 'Milho em Grãos',    'Grãos de milho in natura destinados à comercialização ou consumo.', true),
  ('2', NULL, 'Soja em Grãos',     'Grãos de soja in natura destinados à comercialização ou processamento.', true),
  ('3', NULL, 'Sorgo',             'Grãos de sorgo granífero.', true),
  ('4', NULL, 'Trigo',             'Grãos de trigo destinados à farinha ou ração.', true),
  ('5', NULL, 'Café',              'Grãos de café cru ou beneficiado.', true),
  ('6', NULL, 'Algodão',           'Pluma e caroço de algodão.', true),
  ('7', NULL, 'Outros Grãos',      'Demais tipos de grãos e commodities agrícolas.', true)
ON CONFLICT (id) DO NOTHING;

-- ─── partner_types ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_types (
  id          TEXT PRIMARY KEY,
  company_id  UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_types_company ON public.partner_types (company_id);

ALTER TABLE public.partner_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_types_select"
  ON public.partner_types FOR SELECT
  USING (company_id IS NULL OR company_id = public.my_company_id());

CREATE POLICY "partner_types_insert"
  ON public.partner_types FOR INSERT
  WITH CHECK (company_id = public.my_company_id());

CREATE POLICY "partner_types_update"
  ON public.partner_types FOR UPDATE
  USING (company_id = public.my_company_id());

CREATE POLICY "partner_types_delete"
  ON public.partner_types FOR DELETE
  USING (company_id = public.my_company_id());

-- Dados de sistema correspondem exatamente aos PARTNER_CATEGORY_IDS do frontend
INSERT INTO public.partner_types (id, company_id, name, description, is_system)
VALUES
  ('1', NULL, 'Produtor Rural',  'Pessoa física ou jurídica que explora atividade agrícola.',         true),
  ('2', NULL, 'Indústria',       'Empresas de transformação e beneficiamento.',                        true),
  ('3', NULL, 'Transportadora',  'Responsável pela logística e frete de cargas.',                      true),
  ('4', NULL, 'Corretor',        'Intermediário nas negociações de compra e venda.',                   true),
  ('5', NULL, 'Cliente',         'Comprador final ou destinatário dos grãos.',                         true),
  ('6', NULL, 'Outros',          'Parceiros diversos não categorizados acima.',                        true),
  ('7', NULL, 'Fornecedor',      'Fornecedores de insumos, equipamentos e serviços gerais.',           true)
ON CONFLICT (id) DO NOTHING;

-- ─── Realtime ─────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.product_types;
ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_types;
