-- ============================================================================
-- Migration 020: Advances (Adiantamentos)
-- ============================================================================
-- Registra adiantamentos para sócios, clientes ou fornecedores.
-- Quando liquidado, pode ser:
--   - Abatido em uma fatura futura (PO/SO)
--   - Ou registrado como financial_entry payable/receivable
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.advances (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Para quem é o adiantamento
  recipient_id          UUID NOT NULL REFERENCES public.parceiros_parceiros(id) ON DELETE CASCADE,
  
  recipient_type        TEXT NOT NULL,
                        -- 'supplier'   = fornecedor (entrada de caixa)
                        -- 'client'     = cliente (saída de caixa)
                        -- 'shareholder' = sócio (saída de caixa)
  
  -- Valor
  amount                DECIMAL(20,2) NOT NULL,
  
  -- Descrição
  description           TEXT,
  
  -- Saldo
  settled_amount        DECIMAL(20,2) DEFAULT 0,
  remaining_amount      DECIMAL(20,2) GENERATED ALWAYS AS
                        (amount - settled_amount) STORED,
  
  -- Status
  status                TEXT DEFAULT 'open',
                        -- 'open' | 'partially_settled' | 'settled' | 'cancelled'
  
  -- Datas
  advance_date          DATE DEFAULT CURRENT_DATE,
  settlement_date       DATE,
  
  -- Rastreamento
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advances_company
  ON public.advances(company_id);

CREATE INDEX IF NOT EXISTS idx_advances_recipient
  ON public.advances(recipient_id);

CREATE INDEX IF NOT EXISTS idx_advances_type
  ON public.advances(recipient_type);

CREATE INDEX IF NOT EXISTS idx_advances_status
  ON public.advances(status);

CREATE TRIGGER set_advances_updated_at
  BEFORE UPDATE ON public.advances
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "advances_select" ON public.advances
  FOR SELECT USING (company_id = public.my_company_id());

CREATE POLICY "advances_insert" ON public.advances
  FOR INSERT WITH CHECK (company_id = public.my_company_id());

CREATE POLICY "advances_update" ON public.advances
  FOR UPDATE USING (company_id = public.my_company_id());

CREATE POLICY "advances_delete" ON public.advances
  FOR DELETE USING (company_id = public.my_company_id());

ALTER PUBLICATION supabase_realtime ADD TABLE public.advances;

-- ============================================================================
-- EOF
-- ============================================================================
