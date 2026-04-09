-- ============================================================================
-- MIGRATION: 20260408_asset_integrity_fix.sql
-- Objetivo: SQL-First para o Patrimônio. Atomicidade na venda/exclusão 
--           e sincronização automática de recebíveis.
-- ============================================================================

SET search_path = public;

-- 1. Evolução do Schema: Adicionar valor recebido à ficha do bem
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS paid_value NUMERIC(15,2) DEFAULT 0;

-- 2. Redefinir rpc_register_asset_sale (Padronização e Robustez)
CREATE OR REPLACE FUNCTION public.rpc_register_asset_sale(
    p_asset_id UUID,
    p_sale_value NUMERIC,
    p_installments INTEGER,
    p_first_due_date DATE,
    p_buyer_name TEXT,
    p_buyer_id UUID DEFAULT NULL, -- Agora explícito como UUID
    p_sale_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_entry_id UUID;
BEGIN
    SELECT company_id INTO v_company_id FROM public.assets WHERE id = p_asset_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ativo não encontrado: %', p_asset_id;
    END IF;

    -- A. Atualiza o status do ativo
    UPDATE public.assets
    SET status = 'sold',
        sale_value = p_sale_value,
        sale_date = p_sale_date,
        buyer_name = p_buyer_name,
        buyer_id = p_buyer_id,
        updated_at = now()
    WHERE id = p_asset_id;

    -- B. Cria a financial_entry de recebível (SQL-First)
    -- Usamos o status 'pending' conforme padrão novo das Phase 2/3
    INSERT INTO public.financial_entries (
        company_id,
        type,
        origin_type,
        origin_id,
        partner_id,
        description,
        total_amount,
        paid_amount,
        status,
        due_date,
        created_at
    ) VALUES (
        v_company_id,
        'receivable',
        'asset_sale',
        p_asset_id,
        p_buyer_id,
        CONCAT('Venda de Ativo: ', (SELECT name FROM assets WHERE id = p_asset_id)),
        p_sale_value,
        0,
        'pending'::public.financial_entry_status,
        p_first_due_date,
        p_sale_date
    ) RETURNING id INTO v_entry_id;

    RETURN v_entry_id;
END;
$$;

-- 3. Criar RPC Atômica para Exclusão de Patrimônio
CREATE OR REPLACE FUNCTION public.rpc_ops_asset_delete_v1(
  p_asset_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  v_company_id := public.fn_ops_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  -- A. Deletar Transações de Caixa vinculadas a este bem (se houver venda)
  DELETE FROM public.financial_transactions
  WHERE id IN (
    SELECT transaction_id FROM public.financial_links 
    WHERE (standalone_id IN (SELECT id FROM financial_entries WHERE origin_type = 'asset_sale' AND origin_id = p_asset_id))
  );

  -- B. Deletar Links Financeiros do bem
  DELETE FROM public.financial_links
  WHERE (standalone_id IN (SELECT id FROM financial_entries WHERE origin_type = 'asset_sale' AND origin_id = p_asset_id));

  -- C. Deletar Títulos de Recebível da Venda
  DELETE FROM public.financial_entries
  WHERE company_id = v_company_id
    AND origin_type = 'asset_sale'
    AND origin_id = p_asset_id;

  -- D. Deletar o Ativo
  DELETE FROM public.assets
  WHERE company_id = v_company_id
    AND id = p_asset_id;
END;
$$;

-- 4. Criar Gatilho de Sincronização: financial_entries -> assets (paid_value)
CREATE OR REPLACE FUNCTION public.fn_sync_asset_sale_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.origin_type = 'asset_sale' THEN
    UPDATE public.assets
    SET paid_value = COALESCE(NEW.paid_amount, 0),
        updated_at = now()
    WHERE id = NEW.origin_id
      AND company_id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_asset_sale_paid_amount ON public.financial_entries;
CREATE TRIGGER trg_sync_asset_sale_paid_amount
AFTER UPDATE OF paid_amount ON public.financial_entries
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_asset_sale_paid_amount();

-- Reiterar permissões
GRANT EXECUTE ON FUNCTION public.rpc_register_asset_sale(UUID, NUMERIC, INTEGER, DATE, TEXT, UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_ops_asset_delete_v1(UUID) TO authenticated;
