-- ============================================
-- FIX: CORRIGIR REGISTROS DE EMPRÉSTIMO EXISTENTES
-- ============================================
-- Data: 31/01/2026
-- Descrição: Corrige os registros auxiliares de empréstimo que estão com sub_type errado

-- Corrigir registros de crédito de empréstimo (devem ser 'receipt', não 'admin')
UPDATE public.standalone_records 
SET sub_type = 'receipt'
WHERE description LIKE 'Crédito de Empréstimo:%' 
  OR description LIKE 'Crédito:%';

-- Verificar resultado
SELECT id, description, sub_type, status, paid_value, bank_account
FROM public.standalone_records 
WHERE description LIKE '%Crédito%' OR description LIKE '%Débito%'
ORDER BY issue_date DESC;
