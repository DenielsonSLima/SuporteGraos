-- ============================================================================
-- Migration: void_transaction_reopen_orders
-- Description: Updates public.rpc_ops_financial_void_transaction to set order 
-- status back to 'approved' when voiding payments/receipts leaves an open balance.
-- Date: 2026-05-27
-- ============================================================================

SET search_path = public;

CREATE OR REPLACE FUNCTION public.rpc_ops_financial_void_transaction(p_transaction_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_entry RECORD;
  v_new_paid NUMERIC;
  v_new_discount NUMERIC;
  v_expenses_discount NUMERIC := 0;
  v_po_legacy_id UUID;
  v_result JSONB;
  v_legacy_tx_id TEXT;
  v_child_advance RECORD;
BEGIN
  -- 1. Buscar a transação
  SELECT * INTO v_tx FROM financial_transactions WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transação não encontrada: %', p_transaction_id;
  END IF;

  v_legacy_tx_id := v_tx.metadata->>'tx_id';

  -- Estorno de uso de adiantamento (consumo)
  IF v_tx.entry_id IS NOT NULL AND v_tx.account_id = '97e8bd30-3ba1-4658-a51e-5df6ce184845'::uuid THEN
    SELECT * INTO v_entry FROM financial_entries WHERE id = v_tx.entry_id;
    IF v_entry.id IS NOT NULL AND v_entry.origin_type = 'freight' THEN
      SELECT * INTO v_child_advance FROM public.advances
      WHERE parent_id IS NOT NULL
        AND recipient_id = v_entry.partner_id
        AND company_id = v_tx.company_id
        AND amount = v_tx.amount
        AND advance_date = v_tx.transaction_date
      ORDER BY created_at DESC
      LIMIT 1;

      IF v_child_advance.id IS NOT NULL THEN
        PERFORM public.rpc_delete_advance(v_child_advance.id);
      END IF;
    END IF;
  END IF;

  -- 2. Deletar links robustos primeiro (para não violar FK)
  DELETE FROM financial_links WHERE transaction_id = p_transaction_id;

  -- 3. Deletar a transação
  DELETE FROM financial_transactions WHERE id = p_transaction_id;

  -- 4. CASCATA PARA OPS: Propagar o novo paid_amount e discount_amount da entry para as tabelas operacionais
  IF v_tx.entry_id IS NOT NULL THEN
    SELECT * INTO v_entry FROM financial_entries WHERE id = v_tx.entry_id;
    
    IF v_entry.id IS NOT NULL THEN
      -- Calcular o novo paid_amount em tempo real excluindo a transação deletada
      SELECT COALESCE(SUM(
          CASE 
              WHEN v_entry.type IN ('payable', 'loan_payable', 'expense', 'admin_expense', 'tax') THEN
                  CASE WHEN type = 'debit' THEN amount WHEN type = 'credit' THEN -amount ELSE 0 END
              ELSE
                  CASE WHEN type = 'credit' THEN amount WHEN type = 'debit' THEN -amount ELSE 0 END
          END
      ), 0) INTO v_new_paid
      FROM public.financial_transactions
      WHERE entry_id = v_entry.id;

      -- Calcular o novo discount_amount em tempo real excluindo o desconto da transação deletada
      SELECT COALESCE(SUM(COALESCE((metadata->>'discount_amount')::numeric, 0)), 0) INTO v_new_discount
      FROM public.financial_transactions
      WHERE entry_id = v_entry.id;

      -- Se for um pedido de compra, somar as despesas extras dedutíveis ativas
      IF v_entry.origin_type = 'purchase_order' AND v_entry.origin_id IS NOT NULL THEN
        SELECT legacy_id INTO v_po_legacy_id FROM public.ops_purchase_orders WHERE id = v_entry.origin_id OR legacy_id = v_entry.origin_id;
        IF v_po_legacy_id IS NULL THEN
          v_po_legacy_id := v_entry.origin_id;
        END IF;

        SELECT COALESCE(SUM(amount), 0) INTO v_expenses_discount
        FROM public.ops_purchase_order_expenses
        WHERE (purchase_order_id = v_entry.origin_id OR purchase_order_id = v_po_legacy_id)
          AND deductible = true;
          
        v_new_discount := v_new_discount + v_expenses_discount;
      END IF;

      -- Atualizar a financial_entry IMEDIATAMENTE
      UPDATE public.financial_entries SET
          paid_amount = v_new_paid,
          discount_amount = v_new_discount,
          status = CASE
              WHEN (v_new_paid + v_new_discount) >= total_amount AND total_amount > 0 THEN 'paid'
              WHEN (v_new_paid + v_new_discount) > 0 THEN 'partially_paid'
              ELSE 'pending'
          END,
          updated_at = now()
      WHERE id = v_entry.id;

      -- 4a. Sync com Pedido de Compra (Se saldo ficar aberto, reabre o status para 'approved')
      IF v_entry.origin_type = 'purchase_order' AND v_entry.origin_id IS NOT NULL THEN
        UPDATE ops_purchase_orders
        SET 
          paid_value = v_new_paid,
          discount_value = v_new_discount,
          balance_value = GREATEST(COALESCE(total_value, 0) - v_new_discount - v_new_paid, 0),
          status = CASE 
            WHEN status IN ('completed', 'received') AND GREATEST(COALESCE(total_value, 0) - v_new_discount - v_new_paid, 0) > 0 THEN 'approved' 
            ELSE status 
          END,
          updated_at = now()
        WHERE id = v_entry.origin_id
           OR legacy_id = v_entry.origin_id;
      END IF;

      -- 4b. Sync com Pedido de Venda (Se saldo ficar aberto, reabre o status para 'approved')
      IF v_entry.origin_type = 'sales_order' AND v_entry.origin_id IS NOT NULL THEN
        UPDATE ops_sales_orders
        SET 
          received_value = v_new_paid,
          paid_value = v_new_paid,
          discount_value = v_new_discount,
          balance_value = GREATEST(COALESCE(total_value, 0) - v_new_discount - v_new_paid, 0),
          status = CASE 
            WHEN status IN ('completed', 'delivered') AND GREATEST(COALESCE(total_value, 0) - v_new_discount - v_new_paid, 0) > 0 THEN 'approved' 
            ELSE status 
          END,
          updated_at = now()
        WHERE id = v_entry.origin_id
           OR legacy_id = v_entry.origin_id;
      END IF;

      -- 4c. Sync com Frete/Loading
      IF v_entry.origin_type IN ('freight', 'loading') AND v_entry.origin_id IS NOT NULL THEN
        UPDATE ops_loadings
        SET 
          paid_value = v_new_paid,
          freight_paid = v_new_paid,
          balance_value = GREATEST(COALESCE(total_freight_value, 0) - v_new_paid, 0),
          metadata = CASE WHEN metadata->'transactions' IS NOT NULL THEN
            jsonb_set(
              metadata,
              '{transactions}',
              COALESCE(
                (SELECT jsonb_agg(elem)
                 FROM jsonb_array_elements(metadata->'transactions') elem
                 WHERE (elem->>'id') != p_transaction_id::text
                   AND (v_legacy_tx_id IS NULL OR (elem->>'id') != v_legacy_tx_id)
                ),
                '[]'::jsonb
              )
            )
            ELSE metadata END,
          raw_payload = CASE WHEN raw_payload->'transactions' IS NOT NULL THEN
            jsonb_set(
              raw_payload,
              '{transactions}',
              COALESCE(
                (SELECT jsonb_agg(elem)
                 FROM jsonb_array_elements(raw_payload->'transactions') elem
                 WHERE (elem->>'id') != p_transaction_id::text
                   AND (v_legacy_tx_id IS NULL OR (elem->>'id') != v_legacy_tx_id)
                ),
                '[]'::jsonb
              )
            )
            ELSE raw_payload END,
          updated_at = now()
        WHERE id = v_entry.origin_id
           OR legacy_id = v_entry.origin_id;
      END IF;
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'voided_id', p_transaction_id,
    'entry_id', v_tx.entry_id,
    'new_paid_amount', COALESCE(v_new_paid, 0),
    'new_discount_amount', COALESCE(v_new_discount, 0)
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_ops_financial_void_transaction(UUID) TO authenticated;
