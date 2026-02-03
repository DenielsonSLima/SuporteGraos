-- ============================================
-- FIX: REMOVER CONSTRAINT DE SUB_TYPE COMPLETAMENTE
-- ============================================
-- Data: 31/01/2026
-- Solução: Remove a constraint problemática e deixa sub_type livre

-- Passo 1: Listar todas as constraints da tabela (para debug)
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.standalone_records'::regclass;

-- Passo 2: Forçar remoção de TODAS as constraints de sub_type
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.standalone_records'::regclass 
        AND conname LIKE '%sub_type%'
    LOOP
        EXECUTE 'ALTER TABLE public.standalone_records DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Constraint removida: %', constraint_name;
    END LOOP;
END $$;

-- Passo 3: Alterar coluna para remover qualquer CHECK embutido
ALTER TABLE public.standalone_records 
ALTER COLUMN sub_type DROP DEFAULT,
ALTER COLUMN sub_type TYPE TEXT;

-- Passo 4: Definir novo default
ALTER TABLE public.standalone_records 
ALTER COLUMN sub_type SET DEFAULT 'admin';

-- Passo 5: Criar nova constraint SEM NOME ESPECÍFICO (Postgres gera automaticamente)
ALTER TABLE public.standalone_records 
ADD CHECK (sub_type IN ('admin', 'loan_taken', 'loan_granted', 'commission', 'shareholder', 'receipt', 'purchase_order', 'sales_order'));

-- Verificação final
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.standalone_records'::regclass 
AND conname LIKE '%sub_type%';
