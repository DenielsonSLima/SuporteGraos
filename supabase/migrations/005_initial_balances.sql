-- ============================================================
-- Migration 005 — initial_balances
-- Saldo de abertura por conta bancária.
-- Cada conta pode ter apenas um saldo inicial por empresa
-- (UNIQUE company_id + account_id).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.initial_balances (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID          NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id   UUID          NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  account_name TEXT          NOT NULL DEFAULT '',   -- desnormalizado para exibição
  date         DATE          NOT NULL,
  value        NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT initial_balances_unique_account UNIQUE (company_id, account_id)
);

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.initial_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "initial_balances_select" ON public.initial_balances
  FOR SELECT USING (company_id = public.my_company_id());

CREATE POLICY "initial_balances_insert" ON public.initial_balances
  FOR INSERT WITH CHECK (company_id = public.my_company_id());

CREATE POLICY "initial_balances_update" ON public.initial_balances
  FOR UPDATE USING (company_id = public.my_company_id());

CREATE POLICY "initial_balances_delete" ON public.initial_balances
  FOR DELETE USING (company_id = public.my_company_id());

-- ── Realtime ─────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.initial_balances;
