-- ============================================================================
-- Migration 021: Shareholder Operations (Operações com Sócios)
-- ============================================================================
-- Registra todas as operações entre a empresa e seus sócios:
-- - Aporte de capital
-- - Retirada de lucro/isoldo
-- - Distribuição de dividendos
-- 
-- Cada operação gera financial_entry + shareholder_transaction automaticamente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.shareholder_operations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Qual sócio
  shareholder_id        UUID NOT NULL REFERENCES public.shareholders(id) ON DELETE CASCADE,
  
  -- Tipo de operação
  operation_type        TEXT NOT NULL,
                        -- 'capital_contribution' = Aporte de capital (entrada de caixa)
                        -- 'withdrawal'           = Retirada de lucro (saída de caixa)
                        -- 'profit_share'         = Lucro distribuído
                        -- 'dividend'             = Dividendo em dinheiro
  
  -- Valor
  amount                DECIMAL(20,2) NOT NULL,
  
  -- Descrição
  description           TEXT,
  
  -- Status
  status                TEXT DEFAULT 'completed',
                        -- 'pending' | 'completed' | 'cancelled'
  
  -- Datas
  operation_date        DATE DEFAULT CURRENT_DATE,
  
  -- Rastreamento
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shareholder_operations_company
  ON public.shareholder_operations(company_id);

CREATE INDEX IF NOT EXISTS idx_shareholder_operations_shareholder
  ON public.shareholder_operations(shareholder_id);

CREATE INDEX IF NOT EXISTS idx_shareholder_operations_type
  ON public.shareholder_operations(operation_type);

CREATE INDEX IF NOT EXISTS idx_shareholder_operations_date
  ON public.shareholder_operations(operation_date DESC);

CREATE TRIGGER set_shareholder_operations_updated_at
  BEFORE UPDATE ON public.shareholder_operations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.shareholder_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shareholder_operations_select" ON public.shareholder_operations
  FOR SELECT USING (company_id = public.my_company_id());

CREATE POLICY "shareholder_operations_insert" ON public.shareholder_operations
  FOR INSERT WITH CHECK (company_id = public.my_company_id());

CREATE POLICY "shareholder_operations_update" ON public.shareholder_operations
  FOR UPDATE USING (company_id = public.my_company_id());

CREATE POLICY "shareholder_operations_delete" ON public.shareholder_operations
  FOR DELETE USING (company_id = public.my_company_id());

ALTER PUBLICATION supabase_realtime ADD TABLE public.shareholder_operations;

-- ============================================================================
-- EOF
-- ============================================================================
