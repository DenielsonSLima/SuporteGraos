-- ============================================================
-- Migration 006 — expense_categories
-- Tabela única com categorias de despesa por empresa.
-- Registros de sistema (company_id IS NULL) são visíveis a todos.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID    REFERENCES public.companies(id) ON DELETE CASCADE,  -- NULL = sistema
  type         TEXT    NOT NULL DEFAULT 'custom',                          -- 'fixed'|'variable'|'administrative'|'custom'
  name         TEXT    NOT NULL,
  color        TEXT    NOT NULL DEFAULT 'bg-slate-50 text-slate-700 border-slate-200',
  subtypes     JSONB   NOT NULL DEFAULT '[]',                              -- [{id, name}]
  is_system    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Dados de sistema (3 categorias padrão) ──────────────────
INSERT INTO public.expense_categories (id, company_id, type, name, color, subtypes, is_system) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  NULL,
  'fixed',
  'Despesas Fixas',
  'bg-blue-50 text-blue-700 border-blue-200',
  '[
    {"id":"f1","name":"Salários"},
    {"id":"f2","name":"Aluguel"},
    {"id":"f3","name":"Segurança"},
    {"id":"f4","name":"Internet / Telefonia"}
  ]'::jsonb,
  true
),
(
  '00000000-0000-0000-0000-000000000002',
  NULL,
  'variable',
  'Despesas Variáveis',
  'bg-amber-50 text-amber-700 border-amber-200',
  '[
    {"id":"v1","name":"Comissões de Venda"},
    {"id":"v2","name":"Fretes"},
    {"id":"v3","name":"Manutenção de Veículos"},
    {"id":"v4","name":"Combustível"},
    {"id":"v5","name":"Corretagem"}
  ]'::jsonb,
  true
),
(
  '00000000-0000-0000-0000-000000000003',
  NULL,
  'administrative',
  'Despesas Administrativas',
  'bg-slate-50 text-slate-700 border-slate-200',
  '[
    {"id":"a1","name":"Sistemas / Software"},
    {"id":"a2","name":"Material de Escritório"},
    {"id":"a3","name":"Contabilidade"},
    {"id":"a4","name":"Limpeza e Copa"}
  ]'::jsonb,
  true
)
ON CONFLICT (id) DO NOTHING;

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Leitura: registros de sistema (company_id IS NULL) + registros da própria empresa
CREATE POLICY "expense_categories_select" ON public.expense_categories
  FOR SELECT USING (
    company_id IS NULL
    OR company_id = public.my_company_id()
  );

-- Escrita: apenas registros da própria empresa (não-sistema)
CREATE POLICY "expense_categories_insert" ON public.expense_categories
  FOR INSERT WITH CHECK (
    company_id = public.my_company_id()
    AND is_system = false
  );

CREATE POLICY "expense_categories_update" ON public.expense_categories
  FOR UPDATE USING (
    company_id = public.my_company_id()
    AND is_system = false
  );

CREATE POLICY "expense_categories_delete" ON public.expense_categories
  FOR DELETE USING (
    company_id = public.my_company_id()
    AND is_system = false
  );

-- ── Realtime ─────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_categories;
