-- ============================================================
-- Migration 004 — bank_accounts
-- Contas bancárias, caixas e cofres por empresa.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_name      TEXT        NOT NULL,
  owner          TEXT        NOT NULL DEFAULT '',
  agency         TEXT        NOT NULL DEFAULT '',
  account_number TEXT        NOT NULL DEFAULT '',
  active         BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_accounts_select" ON public.bank_accounts
  FOR SELECT USING (company_id = public.my_company_id());

CREATE POLICY "bank_accounts_insert" ON public.bank_accounts
  FOR INSERT WITH CHECK (company_id = public.my_company_id());

CREATE POLICY "bank_accounts_update" ON public.bank_accounts
  FOR UPDATE USING (company_id = public.my_company_id());

CREATE POLICY "bank_accounts_delete" ON public.bank_accounts
  FOR DELETE USING (company_id = public.my_company_id());

-- ── Realtime ─────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_accounts;
