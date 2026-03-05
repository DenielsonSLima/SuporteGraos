-- ============================================================================
-- Migration 011: Accounts (Cofres/Contas Bancárias)
-- ============================================================================
-- Tabela central que armazena todas as contas bancárias, caixas físicos,
-- cartões de crédito, e aplicações da empresa.
--
-- O saldo (balance) é SEMPRE calculado via TRIGGER a partir de
-- financial_transactions. NUNCA pode ser editado manualmente.
--
-- RLS habilitada: cada empresa só vê suas próprias contas.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Identificação da conta
  account_type          TEXT NOT NULL,
                        -- 'bank'        → Conta bancária
                        -- 'cash'        → Caixa físico
                        -- 'credit_card' → Cartão de crédito
                        -- 'investment'  → Aplicações/investimentos
  
  account_name          TEXT NOT NULL,
                        -- Ex: "C.P. Itaú", "Caixa Físico", "Cartão Bradesco"
  
  account_number        TEXT,
                        -- Número da conta (opcional, só para bancos)
  
  -- Saldo da conta (CALCULADO, NUNCA MANUAL)
  -- Sempre = SUM(ft.amount WHERE type='credit') - SUM(ft.amount WHERE type='debit')
  balance               DECIMAL(20,2) DEFAULT 0.00,
  
  -- Configurações
  is_active             BOOLEAN DEFAULT true,
  
  allows_negative       BOOLEAN DEFAULT false,
                        -- Se true: conta pode ficar com saldo negativo (cheque especial, limite)
                        -- Se false: validação RPC impede débito maior que saldo
  
  -- Rastreamento
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_accounts_company
  ON public.accounts(company_id);

CREATE INDEX IF NOT EXISTS idx_accounts_type
  ON public.accounts(account_type);

CREATE INDEX IF NOT EXISTS idx_accounts_active
  ON public.accounts(is_active)
  WHERE is_active = true;

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER set_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounts_select" ON public.accounts
  FOR SELECT USING (company_id = public.my_company_id());

CREATE POLICY "accounts_insert" ON public.accounts
  FOR INSERT WITH CHECK (company_id = public.my_company_id());

CREATE POLICY "accounts_update" ON public.accounts
  FOR UPDATE USING (company_id = public.my_company_id());

CREATE POLICY "accounts_delete" ON public.accounts
  FOR DELETE USING (company_id = public.my_company_id());

-- ============================================================================
-- REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts;

-- ============================================================================
-- EOF: Tabela accounts pronta para Realtime + Triggers de balance
-- ============================================================================
