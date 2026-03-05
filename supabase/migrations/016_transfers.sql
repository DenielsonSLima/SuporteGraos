-- ============================================================================
-- Migration 016: Transfers (Transferências entre Contas)
-- ============================================================================
-- Registra transferências de dinheiro entre contas da mesma empresa.
-- RPC gera 2 financial_transactions (debit + credit) automaticamente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.transfers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- De qual conta para qual conta
  account_from_id       UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  account_to_id         UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  
  -- Valor
  amount                DECIMAL(20,2) NOT NULL,
  
  -- Controle
  description           TEXT,
  transfer_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  
  status                TEXT DEFAULT 'completed',
                        -- 'pending' | 'completed' | 'cancelled'
  
  -- Rastreamento
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_transfers_company
  ON public.transfers(company_id);

CREATE INDEX IF NOT EXISTS idx_transfers_from
  ON public.transfers(account_from_id);

CREATE INDEX IF NOT EXISTS idx_transfers_to
  ON public.transfers(account_to_id);

CREATE INDEX IF NOT EXISTS idx_transfers_date
  ON public.transfers(transfer_date DESC);

-- Trigger updated_at
CREATE TRIGGER set_transfers_updated_at
  BEFORE UPDATE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transfers_select" ON public.transfers
  FOR SELECT USING (company_id = public.my_company_id());

CREATE POLICY "transfers_insert" ON public.transfers
  FOR INSERT WITH CHECK (company_id = public.my_company_id());

CREATE POLICY "transfers_update" ON public.transfers
  FOR UPDATE USING (company_id = public.my_company_id());

CREATE POLICY "transfers_delete" ON public.transfers
  FOR DELETE USING (company_id = public.my_company_id());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.transfers;

-- ============================================================================
-- EOF
-- ============================================================================
