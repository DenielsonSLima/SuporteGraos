-- ============================================
-- MIGRAÇÃO: DESPESAS ADMINISTRATIVAS (STANDALONE_RECORDS)
-- ============================================
-- Data: 28/01/2026
-- Descrição: Criação da tabela standalone_records no Supabase para migrar
-- as despesas administrativas que estavam em localStorage

-- ============================================
-- 1. CRIAR TABELA
-- ============================================

CREATE TABLE IF NOT EXISTS public.standalone_records (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    driver_name TEXT,
    category TEXT NOT NULL,
    due_date DATE NOT NULL,
    issue_date DATE NOT NULL,
    settlement_date DATE,
    original_value NUMERIC(12, 2) NOT NULL,
    paid_value NUMERIC(12, 2) DEFAULT 0,
    discount_value NUMERIC(12, 2) DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'overdue', 'partial')),
    sub_type TEXT DEFAULT 'admin' CHECK (sub_type = 'admin'),
    bank_account TEXT,
    notes TEXT,
    asset_id TEXT,
    is_asset_receipt BOOLEAN DEFAULT FALSE,
    asset_name TEXT,
    weight_sc NUMERIC(12, 2),
    weight_kg NUMERIC(12, 2),
    unit_price_ton NUMERIC(12, 2),
    unit_price_sc NUMERIC(12, 2),
    load_count INTEGER DEFAULT 0,
    total_ton NUMERIC(12, 2),
    total_sc NUMERIC(12, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_standalone_records_status ON public.standalone_records(status);
CREATE INDEX IF NOT EXISTS idx_standalone_records_due_date ON public.standalone_records(due_date);
CREATE INDEX IF NOT EXISTS idx_standalone_records_issue_date ON public.standalone_records(issue_date);
CREATE INDEX IF NOT EXISTS idx_standalone_records_entity_name ON public.standalone_records(entity_name);
CREATE INDEX IF NOT EXISTS idx_standalone_records_category ON public.standalone_records(category);

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS trigger_update_standalone_records_updated_at ON public.standalone_records;

CREATE OR REPLACE FUNCTION update_standalone_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_standalone_records_updated_at
    BEFORE UPDATE ON public.standalone_records
    FOR EACH ROW
    EXECUTE FUNCTION update_standalone_records_updated_at();

-- ============================================
-- 2. CONFIGURAR RLS (ROW LEVEL SECURITY)
-- ============================================

-- Habilitar RLS
ALTER TABLE public.standalone_records ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Allow SELECT for authenticated users" ON public.standalone_records;
DROP POLICY IF EXISTS "Allow INSERT for authenticated users" ON public.standalone_records;
DROP POLICY IF EXISTS "Allow UPDATE for authenticated users" ON public.standalone_records;
DROP POLICY IF EXISTS "Allow DELETE for authenticated users" ON public.standalone_records;

-- Política de SELECT: usuários autenticados podem ler todos os registros
CREATE POLICY "Allow SELECT for authenticated users" ON public.standalone_records
    FOR SELECT
    TO authenticated
    USING (true);

-- Política de INSERT: usuários autenticados podem criar registros
CREATE POLICY "Allow INSERT for authenticated users" ON public.standalone_records
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Política de UPDATE: usuários autenticados podem atualizar registros
CREATE POLICY "Allow UPDATE for authenticated users" ON public.standalone_records
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Política de DELETE: usuários autenticados podem excluir registros
CREATE POLICY "Allow DELETE for authenticated users" ON public.standalone_records
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================
-- 3. ATIVAR REALTIME
-- ============================================
-- Execute este comando no SQL Editor ou use a interface do Supabase:
-- Database > Replication > Manage publications
-- Adicione a tabela "standalone_records" à publicação "supabase_realtime"

-- Via SQL (se a tabela ainda não estiver na publicação):
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.standalone_records;

-- ============================================
-- 4. SCRIPT DE MIGRAÇÃO DE DADOS (OPCIONAL)
-- ============================================
-- Caso você tenha dados no localStorage que precisa migrar manualmente,
-- use o seguinte template para INSERT:

/*
INSERT INTO public.standalone_records (
    id,
    description,
    entity_name,
    driver_name,
    category,
    due_date,
    issue_date,
    settlement_date,
    original_value,
    paid_value,
    discount_value,
    status,
    sub_type,
    bank_account,
    notes
) VALUES (
    'exemplo-id-123',
    'Energia Elétrica - Janeiro/2026',
    'CPFL Energia',
    NULL,
    'Utilidades',
    '2026-01-15',
    '2026-01-01',
    '2026-01-10',
    1500.00,
    1500.00,
    0,
    'paid',
    'admin',
    'Banco do Brasil',
    'Pagamento realizado via débito automático'
);
*/

-- ============================================
-- 5. VERIFICAÇÃO
-- ============================================

-- Verificar se a tabela foi criada
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'standalone_records';

-- Verificar RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'standalone_records';

-- Verificar políticas
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'standalone_records';

-- Verificar realtime (se ativado)
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'standalone_records';

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. A coluna sub_type está fixada como 'admin' para garantir que apenas
--    despesas administrativas sejam armazenadas nesta tabela
-- 2. Os valores monetários usam NUMERIC(12, 2) para precisão
-- 3. O trigger updated_at é atualizado automaticamente em cada UPDATE
-- 4. Todos os índices foram criados para otimizar as consultas mais comuns
-- 5. RLS garante que apenas usuários autenticados possam acessar os dados
