-- ============================================================================
-- Migration 018: Credit Lines (Linhas de Crédito)
-- ============================================================================
-- Registra linhas de crédito disponíveis (ex: limite Bradesco).
-- Quando a empresa usa o crédito, gera financial_entry (payable).
-- Quando paga, financial_transaction deduz do used_amount.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.credit_lines (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Quem oferece o crédito
  creditor_id           UUID REFERENCES public.parceiros_parceiros(id) ON DELETE SET NULL,
  
  -- Identificação
  name                  TEXT NOT NULL,
                        -- Ex: "Limite Bradesco", "Linha PJ"
  
  -- Limite
  total_limit           DECIMAL(20,2) NOT NULL,
  used_amount           DECIMAL(20,2) DEFAULT 0,
  available_amount      DECIMAL(20,2) GENERATED ALWAYS AS
                        (total_limit - used_amount) STORED,
  
  -- Juros
  interest_rate         DECIMAL(5,2),
  
  -- Status
  is_active             BOOLEAN DEFAULT true,
  
  -- Datas
  start_date            DATE DEFAULT CURRENT_DATE,
  end_date              DATE,
  
  -- Rastreamento
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_lines_company
  ON public.credit_lines(company_id);

CREATE INDEX IF NOT EXISTS idx_credit_lines_creditor
  ON public.credit_lines(creditor_id);

CREATE INDEX IF NOT EXISTS idx_credit_lines_active
  ON public.credit_lines(is_active)
  WHERE is_active = true;

CREATE TRIGGER set_credit_lines_updated_at
  BEFORE UPDATE ON public.credit_lines
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.credit_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_lines_select" ON public.credit_lines
  FOR SELECT USING (company_id = public.my_company_id());

CREATE POLICY "credit_lines_insert" ON public.credit_lines
  FOR INSERT WITH CHECK (company_id = public.my_company_id());

CREATE POLICY "credit_lines_update" ON public.credit_lines
  FOR UPDATE USING (company_id = public.my_company_id());

CREATE POLICY "credit_lines_delete" ON public.credit_lines
  FOR DELETE USING (company_id = public.my_company_id());

ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_lines;

-- ============================================================================
-- EOF
-- ============================================================================
