-- ============================================================================
-- Migration 013: Financial Transactions (Livro-Razão Imutável)
-- ============================================================================
-- Tabela IMUTÁVEL que registra TODOS os movimentos de dinheiro.
--
-- Cada linha = uma movimentação de dinheiro (entrada ou saída).
-- Ligação com financial_entries: entry_id (se a transação pagar uma obrigação)
-- Ligação com accounts: account_id (em qual conta a transação aconteceu)
--
-- Regra: NUNCA deletar/editar linhas desta tabela (tabela de auditoria).
-- Se precisar reverter um pagamento, INSERT um novo debit (crédito reverso).
--
-- RLS habilitada: cada empresa só vê suas próprias transações.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Qual obrigação esta transação está pagando?
  entry_id              UUID REFERENCES public.financial_entries(id) ON DELETE SET NULL,
                        -- Pode ser NULL: transações avulsas (não relacionadas a PO/SO)
  
  -- Em qual conta a transação aconteceu?
  account_id            UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  
  -- Tipo de movimento
  type                  TEXT NOT NULL,
                        -- 'credit'  → Entrada de dinheiro (+)
                        -- 'debit'   → Saída de dinheiro (-)
  
  -- Valor
  amount                DECIMAL(20,2) NOT NULL,
                        -- Sempre positivo. O "sinal" vem do campo "type"
  
  -- Quando
  transaction_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Quem criou? (FK para app_users)
  created_by            UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
  
  -- Descrição
  description           TEXT,
                        -- Ex: "Pagamento PO #123 - Bluesoft"
  
  -- Imutável - só INSERT, nunca UPDATE/DELETE
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance (leitura, sem writes repetidos)
CREATE INDEX IF NOT EXISTS idx_financial_transactions_company
  ON public.financial_transactions(company_id);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_entry
  ON public.financial_transactions(entry_id);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_account
  ON public.financial_transactions(account_id);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_date
  ON public.financial_transactions(transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_company_account_date
  ON public.financial_transactions(company_id, account_id, transaction_date DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_transactions_select" ON public.financial_transactions
  FOR SELECT USING (company_id = public.my_company_id());

CREATE POLICY "financial_transactions_insert" ON public.financial_transactions
  FOR INSERT WITH CHECK (company_id = public.my_company_id());

-- DELETE proibido nesta tabela (é auditoria!)
-- UPDATE proibido nesta tabela (é imutável)

-- ============================================================================
-- REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_transactions;

-- ============================================================================
-- EOF: Tabela financial_transactions (livro-razão) pronta
-- ============================================================================
