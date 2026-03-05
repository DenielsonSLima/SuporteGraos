-- ============================================================================
-- MIGRAÇÃO 002: SÓCIOS E TRANSAÇÕES DE SÓCIOS
-- Módulo: Configurações → Sócios
-- Data: 2026-02-21
-- Depende de: 001_companies_and_users.sql
-- ============================================================================

-- ===========================================================================
-- TABELA: shareholders
-- Cadastro dos sócios da empresa. Inclui dados pessoais, de contato,
-- endereço e parâmetros financeiros (pró-labore, recorrência).
-- ===========================================================================
CREATE TABLE public.shareholders (
  id                              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                      UUID         NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Dados pessoais
  name                            TEXT         NOT NULL,
  cpf                             TEXT,
  email                           TEXT,
  phone                           TEXT,

  -- Endereço (desnormalizado para simplicidade)
  address_street                  TEXT,
  address_number                  TEXT,
  address_neighborhood            TEXT,
  address_city                    TEXT,
  address_state                   CHAR(2),
  address_zip                     TEXT,

  -- Financeiro
  pro_labore_value                NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_balance                 NUMERIC(15,2) NOT NULL DEFAULT 0,
  last_pro_labore_date            DATE,

  -- Recorrência de pró-labore
  recurrence_active               BOOLEAN      NOT NULL DEFAULT false,
  recurrence_amount               NUMERIC(15,2) NOT NULL DEFAULT 0,
  recurrence_day                  SMALLINT     NOT NULL DEFAULT 1,
  recurrence_last_generated_month TEXT,        -- formato YYYY-MM

  created_at                      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_shareholders_company_id ON public.shareholders(company_id);

CREATE TRIGGER trg_shareholders_updated_at
  BEFORE UPDATE ON public.shareholders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: shareholders
-- Qualquer usuário autenticado da empresa pode fazer tudo nos sócios dela.
-- ---------------------------------------------------------------------------
ALTER TABLE public.shareholders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shareholders_select" ON public.shareholders
  FOR SELECT USING (company_id = public.my_company_id());

CREATE POLICY "shareholders_insert" ON public.shareholders
  FOR INSERT WITH CHECK (company_id = public.my_company_id());

CREATE POLICY "shareholders_update" ON public.shareholders
  FOR UPDATE USING (company_id = public.my_company_id());

CREATE POLICY "shareholders_delete" ON public.shareholders
  FOR DELETE USING (company_id = public.my_company_id());

-- ===========================================================================
-- TABELA: shareholder_transactions
-- Histórico financeiro de cada sócio (créditos de pró-labore e débitos de
-- retiradas). Vinculada à empresa para facilitar queries de auditoria.
-- ===========================================================================
CREATE TABLE public.shareholder_transactions (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID         NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  shareholder_id UUID         NOT NULL REFERENCES public.shareholders(id) ON DELETE CASCADE,

  date           DATE         NOT NULL,
  type           TEXT         NOT NULL CHECK (type IN ('credit', 'debit')),
  value          NUMERIC(15,2) NOT NULL CHECK (value > 0),
  description    TEXT         NOT NULL DEFAULT '',

  -- Referência opcional à conta bancária que realizou o pagamento (débito)
  -- account_id será FK para bank_accounts quando essa tabela existir
  account_name   TEXT,

  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_shareholder_transactions_shareholder_id ON public.shareholder_transactions(shareholder_id);
CREATE INDEX idx_shareholder_transactions_company_id     ON public.shareholder_transactions(company_id);
CREATE INDEX idx_shareholder_transactions_date           ON public.shareholder_transactions(date);

-- ---------------------------------------------------------------------------
-- RLS: shareholder_transactions
-- ---------------------------------------------------------------------------
ALTER TABLE public.shareholder_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sh_transactions_select" ON public.shareholder_transactions
  FOR SELECT USING (company_id = public.my_company_id());

CREATE POLICY "sh_transactions_insert" ON public.shareholder_transactions
  FOR INSERT WITH CHECK (company_id = public.my_company_id());

CREATE POLICY "sh_transactions_update" ON public.shareholder_transactions
  FOR UPDATE USING (company_id = public.my_company_id());

CREATE POLICY "sh_transactions_delete" ON public.shareholder_transactions
  FOR DELETE USING (company_id = public.my_company_id());
