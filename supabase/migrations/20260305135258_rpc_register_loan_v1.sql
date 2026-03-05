-- Migration: rpc_register_loan_v1
-- Description: Registers a loan atomically, creating the obligation and moving the money in the bank account

CREATE OR REPLACE FUNCTION public.rpc_register_loan(
    p_company_id UUID,
    p_id UUID,
    p_description TEXT,
    p_entity_name TEXT,
    p_category TEXT,
    p_issue_date DATE,
    p_due_date DATE,
    p_original_value NUMERIC,
    p_bank_account_id UUID,
    p_type TEXT, -- 'loan_taken' or 'loan_granted'
    p_notes TEXT
)
RETURNS UUID AS $$
DECLARE
    v_entry_id UUID;
    v_tx_id UUID;
    v_entry_type TEXT;
    v_tx_type TEXT;
    v_tx_description TEXT;
BEGIN
    -- 1. Determinar direção ( Payable + IN ou Receivable + OUT )
    IF p_type = 'loan_taken' THEN
        v_entry_type := 'payable';
        v_tx_type := 'in';
        v_tx_description := 'Crédito de Empréstimo: ' || p_description;
    ELSIF p_type = 'loan_granted' THEN
        v_entry_type := 'receivable';
        v_tx_type := 'out';
        v_tx_description := 'Débito de Empréstimo: ' || p_description;
    ELSE
        RAISE EXCEPTION 'Tipo de empréstimo inválido';
    END IF;

    -- 2. Inserir no standalone_records (Para manter a compatibilidade da tela de Empréstimos)
    INSERT INTO public.standalone_records (
        id,
        company_id,
        description,
        entity_name,
        category,
        issue_date,
        due_date,
        original_value,
        paid_value,
        status,
        sub_type,
        bank_account,
        notes
    ) VALUES (
        p_id,
        p_company_id,
        p_description,
        p_entity_name,
        p_category,
        p_issue_date,
        p_due_date,
        p_original_value,
        0, -- Ainda não foi pago o principal do empréstimo em si
        'pending',
        p_type,
        p_bank_account_id,
        p_notes
    );

    -- 3. Criar a financial_entry que representa a obrigação
    INSERT INTO public.financial_entries (
        company_id,
        type,
        origin_type,
        origin_id,
        partner_id,
        total_amount,
        paid_amount,
        remaining_amount,
        status,
        created_date,
        due_date
    ) VALUES (
        p_company_id,
        v_entry_type,
        'loan',
        p_id,
        p_entity_name, -- Gravando o nome caso parceiro não exista
        p_original_value,
        0,
        p_original_value,
        'open',
        p_issue_date,
        p_due_date
    ) RETURNING id INTO v_entry_id;

    -- 4. Criar a financial_transaction para movimentar o dinheiro AGORA
    INSERT INTO public.financial_transactions (
        company_id,
        account_id,
        type,
        amount,
        description,
        transaction_date,
        entry_id,
        category,
        source_table,
        source_id
    ) VALUES (
        p_company_id,
        p_bank_account_id,
        v_tx_type,
        p_original_value,
        v_tx_description,
        p_issue_date,
        v_entry_id,
        'Empréstimos',
        'standalone_records',
        p_id
    ) RETURNING id INTO v_tx_id;

    -- 5. Atualizar o saldo da conta (accounts)
    IF v_tx_type = 'in' THEN
        UPDATE public.accounts
        SET custom_balance = COALESCE(custom_balance, 0) + p_original_value,
            updated_at = NOW()
        WHERE id = p_bank_account_id;
    ELSE
        UPDATE public.accounts
        SET custom_balance = COALESCE(custom_balance, 0) - p_original_value,
            updated_at = NOW()
        WHERE id = p_bank_account_id;
    END IF;

    RETURN p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
