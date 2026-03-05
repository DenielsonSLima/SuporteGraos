-- ============================================================
-- Migration 008 — watermarks
-- Configuração de marca d'água por empresa.
-- Uma linha por empresa (UNIQUE company_id).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.watermarks (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID    NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  image_url   TEXT,                               -- base64 ou URL (pode ser NULL = sem marca)
  opacity     INT     NOT NULL DEFAULT 15,        -- 0 a 100
  orientation TEXT    NOT NULL DEFAULT 'portrait', -- 'portrait' | 'landscape'
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.watermarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "watermarks_select" ON public.watermarks
  FOR SELECT USING (company_id = public.my_company_id());

CREATE POLICY "watermarks_insert" ON public.watermarks
  FOR INSERT WITH CHECK (company_id = public.my_company_id());

CREATE POLICY "watermarks_update" ON public.watermarks
  FOR UPDATE USING (company_id = public.my_company_id());

CREATE POLICY "watermarks_delete" ON public.watermarks
  FOR DELETE USING (company_id = public.my_company_id());

-- ── Realtime ─────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.watermarks;
