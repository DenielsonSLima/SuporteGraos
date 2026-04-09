-- ============================================================================
-- MIGRATION: 20260408_global_financial_shield.sql
-- Objetivo: SQL-First para subgrupos financeiros. Atomicidade total em 
--           transferências, sócios e empréstimos.
-- ============================================================================

SET search_path = public;

-- 1. Nova RPC para Deletar Transferência Inter-Contas (Atômica)
CREATE OR REPLACE FUNCTION public.rpc_ops_transfer_delete_v1(
  p_transfer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer RECORD;
BEGIN
  -- A. Buscar a transferência
  SELECT * INTO v_transfer FROM public.transfers WHERE id = p_transfer_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transferência não encontrada');
  END IF;

  -- B. Deletar as transações bancárias vinculadas (Origem e Destino)
  -- Ao deletar, o trigger "trg_financial_transactions_update_account_balance"
  -- restaurará os saldos de ambas as contas automaticamente.
  DELETE FROM public.financial_transactions
  WHERE source_table = 'transfers' 
    AND source_id = p_transfer_id;

  -- C. Deletar o registro da transferência
  DELETE FROM public.transfers WHERE id = p_transfer_id;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', p_transfer_id,
    'from_account', v_transfer.from_account_id,
    'to_account', v_transfer.to_account_id,
    'amount', v_transfer.amount
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 2. Gatilho de Limpeza: Sócios (shareholder_transactions)
-- Ao excluir uma transação de sócio, limpa o rastro bancário automaticamente.
CREATE OR REPLACE FUNCTION public.fn_shareholder_tx_delete_cleanup()
RETURNS TRIGGER AS $$
BEGIN
  -- Deleta links e transações bancárias vinculadas
  -- O id da transação bancária costuma estar linkado via financial_links 
  -- ou estar órfão com o id do shareholder_tx no metadata/notes (estilo legado).
  
  -- Limpeza robusta via financial_links
  DELETE FROM public.financial_transactions
  WHERE id IN (
    SELECT transaction_id FROM public.financial_links 
    WHERE shareholder_tx_id = OLD.id
  );

  DELETE FROM public.financial_links WHERE shareholder_tx_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shareholder_tx_delete_cleanup ON public.shareholder_transactions;
CREATE TRIGGER trg_shareholder_tx_delete_cleanup
BEFORE DELETE ON public.shareholder_transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_shareholder_tx_delete_cleanup();

-- 3. Gatilho de Limpeza: Empréstimos (loans)
-- Ao excluir um empréstimo ou parcela, limpa o financeiro vinculado.
CREATE OR REPLACE FUNCTION public.fn_loan_delete_cleanup()
RETURNS TRIGGER AS $$
BEGIN
  -- Deleta transações bancárias vinculadas ao empréstimo
  DELETE FROM public.financial_transactions
  WHERE id IN (
    SELECT transaction_id FROM public.financial_links 
    WHERE loan_id = OLD.id
  );

  DELETE FROM public.financial_links WHERE loan_id = OLD.id;

  -- Deleta títulos financeiros (entries) vinculados
  DELETE FROM public.financial_entries
  WHERE origin_type IN ('loan_taken', 'loan_granted')
    AND origin_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_loan_delete_cleanup ON public.loans;
CREATE TRIGGER trg_loan_delete_cleanup
BEFORE DELETE ON public.loans
FOR EACH ROW EXECUTE FUNCTION public.fn_loan_delete_cleanup();

-- 2. Expandir a rpc_ops_financial_process_action (se necessário)
-- Já é genérica o suficiente para ler financial_entries de QUALQUER tipo.
-- Garante que o status 'pending' seja o padrão.

-- 3. Ajustar rpc_ops_financial_void_transaction para domínios complexos
-- Já está configurada para deletar links e transações.

-- Reiterar permissões
GRANT EXECUTE ON FUNCTION public.rpc_ops_transfer_delete_v1(UUID) TO authenticated;
