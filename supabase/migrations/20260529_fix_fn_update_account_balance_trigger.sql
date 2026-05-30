-- Migration to fix fn_update_account_balance to respect initial balance dates

CREATE OR REPLACE FUNCTION public.fn_update_account_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_account_id UUID;
    v_company_id UUID;
    v_initial_balance NUMERIC(15, 2) := 0;
    v_initial_balance_date DATE;
    v_total_transactions NUMERIC(15, 2) := 0;
    v_new_balance NUMERIC(15, 2) := 0;
BEGIN
    -- Determine the account and company ID based on the operation
    IF TG_OP = 'DELETE' THEN
        v_account_id := OLD.account_id;
        v_company_id := OLD.company_id;
    ELSE
        v_account_id := NEW.account_id;
        v_company_id := NEW.company_id;
    END IF;

    -- Fetch initial balance and its date
    SELECT amount, balance_date INTO v_initial_balance, v_initial_balance_date
    FROM initial_balances
    WHERE account_id = v_account_id AND company_id = v_company_id
    LIMIT 1;

    -- Fetch sum of valid transactions on or after the initial balance date
    SELECT COALESCE(SUM(amount), 0) INTO v_total_transactions
    FROM financial_transactions
    WHERE account_id = v_account_id
      AND company_id = v_company_id
      AND status != 'canceled'
      AND (v_initial_balance_date IS NULL OR transaction_date >= v_initial_balance_date);

    -- Calculate the new balance
    v_new_balance := COALESCE(v_initial_balance, 0) + v_total_transactions;

    -- Update the account balance
    UPDATE accounts
    SET current_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = v_account_id AND company_id = v_company_id;

    RETURN NULL;
END;
$$;
