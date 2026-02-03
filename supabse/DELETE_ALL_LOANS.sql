-- ============================================
-- DELETE: REMOVER TODOS OS EMPRÉSTIMOS
-- ============================================
-- Data: 31/01/2026
-- Descrição: Remove todos os registros de empréstimos (loan_taken, loan_granted, receipt, admin relacionados)

-- Deletar registros de empréstimos e seus auxiliares
DELETE FROM public.standalone_records 
WHERE sub_type IN ('loan_taken', 'loan_granted')
   OR (sub_type = 'receipt' AND description LIKE 'Crédito:%')
   OR (sub_type = 'admin' AND description LIKE 'Débito:%');

-- Verificar quantos registros restam
SELECT COUNT(*) as total_registros, sub_type 
FROM public.standalone_records 
GROUP BY sub_type
ORDER BY sub_type;
