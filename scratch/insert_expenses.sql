-- START MIGRATION --
BEGIN;

-- 1. Insert missing subcategories

INSERT INTO public.expense_subcategories (category_id, company_id, name, is_system, active)
VALUES ('00000000-0000-0000-0000-000000000001', '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 'LIQUIDAÇÃO PARCELA SICREDI', false, true)
ON CONFLICT (category_id, name, company_id) WHERE (company_id IS NOT NULL) DO NOTHING;


INSERT INTO public.expense_subcategories (category_id, company_id, name, is_system, active)
VALUES ('00000000-0000-0000-0000-000000000003', '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 'IOF PJ CHEQUE ESPECIAL', false, true)
ON CONFLICT (category_id, name, company_id) WHERE (company_id IS NOT NULL) DO NOTHING;


-- 2. Insert admin expenses, financial entries, and financial transactions

-- Item 1331: Tarifas Bancárias - Tarifas - R$ 25.0
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    'f0cd3fbd-29bc-41b9-bd51-02f940b6cf20', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    '00000000-0000-0000-0000-000000000003', 
    'Tarifas', 
    25.0, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'Tarifas', 
    'TARIFAS BANCÁRIAS', 
    25.0, 
    25.0, 
    0.0, 
    'expense', 
    'S.Grão - Sicredi', 
    '[REF:f54ba954]'
);

-- 2.2 financial_entries
INSERT INTO public.financial_entries (
    id, company_id, type, origin_type, origin_id, partner_id, total_amount, 
    paid_amount, status, created_date, due_date, paid_date, description, 
    deductions_amount, discount_amount
) VALUES (
    'c470f3c3-9e8c-4a6c-ad07-5ea14a4966d5', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    'f0cd3fbd-29bc-41b9-bd51-02f940b6cf20', 
    NULL, 
    25.0, 
    25.0, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'Tarifas', 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    '89444eb1-92cf-4b82-b772-6217035fd242', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'c470f3c3-9e8c-4a6c-ad07-5ea14a4966d5', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    25.0, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Tarifas', 
    '{"expenseId": "f0cd3fbd-29bc-41b9-bd51-02f940b6cf20"}'::jsonb
);


-- Item 1332: Liquidação Parcela SICREDI - Liquidação Parcela SICREDI - R$ 2023.11
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    'c34321db-d899-4da1-8976-b73396f11b24', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    '00000000-0000-0000-0000-000000000001', 
    'Liquidação Parcela SICREDI', 
    2023.11, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'Liquidação Parcela SICREDI', 
    'LIQUIDAÇÃO PARCELA SICREDI', 
    2023.11, 
    2023.11, 
    0.0, 
    'expense', 
    'S.Grão - Sicredi', 
    '[REF:bd2d1de0]'
);

-- 2.2 financial_entries
INSERT INTO public.financial_entries (
    id, company_id, type, origin_type, origin_id, partner_id, total_amount, 
    paid_amount, status, created_date, due_date, paid_date, description, 
    deductions_amount, discount_amount
) VALUES (
    '5878bb5c-e88f-443e-ae65-b0f1447f1a2b', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    'c34321db-d899-4da1-8976-b73396f11b24', 
    NULL, 
    2023.11, 
    2023.11, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'Liquidação Parcela SICREDI', 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    '7a4a8f78-8759-4828-9b90-161ecff8d899', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '5878bb5c-e88f-443e-ae65-b0f1447f1a2b', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    2023.11, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Liquidação Parcela SICREDI', 
    '{"expenseId": "c34321db-d899-4da1-8976-b73396f11b24"}'::jsonb
);


-- Item 1333: Contabilidade - Contabilidade - R$ 2431.0
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    '3ff670e4-70a2-42e7-b06c-dab26ceab6a7', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    '00000000-0000-0000-0000-000000000003', 
    'Contabilidade', 
    2431.0, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'Contabilidade', 
    'CONTABILIDADE', 
    2431.0, 
    2431.0, 
    0.0, 
    'expense', 
    'S.Grão - Sicredi', 
    '[REF:c0a3f077]'
);

-- 2.2 financial_entries
INSERT INTO public.financial_entries (
    id, company_id, type, origin_type, origin_id, partner_id, total_amount, 
    paid_amount, status, created_date, due_date, paid_date, description, 
    deductions_amount, discount_amount
) VALUES (
    '6d1424aa-0f41-49e3-bf55-abdd0592b522', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    '3ff670e4-70a2-42e7-b06c-dab26ceab6a7', 
    NULL, 
    2431.0, 
    2431.0, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'Contabilidade', 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    '5bd8fbf4-8105-4ac6-a5af-49db69814209', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '6d1424aa-0f41-49e3-bf55-abdd0592b522', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    2431.0, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Contabilidade', 
    '{"expenseId": "3ff670e4-70a2-42e7-b06c-dab26ceab6a7"}'::jsonb
);


-- Item 1334: Contabilidade - Contabilidade - R$ 810.0
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    '51969912-e9b4-40e6-80bb-e56517030931', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    '00000000-0000-0000-0000-000000000003', 
    'Contabilidade', 
    810.0, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'Contabilidade', 
    'CONTABILIDADE', 
    810.0, 
    810.0, 
    0.0, 
    'expense', 
    'S.Grão - Sicredi', 
    '[REF:a89f8280]'
);

-- 2.2 financial_entries
INSERT INTO public.financial_entries (
    id, company_id, type, origin_type, origin_id, partner_id, total_amount, 
    paid_amount, status, created_date, due_date, paid_date, description, 
    deductions_amount, discount_amount
) VALUES (
    '428a4b90-3b91-4d7c-b45c-9730af09f34f', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    '51969912-e9b4-40e6-80bb-e56517030931', 
    NULL, 
    810.0, 
    810.0, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'Contabilidade', 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    'e97e494d-fd55-40ad-9aa1-5cd2183bd052', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '428a4b90-3b91-4d7c-b45c-9730af09f34f', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    810.0, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Contabilidade', 
    '{"expenseId": "51969912-e9b4-40e6-80bb-e56517030931"}'::jsonb
);


-- Item 1335: Seguro - Seguro Alianz - R$ 1610.7
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    '16bca05e-6be2-4733-8ae4-b2ac5431175b', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    '00000000-0000-0000-0000-000000000001', 
    'Seguro Alianz', 
    1610.7, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'Seguro Alianz', 
    'SEGURO', 
    1610.7, 
    1610.7, 
    0.0, 
    'expense', 
    'S.Grão - Sicredi', 
    '[REF:a2205014]'
);

-- 2.2 financial_entries
INSERT INTO public.financial_entries (
    id, company_id, type, origin_type, origin_id, partner_id, total_amount, 
    paid_amount, status, created_date, due_date, paid_date, description, 
    deductions_amount, discount_amount
) VALUES (
    'af344a50-a1d8-4adc-a691-8e82506e644b', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    '16bca05e-6be2-4733-8ae4-b2ac5431175b', 
    NULL, 
    1610.7, 
    1610.7, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'Seguro Alianz', 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    '68d3b5bd-ad84-464b-9537-991ce5bd9878', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'af344a50-a1d8-4adc-a691-8e82506e644b', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    1610.7, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Seguro Alianz', 
    '{"expenseId": "16bca05e-6be2-4733-8ae4-b2ac5431175b"}'::jsonb
);


-- Item 1336: Diversos - Passaro Flomil - R$ 200.0
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    '381079f4-2256-4e7f-b892-4bae7f77f5e4', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    '00000000-0000-0000-0000-000000000002', 
    'Passaro Flomil', 
    200.0, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'Passaro Flomil', 
    'DIVERSOS', 
    200.0, 
    200.0, 
    0.0, 
    'expense', 
    'S.Grão - Sicredi', 
    '[REF:be4a4859]'
);

-- 2.2 financial_entries
INSERT INTO public.financial_entries (
    id, company_id, type, origin_type, origin_id, partner_id, total_amount, 
    paid_amount, status, created_date, due_date, paid_date, description, 
    deductions_amount, discount_amount
) VALUES (
    'd5b2bdfd-01e8-410e-a037-b412ae93bd75', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    '381079f4-2256-4e7f-b892-4bae7f77f5e4', 
    NULL, 
    200.0, 
    200.0, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'Passaro Flomil', 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    '91d149fe-1839-4bee-9237-92c8327bf4fd', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'd5b2bdfd-01e8-410e-a037-b412ae93bd75', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    200.0, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Passaro Flomil', 
    '{"expenseId": "381079f4-2256-4e7f-b892-4bae7f77f5e4"}'::jsonb
);


-- Item 1337: Balança - Balança - R$ 700.0
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    '86d39f5d-9493-49cc-be36-c7e0680aa37a', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    '00000000-0000-0000-0000-000000000002', 
    'Balança', 
    700.0, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'Balança', 
    'BALANÇA', 
    700.0, 
    700.0, 
    0.0, 
    'expense', 
    'S.Grão - Sicredi', 
    '[REF:5e0c0d5c] - TREVO'
);

-- 2.2 financial_entries
INSERT INTO public.financial_entries (
    id, company_id, type, origin_type, origin_id, partner_id, total_amount, 
    paid_amount, status, created_date, due_date, paid_date, description, 
    deductions_amount, discount_amount
) VALUES (
    '97d4ff8b-4f26-4c01-a25c-501e63187458', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    '86d39f5d-9493-49cc-be36-c7e0680aa37a', 
    NULL, 
    700.0, 
    700.0, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'Balança', 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    '8f7ce046-a563-4303-af70-f60ceca57f21', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '97d4ff8b-4f26-4c01-a25c-501e63187458', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    700.0, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Balança', 
    '{"expenseId": "86d39f5d-9493-49cc-be36-c7e0680aa37a"}'::jsonb
);


-- Item 1338: Diversos - Multa Posto Fiscal - R$ 504.9
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    'ebea053d-15ff-4fe3-84fa-3a77204a4116', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    '00000000-0000-0000-0000-000000000002', 
    'Multa Posto Fiscal', 
    504.9, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'Multa Posto Fiscal', 
    'DIVERSOS', 
    504.9, 
    504.9, 
    0.0, 
    'expense', 
    'S.Grão - Sicredi', 
    '[REF:cd89a45e]'
);

-- 2.2 financial_entries
INSERT INTO public.financial_entries (
    id, company_id, type, origin_type, origin_id, partner_id, total_amount, 
    paid_amount, status, created_date, due_date, paid_date, description, 
    deductions_amount, discount_amount
) VALUES (
    '1bac6c07-cbc6-4538-b123-e4d953bd6500', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    'ebea053d-15ff-4fe3-84fa-3a77204a4116', 
    NULL, 
    504.9, 
    504.9, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'Multa Posto Fiscal', 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    '6f587bff-6295-486c-a29a-3f1ff04456eb', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '1bac6c07-cbc6-4538-b123-e4d953bd6500', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    504.9, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Multa Posto Fiscal', 
    '{"expenseId": "ebea053d-15ff-4fe3-84fa-3a77204a4116"}'::jsonb
);


-- Item 1339: DAE - DAE - R$ 1471.22
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    '7abb13a1-2f0b-4cd8-acc7-7054e9be68e7', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    '00000000-0000-0000-0000-000000000002', 
    'DAE', 
    1471.22, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'DAE', 
    'DAE', 
    1471.22, 
    1471.22, 
    0.0, 
    'expense', 
    'S.Grão - Sicredi', 
    '[REF:6ca0965c]'
);

-- 2.2 financial_entries
INSERT INTO public.financial_entries (
    id, company_id, type, origin_type, origin_id, partner_id, total_amount, 
    paid_amount, status, created_date, due_date, paid_date, description, 
    deductions_amount, discount_amount
) VALUES (
    '0b038080-0e1c-4af4-ab82-e78950727d8b', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    '7abb13a1-2f0b-4cd8-acc7-7054e9be68e7', 
    NULL, 
    1471.22, 
    1471.22, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'DAE', 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    'b439a596-fce0-48e9-92cf-41884a2cdb4b', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '0b038080-0e1c-4af4-ab82-e78950727d8b', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    1471.22, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'DAE', 
    '{"expenseId": "7abb13a1-2f0b-4cd8-acc7-7054e9be68e7"}'::jsonb
);


-- Item 1340: IOF PJ CHEQUE ESPECIAL - IOF PJ CHEQUE ESPECIAL - R$ 779.74
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    'de7c5b93-d33f-478b-b443-921e8f6eeed4', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    '00000000-0000-0000-0000-000000000003', 
    'IOF PJ CHEQUE ESPECIAL', 
    779.74, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'IOF PJ CHEQUE ESPECIAL', 
    'IOF PJ CHEQUE ESPECIAL', 
    779.74, 
    779.74, 
    0.0, 
    'expense', 
    'S.Grão - Sicredi', 
    '[REF:6c550baa]'
);

-- 2.2 financial_entries
INSERT INTO public.financial_entries (
    id, company_id, type, origin_type, origin_id, partner_id, total_amount, 
    paid_amount, status, created_date, due_date, paid_date, description, 
    deductions_amount, discount_amount
) VALUES (
    '51dc9cd2-08f9-4016-b57d-83dd37a76786', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    'de7c5b93-d33f-478b-b443-921e8f6eeed4', 
    NULL, 
    779.74, 
    779.74, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'IOF PJ CHEQUE ESPECIAL', 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    '5ba32a93-f6a9-4486-b284-929de947e4df', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '51dc9cd2-08f9-4016-b57d-83dd37a76786', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    779.74, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'IOF PJ CHEQUE ESPECIAL', 
    '{"expenseId": "de7c5b93-d33f-478b-b443-921e8f6eeed4"}'::jsonb
);


-- Item 1341: IOF PJ CHEQUE ESPECIAL - IOF PJ CHEQUE ESPECIAL - R$ 93.14
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    'bd0351a5-d383-432a-a489-aa73f5e6bc83', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    '00000000-0000-0000-0000-000000000003', 
    'IOF PJ CHEQUE ESPECIAL', 
    93.14, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'IOF PJ CHEQUE ESPECIAL', 
    'IOF PJ CHEQUE ESPECIAL', 
    93.14, 
    93.14, 
    0.0, 
    'expense', 
    'S.Grão - Sicredi', 
    '[REF:76ae93c0]'
);

-- 2.2 financial_entries
INSERT INTO public.financial_entries (
    id, company_id, type, origin_type, origin_id, partner_id, total_amount, 
    paid_amount, status, created_date, due_date, paid_date, description, 
    deductions_amount, discount_amount
) VALUES (
    'e4bd8490-83cb-4395-9e82-12ee773d5138', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    'bd0351a5-d383-432a-a489-aa73f5e6bc83', 
    NULL, 
    93.14, 
    93.14, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'IOF PJ CHEQUE ESPECIAL', 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    'c760325f-f7ca-44df-97c9-a335798d74f9', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'e4bd8490-83cb-4395-9e82-12ee773d5138', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    93.14, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'IOF PJ CHEQUE ESPECIAL', 
    '{"expenseId": "bd0351a5-d383-432a-a489-aa73f5e6bc83"}'::jsonb
);


-- Item 1342: Salário - Johnatha - R$ 3500.0
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    'a70c58fc-a82f-4e79-8c1c-8223c30c990d', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    '00000000-0000-0000-0000-000000000001', 
    'Johnatha', 
    3500.0, 
    NULL, 
    '2026-06-02', 
    '2026-06-02', 
    '2026-06-02', 
    'paid', 
    'Johnatha', 
    'SALÁRIOS', 
    3500.0, 
    3500.0, 
    0.0, 
    'expense', 
    'S.Grão - Sicredi', 
    '[REF:768d5825]'
);

-- 2.2 financial_entries
INSERT INTO public.financial_entries (
    id, company_id, type, origin_type, origin_id, partner_id, total_amount, 
    paid_amount, status, created_date, due_date, paid_date, description, 
    deductions_amount, discount_amount
) VALUES (
    'c75e80fd-933b-42ea-92fb-7029ea3cf84e', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    'a70c58fc-a82f-4e79-8c1c-8223c30c990d', 
    NULL, 
    3500.0, 
    3500.0, 
    'paid', 
    '2026-06-02', 
    '2026-06-02', 
    '2026-06-02', 
    'Johnatha', 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    '7223c94d-f59c-49f5-9d29-97b6aeeedcb3', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'c75e80fd-933b-42ea-92fb-7029ea3cf84e', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    3500.0, 
    '2026-06-02', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Johnatha', 
    '{"expenseId": "a70c58fc-a82f-4e79-8c1c-8223c30c990d"}'::jsonb
);


-- Item 1343: Tarifas Bancárias - Tarifas - R$ 39.6
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    'e552ca8e-962a-4462-827d-ac151919380c', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '6ff9f7ad-b836-4ecd-aef6-08768406dae8', 
    '00000000-0000-0000-0000-000000000003', 
    'Tarifas', 
    39.6, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'Tarifas', 
    'TARIFAS BANCÁRIAS', 
    39.6, 
    39.6, 
    0.0, 
    'expense', 
    'Anhanguera', 
    '[REF:d5208d42]'
);

-- 2.2 financial_entries
INSERT INTO public.financial_entries (
    id, company_id, type, origin_type, origin_id, partner_id, total_amount, 
    paid_amount, status, created_date, due_date, paid_date, description, 
    deductions_amount, discount_amount
) VALUES (
    'e53a5001-219a-4448-a2c2-82cb6f623bb0', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    'e552ca8e-962a-4462-827d-ac151919380c', 
    NULL, 
    39.6, 
    39.6, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'Tarifas', 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    '12a24a08-57c3-439d-926d-bc19105cbe83', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'e53a5001-219a-4448-a2c2-82cb6f623bb0', 
    '6ff9f7ad-b836-4ecd-aef6-08768406dae8', 
    'debit', 
    39.6, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Tarifas', 
    '{"expenseId": "e552ca8e-962a-4462-827d-ac151919380c"}'::jsonb
);


-- Item 1344: Salário - Newton Porto - R$ 25000.0
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    'bd1b85a8-3953-4928-a600-7aba026f2875', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '6ff9f7ad-b836-4ecd-aef6-08768406dae8', 
    '00000000-0000-0000-0000-000000000001', 
    'Newton Porto', 
    25000.0, 
    NULL, 
    '2026-06-02', 
    '2026-06-02', 
    '2026-06-02', 
    'paid', 
    'Newton Porto', 
    'SALÁRIOS', 
    25000.0, 
    25000.0, 
    0.0, 
    'expense', 
    'Anhanguera', 
    '[REF:644a7d94]'
);

-- 2.2 financial_entries
INSERT INTO public.financial_entries (
    id, company_id, type, origin_type, origin_id, partner_id, total_amount, 
    paid_amount, status, created_date, due_date, paid_date, description, 
    deductions_amount, discount_amount
) VALUES (
    '0e8232ae-77d1-4073-b9b2-553d097a0597', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    'bd1b85a8-3953-4928-a600-7aba026f2875', 
    NULL, 
    25000.0, 
    25000.0, 
    'paid', 
    '2026-06-02', 
    '2026-06-02', 
    '2026-06-02', 
    'Newton Porto', 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    '39659412-0127-407b-9f8d-28f7ce5c5fa2', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '0e8232ae-77d1-4073-b9b2-553d097a0597', 
    '6ff9f7ad-b836-4ecd-aef6-08768406dae8', 
    'debit', 
    25000.0, 
    '2026-06-02', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Newton Porto', 
    '{"expenseId": "bd1b85a8-3953-4928-a600-7aba026f2875"}'::jsonb
);

COMMIT;
-- END MIGRATION --