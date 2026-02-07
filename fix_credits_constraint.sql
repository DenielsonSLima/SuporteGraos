-- Remover constraint antiga
ALTER TABLE standalone_records DROP CONSTRAINT IF EXISTS standalone_records_sub_type_check;

-- Criar constraint nova com credit_income e investment
ALTER TABLE standalone_records 
ADD CONSTRAINT standalone_records_sub_type_check 
CHECK (sub_type IN (
  'purchase_order', 
  'freight', 
  'commission', 
  'sales_order', 
  'loan_taken', 
  'loan_granted', 
  'admin', 
  'shareholder', 
  'receipt',
  'credit_income',
  'investment'
));
