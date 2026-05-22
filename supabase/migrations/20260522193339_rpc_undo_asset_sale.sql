-- Migration to add RPC for undoing an asset sale (Estorno de Venda de Ativo)

CREATE OR REPLACE FUNCTION rpc_undo_asset_sale(
  p_asset_id UUID
) RETURNS VOID AS $$
DECLARE
  v_asset_status TEXT;
  v_has_paid_installments BOOLEAN;
BEGIN
  -- 1. Check if the asset exists and is sold
  SELECT status INTO v_asset_status
  FROM assets
  WHERE id = p_asset_id;

  IF v_asset_status IS NULL THEN
    RAISE EXCEPTION 'Ativo não encontrado.';
  END IF;

  IF v_asset_status != 'sold' THEN
    RAISE EXCEPTION 'Apenas ativos com status "Vendido" podem ter a venda estornada.';
  END IF;

  -- 2. Check if there are any already paid installments related to this sale
  -- Se já houver parcelas pagas, o usuário não pode estornar diretamente sem antes estornar o recebimento no caixa.
  SELECT EXISTS (
    SELECT 1 FROM financial_records
    WHERE asset_id = p_asset_id
      AND category = 'asset_sale'
      AND status = 'paid'
  ) INTO v_has_paid_installments;

  IF v_has_paid_installments THEN
    RAISE EXCEPTION 'Existem parcelas desta venda que já foram liquidadas. Estorne os recebimentos no caixa primeiro antes de cancelar a venda do ativo.';
  END IF;

  -- 3. Delete all pending financial records related to this asset sale
  DELETE FROM financial_records
  WHERE asset_id = p_asset_id
    AND category = 'asset_sale'
    AND status != 'paid';

  -- 4. Update the asset back to active
  UPDATE assets
  SET 
    status = 'active',
    sale_value = NULL,
    sale_date = NULL,
    buyer_name = NULL,
    buyer_id = NULL
  WHERE id = p_asset_id;

END;
$$ LANGUAGE plpgsql;
