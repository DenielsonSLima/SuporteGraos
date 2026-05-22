-- ============================================================================
-- Migration: Fix Freight Payment Void Sync and Child Advance Rollback
-- Data: 2026-05-22
-- ============================================================================

SET search_path = public;

-- 1. Atualizar rpc_ops_financial_process_action para preencher loading_id em financial_links para type 'freight'
CREATE OR REPLACE FUNCTION public.rpc_ops_financial_process_action(
  p_entry_id UUID,
  p_account_id UUID,
  p_amount NUMERIC,
  p_discount NUMERIC DEFAULT 0,
  p_description TEXT DEFAULT NULL,
  p_transaction_date DATE DEFAULT CURRENT_DATE,
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry RECORD;
  v_tx_type TEXT;
  v_company_id UUID;
  v_tx_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Validações iniciais
  IF p_amount < 0 OR p_discount < 0 THEN
    RAISE EXCEPTION 'Valores não podem ser negativos';
  END IF;

  SELECT * INTO v_entry FROM financial_entries WHERE id = p_entry_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entrada financeira não encontrada: %', p_entry_id;
  END IF;

  v_company_id := v_entry.company_id;

  -- 2. Determinar tipo da transação (credit = Entrada/Recebimento, debit = Saída/Pagamento)
  IF v_entry.type IN ('receivable', 'loan_receivable', 'partner_contribution', 'internal_credit') THEN
    v_tx_type := 'credit';
  ELSE
    v_tx_type := 'debit';
  END IF;

  -- 3. Processar Pagamento (Ledger)
  IF p_amount > 0 THEN
    INSERT INTO financial_transactions (
      company_id,
      entry_id,
      account_id,
      type,
      amount,
      transaction_date,
      description
    ) VALUES (
      v_company_id,
      p_entry_id,
      p_account_id,
      v_tx_type,
      p_amount,
      p_transaction_date,
      COALESCE(p_description, 'Processamento via RPC')
    ) RETURNING id INTO v_tx_id;

    -- Registrar Link Robusto (Corrigido para mapear loading_id se origin_type for 'freight' ou 'loading')
    INSERT INTO financial_links (
      transaction_id,
      link_type,
      purchase_order_id,
      sales_order_id,
      loading_id,
      standalone_id,
      metadata
    ) VALUES (
      v_tx_id,
      CASE WHEN v_tx_type = 'credit' THEN 'receipt' ELSE 'payment' END,
      CASE WHEN v_entry.origin_type = 'purchase_order' THEN v_entry.origin_id ELSE NULL END,
      CASE WHEN v_entry.origin_type = 'sales_order' THEN v_entry.origin_id ELSE NULL END,
      CASE WHEN v_entry.origin_type IN ('loading', 'freight') THEN v_entry.origin_id ELSE NULL END,
      CASE WHEN v_entry.origin_type IS NULL OR v_entry.origin_type = 'standalone' THEN p_entry_id ELSE NULL END,
      p_metadata
    );
  END IF;

  -- 4. Processar Desconto (Abatimento) - Reduz o total_amount da entry
  IF p_discount > 0 THEN
    UPDATE financial_entries 
    SET total_amount = GREATEST(total_amount - p_discount, 0),
        updated_at = now()
    WHERE id = p_entry_id;
  END IF;

  -- 5. Retornar resultado formatado
  v_result := jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'entry_id', p_entry_id,
    'new_status', (SELECT status FROM financial_entries WHERE id = p_entry_id),
    'new_paid_amount', (SELECT paid_amount FROM financial_entries WHERE id = p_entry_id)
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;


-- 2. Atualizar fn_sync_financial_to_origin para atualizar freight_paid juntamente com paid_value
CREATE OR REPLACE FUNCTION public.fn_sync_financial_to_origin()
 RETURNS trigger
 LANGUAGE plpgsql
AS $$
BEGIN
    -- Sincronia para Pedidos de Venda
    IF NEW.origin_type = 'sales_order' THEN
        UPDATE public.ops_sales_orders 
        SET 
            received_value = NEW.paid_amount,
            updated_at = now()
        WHERE (id = NEW.origin_id OR legacy_id = NEW.origin_id)
        AND (received_value IS DISTINCT FROM NEW.paid_amount);

    -- Sincronia para Pedidos de Compra
    ELSIF NEW.origin_type = 'purchase_order' THEN
        UPDATE public.ops_purchase_orders 
        SET 
            paid_value = NEW.paid_amount,
            updated_at = now()
        WHERE (id = NEW.origin_id OR legacy_id = NEW.origin_id)
        AND (paid_value IS DISTINCT FROM NEW.paid_amount);

    -- Sincronia para Fretes
    ELSIF NEW.origin_type = 'freight' THEN
        -- Atualiza tanto paid_value quanto freight_paid para evitar loops infinitos ou dessincronia
        UPDATE public.ops_loadings 
        SET 
            paid_value = NEW.paid_amount,
            freight_paid = NEW.paid_amount,
            updated_at = now()
        WHERE id = NEW.origin_id 
        AND (paid_value IS DISTINCT FROM NEW.paid_amount OR freight_paid IS DISTINCT FROM NEW.paid_amount);
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- NUNCA derrube a transação financeira por erro de sync visual/dashboard
        RAISE WARNING '[fn_sync_financial_to_origin] ERRO: %', SQLERRM;
        RETURN NEW;
END;
$$;


-- 3. Atualizar rpc_ops_loading_rebuild_freight_financial_v1 para usar a verdade absoluta das transações se existirem
CREATE OR REPLACE FUNCTION public.rpc_ops_loading_rebuild_freight_financial_v1(p_origin_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $$
DECLARE
  v_company_id UUID;
  v_entry_id UUID;
  v_loading RECORD;
  v_due_date DATE;
  v_bruto NUMERIC(15,2);
  v_total_additions NUMERIC(15,2);
  v_total_deductions NUMERIC(15,2);
  v_neto NUMERIC(15,2);
  v_paid_direct NUMERIC(15,2);
  v_origin_id UUID;
  v_carrier_id UUID;
  v_total_paid_tx NUMERIC(15,2);
BEGIN
  v_company_id := public.fn_ops_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  -- 1. Buscar o carregamento
  SELECT * INTO v_loading
  FROM public.ops_loadings
  WHERE company_id = v_company_id
    AND (legacy_id = p_origin_id OR id = p_origin_id)
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carregamento canônico não encontrado para rebuild financeiro';
  END IF;

  v_origin_id := COALESCE(v_loading.legacy_id, v_loading.id);
  v_due_date := COALESCE(v_loading.loading_date, CURRENT_DATE);
  v_bruto := COALESCE(v_loading.total_freight_value, 0);
  v_paid_direct := COALESCE(v_loading.freight_paid, 0);
  
  -- Extrair Carrier ID do metadata usando NULLIF para evitar erro 22P02 com string vazia
  v_carrier_id := NULLIF(v_loading.metadata->>'carrierId', '')::UUID;

  -- 1.5 Buscar componentes do frete (extras/descontos)
  SELECT 
    COALESCE(SUM(amount) FILTER (WHERE deductible IS FALSE), 0),
    COALESCE(SUM(amount) FILTER (WHERE deductible IS TRUE), 0)
  INTO v_total_additions, v_total_deductions
  FROM public.ops_loading_freight_components
  WHERE loading_id = v_loading.id;

  v_neto := v_bruto + v_total_additions - v_total_deductions;

  -- 2. Gerenciar Entry de Frete
  SELECT id INTO v_entry_id
  FROM public.financial_entries
  WHERE company_id = v_company_id
    AND type = 'payable'
    AND origin_type = 'freight'
    AND origin_id = v_origin_id
  LIMIT 1;

  IF v_entry_id IS NOT NULL THEN
    -- Calcular a soma real das transações existentes
    SELECT COALESCE(SUM(
        CASE WHEN type = 'debit' THEN amount WHEN type = 'credit' THEN -amount ELSE 0 END
    ), 0) INTO v_total_paid_tx
    FROM public.financial_transactions
    WHERE entry_id = v_entry_id;

    UPDATE public.financial_entries
    SET total_amount = v_bruto,
        deductions_amount = v_total_deductions,
        net_amount = v_neto,
        -- Se existirem transações, a soma delas é a verdade absoluta. Se não, cai na info direta.
        paid_amount = CASE 
          WHEN EXISTS (SELECT 1 FROM public.financial_transactions WHERE entry_id = v_entry_id) THEN v_total_paid_tx 
          ELSE v_paid_direct 
        END,
        partner_id = COALESCE(v_carrier_id, partner_id),
        description = CONCAT('Frete do carregamento ', COALESCE(v_loading.vehicle_plate, 'SEM-PLACA'), 
                             CASE WHEN v_total_additions > 0 OR v_total_deductions > 0 THEN ' (Ajustado)' ELSE '' END),
        due_date = v_due_date,
        updated_at = now()
    WHERE id = v_entry_id;
  ELSE
    IF v_bruto > 0 OR v_total_additions > 0 THEN
      INSERT INTO public.financial_entries (
        company_id,
        type,
        origin_type,
        origin_id,
        partner_id,
        description,
        total_amount,
        deductions_amount,
        net_amount,
        paid_amount,
        due_date
      ) VALUES (
        v_company_id,
        'payable',
        'freight',
        v_origin_id,
        v_carrier_id,
        CONCAT('Frete do carregamento ', COALESCE(v_loading.vehicle_plate, 'SEM-PLACA')),
        v_bruto,
        v_total_deductions,
        v_neto,
        v_paid_direct,
        v_due_date
      ) RETURNING id INTO v_entry_id;
    END IF;
  END IF;

  RETURN v_entry_id;
END;
$$;


-- 4. Atualizar rpc_ops_financial_void_transaction com cálculo de paid_amount em tempo real e rollback do adiantamento filho
CREATE OR REPLACE FUNCTION public.rpc_ops_financial_void_transaction(p_transaction_id uuid, p_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_tx RECORD;
  v_entry RECORD;
  v_new_paid NUMERIC;
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
  -- Se o pagamento de frete foi realizado via adiantamento (Conta virtual '97e8bd30-3ba1-4658-a51e-5df6ce184845'),
  -- precisamos localizar a utilização correspondente no adiantamento pai e revertê-la/excluí-la.
  IF v_tx.entry_id IS NOT NULL AND v_tx.account_id = '97e8bd30-3ba1-4658-a51e-5df6ce184845'::uuid THEN
    SELECT * INTO v_entry FROM financial_entries WHERE id = v_tx.entry_id;
    IF v_entry.id IS NOT NULL AND v_entry.origin_type = 'freight' THEN
      -- Buscar adiantamento filho de consumo para este parceiro na mesma data e com o mesmo valor
      SELECT * INTO v_child_advance FROM public.advances
      WHERE parent_id IS NOT NULL
        AND recipient_id = v_entry.partner_id
        AND company_id = v_tx.company_id
        AND amount = v_tx.amount
        AND advance_date = v_tx.transaction_date
      ORDER BY created_at DESC
      LIMIT 1;

      -- Se encontrar o consumo (adiantamento filho), realiza a exclusão robusta via rpc_delete_advance
      IF v_child_advance.id IS NOT NULL THEN
        PERFORM public.rpc_delete_advance(v_child_advance.id);
      END IF;
    END IF;
  END IF;

  -- 2. Deletar links robustos primeiro (para não violar FK)
  DELETE FROM financial_links WHERE transaction_id = p_transaction_id;

  -- 3. Deletar a transação
  DELETE FROM financial_transactions WHERE id = p_transaction_id;

  -- 4. CASCATA PARA OPS: Propagar o novo paid_amount da entry para as tabelas operacionais
  IF v_tx.entry_id IS NOT NULL THEN
    SELECT * INTO v_entry FROM financial_entries WHERE id = v_tx.entry_id;
    
    IF v_entry.id IS NOT NULL THEN
      -- Calcular o novo paid_amount em tempo real excluindo a transação atualizada
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

      -- Atualizar a financial_entry IMEDIATAMENTE (antes de disparar triggers para sincronia operacional)
      UPDATE public.financial_entries SET
          paid_amount = v_new_paid,
          status = CASE
              WHEN v_new_paid >= total_amount AND total_amount > 0 THEN 'paid'
              WHEN v_new_paid > 0 THEN 'partially_paid'
              ELSE 'pending'
          END,
          updated_at = now()
      WHERE id = v_entry.id;

      -- 4a. Sync com Pedido de Compra
      IF v_entry.origin_type = 'purchase_order' AND v_entry.origin_id IS NOT NULL THEN
        UPDATE ops_purchase_orders
        SET 
          paid_value = v_new_paid,
          balance_value = GREATEST(COALESCE(total_value, 0) - COALESCE(discount_value, 0) - v_new_paid, 0),
          updated_at = now()
        WHERE id = v_entry.origin_id
           OR legacy_id = v_entry.origin_id;
      END IF;

      -- 4b. Sync com Pedido de Venda
      IF v_entry.origin_type = 'sales_order' AND v_entry.origin_id IS NOT NULL THEN
        UPDATE ops_sales_orders
        SET 
          received_value = v_new_paid,
          paid_value = v_new_paid,
          balance_value = GREATEST(COALESCE(total_value, 0) - COALESCE(discount_value, 0) - v_new_paid, 0),
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
    'new_paid_amount', COALESCE(v_new_paid, 0)
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
