-- ============================================================================
-- Migration 017: Loans (Empréstimos) + Loan Installments
-- ============================================================================
-- Registra empréstimos recebidos pela empresa (com ou sem juros).
-- Tabela principal: loans
-- Tabela relacionada: loan_installments (parcelas individuais)
-- ============================================================================

-- TABELA 1: Empréstimos
CREATE TABLE IF NOT EXISTS public.loans (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Quem empresta
  lender_id             UUID REFERENCES public.parceiros_parceiros(id) ON DELETE SET NULL,
                        -- NULL se é empréstimo interno/pessoal do sócio
  
  -- Valores
  principal_amount      DECIMAL(20,2) NOT NULL,
  
  interest_rate         DECIMAL(5,2),
                        -- Taxa de juros (ex: 5.5%)
  
  -- Datas
  start_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date              DATE,
  
  -- Saldo calculado via TRIGGER
  paid_amount           DECIMAL(20,2) DEFAULT 0,
  remaining_amount      DECIMAL(20,2) GENERATED ALWAYS AS
                        (principal_amount - paid_amount) STORED,
  
  -- Status (TRIGGER)
  status                TEXT DEFAULT 'open',
                        -- 'open' | 'paid' | 'cancelled'
  
  -- Rastreamento
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loans_company
  ON public.loans(company_id);

CREATE INDEX IF NOT EXISTS idx_loans_lender
  ON public.loans(lender_id);

CREATE INDEX IF NOT EXISTS idx_loans_status
  ON public.loans(status);

CREATE TRIGGER set_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loans_select" ON public.loans
  FOR SELECT USING (company_id = public.my_company_id());

CREATE POLICY "loans_insert" ON public.loans
  FOR INSERT WITH CHECK (company_id = public.my_company_id());

CREATE POLICY "loans_update" ON public.loans
  FOR UPDATE USING (company_id = public.my_company_id());

CREATE POLICY "loans_delete" ON public.loans
  FOR DELETE USING (company_id = public.my_company_id());

ALTER PUBLICATION supabase_realtime ADD TABLE public.loans;

-- ============================================================================
-- TABELA 2: Parcelas do Empréstimo
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.loan_installments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  loan_id               UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  
  -- Número da parcela
  installment_number    INT NOT NULL,
  
  -- Valor da parcela
  amount                DECIMAL(20,2) NOT NULL,
  
  -- Datas
  due_date              DATE NOT NULL,
  paid_date             DATE,
  
  -- Status
  status                TEXT DEFAULT 'open',
                        -- 'open' | 'paid' | 'overdue' | 'cancelled'
  
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loan_installments_company
  ON public.loan_installments(company_id);

CREATE INDEX IF NOT EXISTS idx_loan_installments_loan
  ON public.loan_installments(loan_id);

CREATE INDEX IF NOT EXISTS idx_loan_installments_due_date
  ON public.loan_installments(due_date);

CREATE TRIGGER set_loan_installments_updated_at
  BEFORE UPDATE ON public.loan_installments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.loan_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loan_installments_select" ON public.loan_installments
  FOR SELECT USING (company_id = public.my_company_id());

CREATE POLICY "loan_installments_insert" ON public.loan_installments
  FOR INSERT WITH CHECK (company_id = public.my_company_id());

CREATE POLICY "loan_installments_update" ON public.loan_installments
  FOR UPDATE USING (company_id = public.my_company_id());

CREATE POLICY "loan_installments_delete" ON public.loan_installments
  FOR DELETE USING (company_id = public.my_company_id());

ALTER PUBLICATION supabase_realtime ADD TABLE public.loan_installments;

-- ============================================================================
-- EOF
-- ============================================================================
