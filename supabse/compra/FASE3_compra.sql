-- FASE 3 - PEDIDO DE COMPRA (HEADERS + ITENS + RECEBIMENTOS + DESPESAS)
-- Data: 2026-01-25
-- Observações de segurança:
-- 1) Ative RLS antes de expor a tabela
-- 2) Sempre filtre por company_id nas policies
-- 3) Publique no Realtime somente após criar as tabelas

-- =====================================================================
-- TABELAS
-- =====================================================================

-- 1. purchase_orders (cabeçalho)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  partner_id UUID NOT NULL REFERENCES public.partners(id),
  date DATE NOT NULL,
  expected_date DATE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'received', 'cancelled')),
  total_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  received_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  company_id UUID REFERENCES public.companies(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_partner ON public.purchase_orders(partner_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company ON public.purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON public.purchase_orders(date);

-- 2. purchase_order_items (itens)
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_type_id TEXT NOT NULL REFERENCES public.product_types(id),
  quantity DECIMAL(15,3) NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  subtotal DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  received_quantity DECIMAL(15,3) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_order ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product ON public.purchase_order_items(product_type_id);

-- 3. purchase_receipts (conferência de entrada)
CREATE TABLE IF NOT EXISTS public.purchase_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id),
  receipt_date DATE NOT NULL,
  received_quantity DECIMAL(15,3) NOT NULL,
  notes TEXT,
  received_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_receipts_order ON public.purchase_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_date ON public.purchase_receipts(receipt_date);

-- 4. purchase_expenses (despesas extras do pedido)
CREATE TABLE IF NOT EXISTS public.purchase_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  expense_category_id TEXT NOT NULL REFERENCES public.expense_categories(id),
  description TEXT NOT NULL,
  value DECIMAL(15,2) NOT NULL,
  expense_date DATE NOT NULL,
  paid BOOLEAN DEFAULT false,
  payment_date DATE,
  bank_account_id UUID REFERENCES public.contas_bancarias(id),
  notes TEXT,
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_expenses_order ON public.purchase_expenses(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_expenses_category ON public.purchase_expenses(expense_category_id);
CREATE INDEX IF NOT EXISTS idx_purchase_expenses_paid ON public.purchase_expenses(paid);

-- =====================================================================
-- RLS (habilitar e policies básicas por company_id)
-- =====================================================================

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS purchase_orders_select ON public.purchase_orders;
CREATE POLICY purchase_orders_select ON public.purchase_orders
  FOR SELECT USING (company_id IS NULL OR company_id = auth.uid());
DROP POLICY IF EXISTS purchase_order_items_select ON public.purchase_order_items;
CREATE POLICY purchase_order_items_select ON public.purchase_order_items
  FOR SELECT USING (purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE company_id IS NULL OR company_id = auth.uid()));
DROP POLICY IF EXISTS purchase_receipts_select ON public.purchase_receipts;
CREATE POLICY purchase_receipts_select ON public.purchase_receipts
  FOR SELECT USING (purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE company_id IS NULL OR company_id = auth.uid()));
DROP POLICY IF EXISTS purchase_expenses_select ON public.purchase_expenses;
CREATE POLICY purchase_expenses_select ON public.purchase_expenses
  FOR SELECT USING (purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE company_id IS NULL OR company_id = auth.uid()));

-- Policies de INSERT
DROP POLICY IF EXISTS purchase_orders_insert ON public.purchase_orders;
CREATE POLICY purchase_orders_insert ON public.purchase_orders
  FOR INSERT WITH CHECK (company_id IS NULL OR company_id = auth.uid());
DROP POLICY IF EXISTS purchase_order_items_insert ON public.purchase_order_items;
CREATE POLICY purchase_order_items_insert ON public.purchase_order_items
  FOR INSERT WITH CHECK (purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE company_id IS NULL OR company_id = auth.uid()));
DROP POLICY IF EXISTS purchase_receipts_insert ON public.purchase_receipts;
CREATE POLICY purchase_receipts_insert ON public.purchase_receipts
  FOR INSERT WITH CHECK (purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE company_id IS NULL OR company_id = auth.uid()));
DROP POLICY IF EXISTS purchase_expenses_insert ON public.purchase_expenses;
CREATE POLICY purchase_expenses_insert ON public.purchase_expenses
  FOR INSERT WITH CHECK (purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE company_id IS NULL OR company_id = auth.uid()));

-- Policies de UPDATE
DROP POLICY IF EXISTS purchase_orders_update ON public.purchase_orders;
CREATE POLICY purchase_orders_update ON public.purchase_orders
  FOR UPDATE USING (company_id IS NULL OR company_id = auth.uid());
DROP POLICY IF EXISTS purchase_order_items_update ON public.purchase_order_items;
CREATE POLICY purchase_order_items_update ON public.purchase_order_items
  FOR UPDATE USING (purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE company_id IS NULL OR company_id = auth.uid()));
DROP POLICY IF EXISTS purchase_receipts_update ON public.purchase_receipts;
CREATE POLICY purchase_receipts_update ON public.purchase_receipts
  FOR UPDATE USING (purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE company_id IS NULL OR company_id = auth.uid()));
DROP POLICY IF EXISTS purchase_expenses_update ON public.purchase_expenses;
CREATE POLICY purchase_expenses_update ON public.purchase_expenses
  FOR UPDATE USING (purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE company_id IS NULL OR company_id = auth.uid()));

-- Policies de DELETE
DROP POLICY IF EXISTS purchase_orders_delete ON public.purchase_orders;
CREATE POLICY purchase_orders_delete ON public.purchase_orders
  FOR DELETE USING (company_id IS NULL OR company_id = auth.uid());
DROP POLICY IF EXISTS purchase_order_items_delete ON public.purchase_order_items;
CREATE POLICY purchase_order_items_delete ON public.purchase_order_items
  FOR DELETE USING (purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE company_id IS NULL OR company_id = auth.uid()));
DROP POLICY IF EXISTS purchase_receipts_delete ON public.purchase_receipts;
CREATE POLICY purchase_receipts_delete ON public.purchase_receipts
  FOR DELETE USING (purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE company_id IS NULL OR company_id = auth.uid()));
DROP POLICY IF EXISTS purchase_expenses_delete ON public.purchase_expenses;
CREATE POLICY purchase_expenses_delete ON public.purchase_expenses
  FOR DELETE USING (purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE company_id IS NULL OR company_id = auth.uid()));

-- =====================================================================
-- REALTIME (publicar tabelas)
-- =====================================================================
-- Adiciona apenas as tabelas que ainda não estão no realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'purchase_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'purchase_order_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_order_items;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'purchase_receipts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_receipts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'purchase_expenses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_expenses;
  END IF;
END $$;

-- =====================================================================
-- TESTE RÁPIDO (CRUD mínimo)
-- =====================================================================
-- 1) PEGAR UM PARTNER REAL E INSERIR PEDIDO
-- SELECT id, name FROM public.partners LIMIT 5; -- escolha um id existente
-- INSERT INTO public.purchase_orders (number, partner_id, date, status, company_id)
-- VALUES ('PC-TEST-001', '<partner_id_existente>', CURRENT_DATE, 'pending', auth.uid());

-- 2) INSERT item
-- INSERT INTO public.purchase_order_items (purchase_order_id, product_type_id, quantity, unit_price)
-- VALUES ('<pedido_id>', '00000000-0000-0000-0000-000000000000', 1000, 50.00);

-- 3) INSERT despesa
-- INSERT INTO public.purchase_expenses (purchase_order_id, expense_category_id, description, value, expense_date)
-- VALUES ('<pedido_id>', '00000000-0000-0000-0000-000000000000', 'Frete', 2000.00, CURRENT_DATE);

-- 4) SELECT totais
-- SELECT po.number, po.total_value, COALESCE(SUM(pe.value),0) AS despesas
-- FROM public.purchase_orders po
-- LEFT JOIN public.purchase_expenses pe ON pe.purchase_order_id = po.id
-- WHERE po.number = 'PC-TEST-001'
-- GROUP BY po.id;

-- 5) DELETE de teste
-- DELETE FROM public.purchase_orders WHERE number = 'PC-TEST-001';
