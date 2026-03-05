-- Migration: rpc_register_asset_sale_v1
-- Description: Registers an asset sale and creates the corresponding financial_entry atomically

CREATE OR REPLACE FUNCTION public.rpc_register_asset_sale(
    p_asset_id UUID,
    p_sale_value NUMERIC,
    p_installments INTEGER,
    p_first_due_date DATE,
    p_buyer_name TEXT,
    p_buyer_id TEXT,
    p_sale_date DATE
)
RETURNS UUID AS $$
DECLARE
    v_company_id UUID;
    v_entry_id UUID;
BEGIN
    -- Obter o company_id a partir do ativo
    SELECT company_id INTO v_company_id
    FROM public.assets
    WHERE id = p_asset_id;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Ativo não encontrado ou sem company_id';
    END IF;

    -- 1. Atualiza o status do ativo
    UPDATE public.assets
    SET status = 'sold',
        sale_value = p_sale_value,
        sale_date = p_sale_date,
        buyer_name = p_buyer_name,
        buyer_id = p_buyer_id,
        metadata = jsonb_set(
            jsonb_set(
                jsonb_set(
                    jsonb_set(COALESCE(metadata, '{}'::jsonb), '{status}', '"sold"'::jsonb),
                    '{saleValue}', to_jsonb(p_sale_value)
                ),
                '{buyerName}', to_jsonb(p_buyer_name)
            ),
            '{saleDate}', to_jsonb(p_sale_date)
        )
    WHERE id = p_asset_id;

    -- 2. Cria a financial_entry de recebível
    -- Nota: ASKIL define criar UMA obrigação (entry) e receber em partes.
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
        v_company_id,
        'receivable',
        'asset_sale',
        p_asset_id,
        COALESCE(p_buyer_id, p_buyer_name), -- fallback caso buyer_id seja null
        p_sale_value,
        0,
        p_sale_value,
        'open',
        p_sale_date,
        p_first_due_date
    ) RETURNING id INTO v_entry_id;

    RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
