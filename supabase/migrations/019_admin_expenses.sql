-- ============================================================================
-- Migration 019: Admin Expenses (Despesas Administrativas)
-- ============================================================================
-- Registra despesas da empresa que NÃO vêm de Purchase Orders.
-- Ex: Energia, Internet, Aluguel, etc.
-- RPC cria financial_entry (payable) + financial_transaction (debit no pagamento).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_expenses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Em qual conta será paga
  account_id            UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  
  -- Categoria
  category_id           UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  
  -- Descrição
  description           TEXT NOT NULL,
  
  -- Valor
  amount                DECIMAL(20,2) NOT NULL,
  
  -- Quem recebe
  payee_name            TEXT,
                        -- Ex: "Eletricidade", "Internet Telefônica"
  
  payee_id              UUID REFERENCES public.parceiros_parceiros(id) ON DELETE SET NULL,
  
  -- Datas
  expense_date          DATE DEFAULT CURRENT_DATE,
  due_date              DATE,
  paid_date             DATE,
  
  -- Status
  status                TEXT DEFAULT 'open',
                        -- 'open' | 'paid' | 'cancelled'
  
  -- Rastreamento
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_expenses_company
  ON public.admin_expenses(company_id);

CREATE INDEX IF NOT EXISTS idx_admin_expenses_category
  ON public.admin_expenses(category_id);

CREATE INDEX IF NOT EXISTS idx_admin_expenses_payee
  ON public.admin_expenses(payee_id);

CREATE INDEX IF NOT EXISTS idx_admin_expenses_status
  ON public.admin_expenses(status);

CREATE INDEX IF NOT EXISTS idx_admin_expenses_due_date
  ON public.admin_expenses(due_date);

CREATE TRIGGER set_admin_expenses_updated_at
  BEFORE UPDATE ON public.admin_expenses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.admin_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_expenses_select" ON public.admin_expenses
  FOR SELECT USING (company_id = public.my_company_id());

CREATE POLICY "admin_expenses_insert" ON public.admin_expenses
  FOR INSERT WITH CHECK (company_id = public.my_company_id());

CREATE POLICY "admin_expenses_update" ON public.admin_expenses
  FOR UPDATE USING (company_id = public.my_company_id());

CREATE POLICY "admin_expenses_delete" ON public.admin_expenses
  FOR DELETE USING (company_id = public.my_company_id());

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_expenses;

-- ============================================================================
-- EOF
-- ============================================================================
