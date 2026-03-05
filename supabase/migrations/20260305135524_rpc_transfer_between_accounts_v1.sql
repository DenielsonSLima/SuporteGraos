-- Migration: rpc_transfer_between_accounts_v1
-- Description: Registers a transfer between two internal accounts atomically

CREATE OR REPLACE FUNCTION public.rpc_transfer_accounts(
    p_id UUID,
    p_company_id UUID,
    p_from_account_id UUID,
    p_to_account_id UUID,
    p_amount NUMERIC,
    p_transfer_date DATE,
    p_description TEXT,
    p_notes TEXT,
    p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_tx_out_id UUID;
    v_tx_in_id UUID;
BEGIN
    -- 1. Inserir o registro de transferência na tabela transfers
    INSERT INTO public.transfers (
        id,
        company_id,
        from_account_id,
        to_account_id,
        amount,
        transfer_date,
        description,
        notes,
        created_by
    ) VALUES (
        p_id,
        p_company_id,
        p_from_account_id,
        p_to_account_id,
        p_amount,
        p_transfer_date,
        p_description,
        p_notes,
        p_created_by
    );

    -- 2. Criar transaction OUT na conta de origem
    INSERT INTO public.financial_transactions (
        company_id,
        account_id,
        type,
        amount,
        description,
        transaction_date,
        category,
        source_table,
        source_id
    ) VALUES (
        p_company_id,
        p_from_account_id,
        'out',
        p_amount,
        'Transferência enviada para conta de destino: ' || p_description,
        p_transfer_date,
        'Transferência Bancária',
        'transfers',
        p_id
    ) RETURNING id INTO v_tx_out_id;

    -- 3. Atualizar saldo da conta de origem
    UPDATE public.accounts
    SET custom_balance = COALESCE(custom_balance, 0) - p_amount,
        updated_at = NOW()
    WHERE id = p_from_account_id;

    -- 4. Criar transaction IN na conta de destino
    INSERT INTO public.financial_transactions (
        company_id,
        account_id,
        type,
        amount,
        description,
        transaction_date,
        category,
        source_table,
        source_id
    ) VALUES (
        p_company_id,
        p_to_account_id,
        'in',
        p_amount,
        'Transferência recebida da conta de origem: ' || p_description,
        p_transfer_date,
        'Transferência Bancária',
        'transfers',
        p_id
    ) RETURNING id INTO v_tx_in_id;

    -- 5. Atualizar saldo da conta de destino
    UPDATE public.accounts
    SET custom_balance = COALESCE(custom_balance, 0) + p_amount,
        updated_at = NOW()
    WHERE id = p_to_account_id;

    RETURN p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
