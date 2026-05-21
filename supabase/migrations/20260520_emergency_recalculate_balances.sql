-- ============================================================================
-- MIGRATION DE EMERGÊNCIA: Recalcular TODOS os paid_amount
-- ============================================================================
-- Contexto: O handler de estorno (transactionCleanupHandler.ts) tinha um bug
-- que impedia a chamada da RPC de void. Os pagamentos eram removidos do
-- frontend mas NUNCA estornados no banco, corrompendo os saldos.
--
-- Esta migration recalcula TODOS os paid_amount/status baseado nas
-- financial_transactions REAIS existentes no banco.
-- ============================================================================

SET search_path = public;

-- 1. Recalcular TODOS os paid_amount baseado nas transações reais
DO $$
DECLARE
  r RECORD;
  v_paid_amount NUMERIC;
  v_count INT := 0;
BEGIN
  RAISE NOTICE '=== INÍCIO DA LIMPEZA FINANCEIRA ===';
  
  FOR r IN SELECT id, type, total_amount, paid_amount, status FROM public.financial_entries LOOP
    -- Calcula o paid_amount REAL baseado nas transações existentes
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

    -- Só atualiza se o valor mudou
    IF v_paid_amount <> r.paid_amount THEN
      RAISE NOTICE 'CORRIGINDO entry % (type=%) paid_amount: % -> %', r.id, r.type, r.paid_amount, v_paid_amount;
      
      UPDATE public.financial_entries SET
        paid_amount = v_paid_amount,
        remaining_amount = GREATEST(total_amount - v_paid_amount, 0),
        status = CASE
          WHEN v_paid_amount >= total_amount AND total_amount > 0 THEN 'paid'::financial_entry_status
          WHEN v_paid_amount > 0 THEN 'partially_paid'::financial_entry_status
          ELSE 'pending'::financial_entry_status
        END,
        updated_at = now()
      WHERE id = r.id;
      
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Total de entries corrigidas: %', v_count;
  RAISE NOTICE '=== FIM DA LIMPEZA FINANCEIRA ===';
END;
$$;

-- 2. Recalcular TODOS os saldos bancários baseado nas transações reais
DO $$
DECLARE
  r RECORD;
  v_balance NUMERIC;
  v_count INT := 0;
BEGIN
  RAISE NOTICE '=== RECALCULANDO SALDOS BANCÁRIOS ===';
  
  FOR r IN SELECT id, name, balance FROM public.accounts LOOP
    SELECT COALESCE(SUM(
      CASE 
        WHEN type = 'IN' OR type = 'credit' THEN amount
        WHEN type = 'OUT' OR type = 'debit' THEN -amount
        ELSE 0
      END
    ), 0) INTO v_balance
    FROM public.financial_transactions
    WHERE account_id = r.id;

    IF v_balance <> r.balance THEN
      RAISE NOTICE 'CORRIGINDO conta % (%) balance: % -> %', r.name, r.id, r.balance, v_balance;
      
      UPDATE public.accounts SET
        balance = v_balance,
        updated_at = now()
      WHERE id = r.id;
      
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Total de contas corrigidas: %', v_count;
  RAISE NOTICE '=== FIM DOS SALDOS BANCÁRIOS ===';
END;
$$;

-- 3. Limpar financial_links órfãos (sem transação correspondente)
DELETE FROM public.financial_links 
WHERE transaction_id NOT IN (SELECT id FROM public.financial_transactions);
