-- [FIX] Desativando permanentemente a alteração automática de status no banco de dados.
-- O usuário exige controle manual total via botões (Finalizar/Reabrir).

CREATE OR REPLACE FUNCTION public.fn_sync_purchase_order_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_po_id UUID;
  v_total_paid NUMERIC(15,2);
BEGIN
  v_po_id := COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  
  IF v_po_id IS NOT NULL THEN
    -- Recalcula o pago real via links financeiros
    SELECT COALESCE(SUM(
      CASE 
        WHEN ft.type = 'debit' THEN ft.amount 
        WHEN ft.type = 'credit' THEN -ft.amount 
        ELSE 0 
      END
    ), 0) INTO v_total_paid
    FROM public.financial_links fl
    JOIN public.financial_transactions ft ON ft.id = fl.transaction_id
    WHERE fl.purchase_order_id = v_po_id;

    -- ATUALIZA APENAS O VALOR (paid_value). 
    -- O Status NUNCA deve ser alterado automaticamente, atendendo à regra de negócio do usuário.
    UPDATE public.ops_purchase_orders SET
      paid_value = v_total_paid,
      updated_at = now()
    WHERE id = v_po_id;
  END IF;

  RETURN NULL;
END;
$$;

-- Aplica a regra de reabertura para garantir que NENHUM pedido fique travado em 'completed' indevidamente agora.
UPDATE public.ops_purchase_orders 
SET status = 'approved' 
WHERE status IN ('completed', 'received') AND (paid_value < total_value OR total_value = 0);
