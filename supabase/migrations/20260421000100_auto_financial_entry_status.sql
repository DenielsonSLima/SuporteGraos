-- ============================================================================
-- FIX: Gatilho de Status para Entradas Financeiras
-- Objetivo: Garantir que o campo 'status' seja re-calculado sempre que o 
--          valor total ou o valor pago mude.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_sync_financial_entry_status()
RETURNS trigger AS $$
BEGIN
  -- Re-calcular o status baseado nos valores atuais da linha
  NEW.status := CASE
    WHEN NEW.status IN ('cancelled', 'reversed') THEN NEW.status
    WHEN NEW.paid_amount >= NEW.total_amount AND NEW.total_amount > 0 THEN 'paid'::public.financial_entry_status
    WHEN NEW.paid_amount > 0 THEN 'partially_paid'::public.financial_entry_status
    ELSE 'pending'::public.financial_entry_status
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_financial_entry_status ON public.financial_entries;
CREATE TRIGGER trg_sync_financial_entry_status
BEFORE UPDATE OF total_amount, paid_amount ON public.financial_entries
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_financial_entry_status();

-- Aplicar a correção retroativa em todos os registros inconsistentes
UPDATE public.financial_entries
SET updated_at = now()
WHERE status = 'paid' 
  AND paid_amount < total_amount 
  AND total_amount > 0;
