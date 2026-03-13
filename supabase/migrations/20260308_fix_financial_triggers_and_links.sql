-- ============================================================================
-- FIX: Correção de Cálculo Financeiro (Payables vs Receivables) e Histórico
-- Data: 2026-03-08
-- ============================================================================

-- 1) CRIAR TABELA financial_links (Faltando no banco)
CREATE TABLE IF NOT EXISTS public.financial_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
    purchase_order_id UUID REFERENCES public.ops_purchase_orders(id) ON DELETE SET NULL,
    sales_order_id UUID REFERENCES public.ops_sales_orders(id) ON DELETE SET NULL,
    loading_id UUID REFERENCES public.ops_loadings(id) ON DELETE SET NULL,
    standalone_id UUID REFERENCES public.financial_entries(id) ON DELETE SET NULL,
    link_type TEXT NOT NULL, -- 'payment', 'receipt', 'deduction', 'reversal'
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_financial_links_transaction ON public.financial_links(transaction_id);
CREATE INDEX IF NOT EXISTS idx_financial_links_po ON public.financial_links(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_financial_links_so ON public.financial_links(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_financial_links_loading ON public.financial_links(loading_id);

-- Permissões
GRANT ALL ON public.financial_links TO authenticated;

-- RLS
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE polname = 'financial_links_select' 
    AND polrelid = 'public.financial_links'::regclass
  ) THEN
    ALTER TABLE public.financial_links ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "financial_links_select" ON public.financial_links FOR SELECT USING (true);
    CREATE POLICY "financial_links_insert" ON public.financial_links FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 2) CORRIGIR GATILHO: fn_update_entry_paid_amount
-- A lógica anterior subtraía 'debit' de forma global, o que é errado para 'payable'.
-- Um 'debit' (saída de caixa) em um 'payable' (conta a pagar) deve AUMENTAR o valor pago (liquidação).
CREATE OR REPLACE FUNCTION public.fn_update_entry_paid_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry_id UUID;
  v_entry_type TEXT;
  v_paid_amount NUMERIC;
BEGIN
  v_entry_id := COALESCE(NEW.entry_id, OLD.entry_id);
  
  IF v_entry_id IS NOT NULL THEN
    -- Buscar o tipo da entrada para saber como somar
    SELECT type INTO v_entry_type FROM public.financial_entries WHERE id = v_entry_id;

    IF v_entry_type IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT COALESCE(SUM(
      CASE 
        WHEN v_entry_type = 'payable' THEN
          CASE WHEN type = 'debit' THEN amount WHEN type = 'credit' THEN -amount ELSE 0 END
        WHEN v_entry_type = 'receivable' THEN
          CASE WHEN type = 'credit' THEN amount WHEN type = 'debit' THEN -amount ELSE 0 END
        ELSE 
          CASE WHEN type = 'credit' THEN amount WHEN type = 'debit' THEN -amount ELSE amount END
      END
    ), 0) INTO v_paid_amount
    FROM public.financial_transactions
    WHERE entry_id = v_entry_id;

    UPDATE public.financial_entries SET
      paid_amount = v_paid_amount,
      status = CASE
        WHEN v_paid_amount >= total_amount AND total_amount > 0 THEN 'paid'::financial_entry_status
        WHEN v_paid_amount > 0 THEN 'partially_paid'::financial_entry_status
        ELSE 'pending'::financial_entry_status
      END,
      updated_at = now()
    WHERE id = v_entry_id;
  END IF;

  RETURN NULL;
END;
$$;

-- 3) RE-CRIAR TRIGGER PARA GARANTIR QUE ESTÁ CORRETO
DROP TRIGGER IF EXISTS trg_update_entry_paid_amount ON public.financial_transactions;
CREATE TRIGGER trg_update_entry_paid_amount
AFTER INSERT OR UPDATE OR DELETE ON public.financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_update_entry_paid_amount();

-- 4) BACKFILL: Corrigir todas as entries existentes
DO $$
DECLARE
  r RECORD;
  v_paid_amount NUMERIC;
BEGIN
  FOR r IN SELECT id, type, total_amount FROM public.financial_entries LOOP
    SELECT COALESCE(SUM(
      CASE 
        WHEN r.type = 'payable' THEN
          CASE WHEN type = 'debit' THEN amount WHEN type = 'credit' THEN -amount ELSE 0 END
        WHEN r.type = 'receivable' THEN
          CASE WHEN type = 'credit' THEN amount WHEN type = 'debit' THEN -amount ELSE 0 END
        ELSE 
          CASE WHEN type = 'credit' THEN amount WHEN type = 'debit' THEN -amount ELSE amount END
      END
    ), 0) INTO v_paid_amount
    FROM public.financial_transactions
    WHERE entry_id = r.id;

    UPDATE public.financial_entries SET
      paid_amount = v_paid_amount,
      status = CASE
        WHEN v_paid_amount >= total_amount AND total_amount > 0 THEN 'paid'::financial_entry_status
        WHEN v_paid_amount > 0 THEN 'partially_paid'::financial_entry_status
        ELSE 'pending'::financial_entry_status
      END,
      updated_at = now()
    WHERE id = r.id;
  END LOOP;
END;
$$;

-- 5) POPULAR financial_links COM DADOS EXISTENTES (Histórico)
INSERT INTO public.financial_links (transaction_id, standalone_id, link_type, created_at)
SELECT ft.id, ft.entry_id, 'payment', ft.created_at
FROM public.financial_transactions ft
LEFT JOIN public.financial_links fl ON fl.transaction_id = ft.id
WHERE ft.entry_id IS NOT NULL AND fl.id IS NULL;
