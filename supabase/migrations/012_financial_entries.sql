-- ============================================================================
-- Migration 012: Financial Entries (Obrigações/Direitos)
-- ============================================================================
-- Tabela central de "contas a pagar" E "contas a receber".
--
-- A MESMA TABELA serve ambos:
--   type='payable'    → Você DEVE pagar (Contas a Pagar)
--   type='receivable' → Outro DEVE pagar você (Contas a Receber)
--
-- Campos de cálculo (paid_amount, remaining_amount, status) são atualizados
-- via TRIGGERS quando há mudanças nos financial_transactions.
--
-- RLS habilitada: cada empresa só vê suas próprias entradas.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_entries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Tipo de obrigação
  type                  TEXT NOT NULL,
                        -- 'payable'    → Você deve pagar
                        -- 'receivable' → Outro deve pagar você
  
  -- Origem (qual operação gerou esta entrada)
  origin_type           TEXT,
                        -- 'purchase_order' | 'sales_order' | 'commission'
                        -- 'expense' | 'loan' | 'advance' | 'transfer'
  
  origin_id             UUID,
                        -- FK para purchase_orders.id, sales_orders.id, etc
  
  -- Quem envolve
  partner_id            UUID NOT NULL REFERENCES public.parceiros_parceiros(id) ON DELETE CASCADE,
  
  -- Valores
  total_amount          DECIMAL(20,2) NOT NULL,
                        -- Valor total da obrigação
                        -- Para PO: soma(itens) + despesas - descontos
                        -- Para SO: soma(itens) + impostos - descontos
  
  paid_amount           DECIMAL(20,2) DEFAULT 0.00,
                        -- Calculado via TRIGGER: SUM(ft.amount) para esta entry
  
  remaining_amount      DECIMAL(20,2) GENERATED ALWAYS AS
                        (total_amount - paid_amount) STORED,
  
  -- Status (atualizado via TRIGGER)
  status                TEXT DEFAULT 'open',
                        -- 'open'          → Não iniciou pagamentos
                        -- 'partially_paid' → Pagou parte
                        -- 'paid'          → Pago integralmente
                        -- 'overdue'       → Vencido (será calculado via VIEW)
                        -- 'cancelled'     → Cancelada
  
  -- Datas
  created_date          DATE DEFAULT CURRENT_DATE,
  due_date              DATE,
  paid_date             DATE,
                        -- Preenchido via TRIGGER quando status vira 'paid'
  
  -- Rastreamento
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_financial_entries_company
  ON public.financial_entries(company_id);

CREATE INDEX IF NOT EXISTS idx_financial_entries_type
  ON public.financial_entries(type);

CREATE INDEX IF NOT EXISTS idx_financial_entries_origin
  ON public.financial_entries(origin_type, origin_id);

CREATE INDEX IF NOT EXISTS idx_financial_entries_partner
  ON public.financial_entries(partner_id);

CREATE INDEX IF NOT EXISTS idx_financial_entries_status
  ON public.financial_entries(status);

CREATE INDEX IF NOT EXISTS idx_financial_entries_due_date
  ON public.financial_entries(due_date);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER set_financial_entries_updated_at
  BEFORE UPDATE ON public.financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_entries_select" ON public.financial_entries
  FOR SELECT USING (company_id = public.my_company_id());

CREATE POLICY "financial_entries_insert" ON public.financial_entries
  FOR INSERT WITH CHECK (company_id = public.my_company_id());

CREATE POLICY "financial_entries_update" ON public.financial_entries
  FOR UPDATE USING (company_id = public.my_company_id());

CREATE POLICY "financial_entries_delete" ON public.financial_entries
  FOR DELETE USING (company_id = public.my_company_id());

-- ============================================================================
-- REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_entries;

-- ============================================================================
-- EOF: Tabela financial_entries pronta para Realtime + Triggers
-- ============================================================================
