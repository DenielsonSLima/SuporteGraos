-- START MIGRATION --
BEGIN;

-- 1. Insert missing subcategories

INSERT INTO public.expense_subcategories (category_id, company_id, name, is_system, active)
VALUES ('00000000-0000-0000-0000-000000000001', '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 'LIQUIDAÇÃO PARCELA SICREDI', false, true)
ON CONFLICT (category_id, name, company_id) DO NOTHING;


INSERT INTO public.expense_subcategories (category_id, company_id, name, is_system, active)
VALUES ('00000000-0000-0000-0000-000000000003', '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 'IOF PJ CHEQUE ESPECIAL', false, true)
ON CONFLICT (category_id, name, company_id) DO NOTHING;


-- 2. Insert admin expenses, financial entries, and financial transactions

-- Item 1331: Tarifas Bancárias - Tarifas - R$ 25.0
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    '741ecf0b-6d12-456f-82f1-5cc7cc77f209', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    (SELECT id FROM public.expense_subcategories WHERE name = 'TARIFAS BANCÁRIAS' AND (company_id IS NULL OR company_id = '5834ff22-a8ce-4c1c-852e-d5522e6f0736') LIMIT 1), 
    'Tarifas', 
    25.0, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'Tarifas', 
    'DESPESAS ADMINISTRATIVAS', 
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
    deductions_amount, discount_amount, remaining_amount
) VALUES (
    '058242f4-bb9d-447c-9b58-9a09f76f99da', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    '741ecf0b-6d12-456f-82f1-5cc7cc77f209', 
    NULL, 
    25.0, 
    25.0, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'Tarifas', 
    0.0, 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    'a5ebcaac-165c-4f62-9d80-58cb60778a4a', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '058242f4-bb9d-447c-9b58-9a09f76f99da', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    25.0, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Tarifas', 
    '{"expenseId": "741ecf0b-6d12-456f-82f1-5cc7cc77f209"}'::jsonb
);


-- Item 1332: Liquidação Parcela SICREDI - Liquidação Parcela SICREDI - R$ 2023.11
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    '7d61ff64-2ed7-420c-b4d6-a985f315fcdc', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    (SELECT id FROM public.expense_subcategories WHERE name = 'LIQUIDAÇÃO PARCELA SICREDI' AND company_id = '5834ff22-a8ce-4c1c-852e-d5522e6f0736' LIMIT 1), 
    'Liquidação Parcela SICREDI', 
    2023.11, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'Liquidação Parcela SICREDI', 
    'DESPESAS FIXAS', 
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
    deductions_amount, discount_amount, remaining_amount
) VALUES (
    'f7aa90b9-3f56-4724-81ad-6aeb26884158', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    '7d61ff64-2ed7-420c-b4d6-a985f315fcdc', 
    NULL, 
    2023.11, 
    2023.11, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'Liquidação Parcela SICREDI', 
    0.0, 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    'b7d18f30-d9d9-498c-93bc-db061e7db5e3', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'f7aa90b9-3f56-4724-81ad-6aeb26884158', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    2023.11, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Liquidação Parcela SICREDI', 
    '{"expenseId": "7d61ff64-2ed7-420c-b4d6-a985f315fcdc"}'::jsonb
);


-- Item 1333: Contabilidade - Contabilidade - R$ 2431.0
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    '43e859fa-4175-4947-bf84-348000c76839', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    (SELECT id FROM public.expense_subcategories WHERE name = 'CONTABILIDADE' AND (company_id IS NULL OR company_id = '5834ff22-a8ce-4c1c-852e-d5522e6f0736') LIMIT 1), 
    'Contabilidade', 
    2431.0, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'Contabilidade', 
    'DESPESAS ADMINISTRATIVAS', 
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
    deductions_amount, discount_amount, remaining_amount
) VALUES (
    'c3f319bf-03b6-4223-b882-457ee434f88c', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    '43e859fa-4175-4947-bf84-348000c76839', 
    NULL, 
    2431.0, 
    2431.0, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'Contabilidade', 
    0.0, 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    'f9d1f535-64bc-4bda-b35a-cc246c456687', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'c3f319bf-03b6-4223-b882-457ee434f88c', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    2431.0, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Contabilidade', 
    '{"expenseId": "43e859fa-4175-4947-bf84-348000c76839"}'::jsonb
);


-- Item 1334: Contabilidade - Contabilidade - R$ 810.0
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    'f4233d6a-1757-4b6b-b1f0-02fb277510a5', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    (SELECT id FROM public.expense_subcategories WHERE name = 'CONTABILIDADE' AND (company_id IS NULL OR company_id = '5834ff22-a8ce-4c1c-852e-d5522e6f0736') LIMIT 1), 
    'Contabilidade', 
    810.0, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'Contabilidade', 
    'DESPESAS ADMINISTRATIVAS', 
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
    deductions_amount, discount_amount, remaining_amount
) VALUES (
    '10dd7163-acbc-4f72-8029-6dcc4e71bc73', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    'f4233d6a-1757-4b6b-b1f0-02fb277510a5', 
    NULL, 
    810.0, 
    810.0, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'Contabilidade', 
    0.0, 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    'b3ba193c-6d5d-4065-afd7-574f902f3b97', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '10dd7163-acbc-4f72-8029-6dcc4e71bc73', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    810.0, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Contabilidade', 
    '{"expenseId": "f4233d6a-1757-4b6b-b1f0-02fb277510a5"}'::jsonb
);


-- Item 1335: Seguro - Seguro Alianz - R$ 1610.7
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    '008ec04f-8563-4543-8201-c774e8f15f32', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    (SELECT id FROM public.expense_subcategories WHERE name = 'SEGURO' AND (company_id IS NULL OR company_id = '5834ff22-a8ce-4c1c-852e-d5522e6f0736') LIMIT 1), 
    'Seguro Alianz', 
    1610.7, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'Seguro Alianz', 
    'DESPESAS FIXAS', 
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
    deductions_amount, discount_amount, remaining_amount
) VALUES (
    '5f6ed339-0b72-4b59-a428-e296e0cbde8f', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    '008ec04f-8563-4543-8201-c774e8f15f32', 
    NULL, 
    1610.7, 
    1610.7, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'Seguro Alianz', 
    0.0, 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    '15536ebe-99a1-4304-99ee-081717305b1a', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '5f6ed339-0b72-4b59-a428-e296e0cbde8f', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    1610.7, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Seguro Alianz', 
    '{"expenseId": "008ec04f-8563-4543-8201-c774e8f15f32"}'::jsonb
);


-- Item 1336: Diversos - Passaro Flomil - R$ 200.0
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    '256949fd-e785-4a57-8170-872caf34edc5', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    (SELECT id FROM public.expense_subcategories WHERE name = 'DIVERSOS' AND (company_id IS NULL OR company_id = '5834ff22-a8ce-4c1c-852e-d5522e6f0736') LIMIT 1), 
    'Passaro Flomil', 
    200.0, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'Passaro Flomil', 
    'DESPESAS VARIÁVEIS', 
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
    deductions_amount, discount_amount, remaining_amount
) VALUES (
    'dc4d1e69-2158-405d-8ebe-6dfee62a9a85', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    '256949fd-e785-4a57-8170-872caf34edc5', 
    NULL, 
    200.0, 
    200.0, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'Passaro Flomil', 
    0.0, 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    '370a03d5-6be8-478b-9d80-c9d9f082e6c7', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'dc4d1e69-2158-405d-8ebe-6dfee62a9a85', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    200.0, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Passaro Flomil', 
    '{"expenseId": "256949fd-e785-4a57-8170-872caf34edc5"}'::jsonb
);


-- Item 1337: Balança - Balança - R$ 700.0
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    '118355d3-087c-44c8-82ab-a9dbb36add80', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    (SELECT id FROM public.expense_subcategories WHERE name = 'BALANÇA' AND (company_id IS NULL OR company_id = '5834ff22-a8ce-4c1c-852e-d5522e6f0736') LIMIT 1), 
    'Balança', 
    700.0, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'Balança', 
    'DESPESAS VARIÁVEIS', 
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
    deductions_amount, discount_amount, remaining_amount
) VALUES (
    'f8f281e5-322d-43bf-8ab7-70d135a504b2', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    '118355d3-087c-44c8-82ab-a9dbb36add80', 
    NULL, 
    700.0, 
    700.0, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'Balança', 
    0.0, 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    '03d99c1e-beca-4051-81e3-bfc1d6cb4a47', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'f8f281e5-322d-43bf-8ab7-70d135a504b2', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    700.0, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Balança', 
    '{"expenseId": "118355d3-087c-44c8-82ab-a9dbb36add80"}'::jsonb
);


-- Item 1338: Diversos - Multa Posto Fiscal - R$ 504.9
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    'b7a087d3-6702-4515-bcc7-7bcb81b13236', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    (SELECT id FROM public.expense_subcategories WHERE name = 'DIVERSOS' AND (company_id IS NULL OR company_id = '5834ff22-a8ce-4c1c-852e-d5522e6f0736') LIMIT 1), 
    'Multa Posto Fiscal', 
    504.9, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'Multa Posto Fiscal', 
    'DESPESAS VARIÁVEIS', 
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
    deductions_amount, discount_amount, remaining_amount
) VALUES (
    '911444bc-0e43-4b93-9cea-106c2d35d7d8', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    'b7a087d3-6702-4515-bcc7-7bcb81b13236', 
    NULL, 
    504.9, 
    504.9, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'Multa Posto Fiscal', 
    0.0, 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    '90576f31-35d4-4d6f-9615-eca5b44771af', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '911444bc-0e43-4b93-9cea-106c2d35d7d8', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    504.9, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Multa Posto Fiscal', 
    '{"expenseId": "b7a087d3-6702-4515-bcc7-7bcb81b13236"}'::jsonb
);


-- Item 1339: DAE - DAE - R$ 1471.22
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    '1881811d-6628-4aed-a452-11a6c7d7f9d5', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    (SELECT id FROM public.expense_subcategories WHERE name = 'DAE' AND (company_id IS NULL OR company_id = '5834ff22-a8ce-4c1c-852e-d5522e6f0736') LIMIT 1), 
    'DAE', 
    1471.22, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'DAE', 
    'DESPESAS VARIÁVEIS', 
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
    deductions_amount, discount_amount, remaining_amount
) VALUES (
    '223567dd-cb51-4018-a106-dff1874db065', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    '1881811d-6628-4aed-a452-11a6c7d7f9d5', 
    NULL, 
    1471.22, 
    1471.22, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'DAE', 
    0.0, 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    'a4329ca5-da44-4558-b9c7-d7acccf6bf82', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '223567dd-cb51-4018-a106-dff1874db065', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    1471.22, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'DAE', 
    '{"expenseId": "1881811d-6628-4aed-a452-11a6c7d7f9d5"}'::jsonb
);


-- Item 1340: IOF PJ CHEQUE ESPECIAL - IOF PJ CHEQUE ESPECIAL - R$ 779.74
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    '0cdc935a-089d-4881-bfa1-25f1e396958c', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    (SELECT id FROM public.expense_subcategories WHERE name = 'IOF PJ CHEQUE ESPECIAL' AND company_id = '5834ff22-a8ce-4c1c-852e-d5522e6f0736' LIMIT 1), 
    'IOF PJ CHEQUE ESPECIAL', 
    779.74, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'IOF PJ CHEQUE ESPECIAL', 
    'DESPESAS ADMINISTRATIVAS', 
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
    deductions_amount, discount_amount, remaining_amount
) VALUES (
    'b8ad1943-ccb0-4826-afcb-2df6e21932a8', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    '0cdc935a-089d-4881-bfa1-25f1e396958c', 
    NULL, 
    779.74, 
    779.74, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'IOF PJ CHEQUE ESPECIAL', 
    0.0, 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    'acc911d5-df38-4f24-9ed4-fb6efee7a8ae', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'b8ad1943-ccb0-4826-afcb-2df6e21932a8', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    779.74, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'IOF PJ CHEQUE ESPECIAL', 
    '{"expenseId": "0cdc935a-089d-4881-bfa1-25f1e396958c"}'::jsonb
);


-- Item 1341: IOF PJ CHEQUE ESPECIAL - IOF PJ CHEQUE ESPECIAL - R$ 93.14
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    'ebc0560b-3dc0-4963-9dd6-4ed7afac79aa', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    (SELECT id FROM public.expense_subcategories WHERE name = 'IOF PJ CHEQUE ESPECIAL' AND company_id = '5834ff22-a8ce-4c1c-852e-d5522e6f0736' LIMIT 1), 
    'IOF PJ CHEQUE ESPECIAL', 
    93.14, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'IOF PJ CHEQUE ESPECIAL', 
    'DESPESAS ADMINISTRATIVAS', 
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
    deductions_amount, discount_amount, remaining_amount
) VALUES (
    '606e1ff4-0aca-4949-beec-f2b66ff8df0a', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    'ebc0560b-3dc0-4963-9dd6-4ed7afac79aa', 
    NULL, 
    93.14, 
    93.14, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'IOF PJ CHEQUE ESPECIAL', 
    0.0, 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    '7070a9a5-ee5e-4c89-9b81-14cb69e236db', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '606e1ff4-0aca-4949-beec-f2b66ff8df0a', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    93.14, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'IOF PJ CHEQUE ESPECIAL', 
    '{"expenseId": "ebc0560b-3dc0-4963-9dd6-4ed7afac79aa"}'::jsonb
);


-- Item 1342: Salário - Johnatha - R$ 3500.0
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    '86da5398-cb75-48cf-a368-35039406226e', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    (SELECT id FROM public.expense_subcategories WHERE name = 'SALÁRIOS' AND (company_id IS NULL OR company_id = '5834ff22-a8ce-4c1c-852e-d5522e6f0736') LIMIT 1), 
    'Johnatha', 
    3500.0, 
    NULL, 
    '2026-06-02', 
    '2026-06-02', 
    '2026-06-02', 
    'paid', 
    'Johnatha', 
    'DESPESAS FIXAS', 
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
    deductions_amount, discount_amount, remaining_amount
) VALUES (
    '6832b69e-5648-48b4-a96f-d107c7450ee2', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    '86da5398-cb75-48cf-a368-35039406226e', 
    NULL, 
    3500.0, 
    3500.0, 
    'paid', 
    '2026-06-02', 
    '2026-06-02', 
    '2026-06-02', 
    'Johnatha', 
    0.0, 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    '1409ca4d-00a0-457c-ab73-13ac3b3934fe', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '6832b69e-5648-48b4-a96f-d107c7450ee2', 
    '9aaf4fa5-0622-4220-a013-b5632d78b51a', 
    'debit', 
    3500.0, 
    '2026-06-02', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Johnatha', 
    '{"expenseId": "86da5398-cb75-48cf-a368-35039406226e"}'::jsonb
);


-- Item 1343: Tarifas Bancárias - Tarifas - R$ 39.6
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    '94ca5790-a6ef-4ccc-a53e-adfabed5264b', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '6ff9f7ad-b836-4ecd-aef6-08768406dae8', 
    (SELECT id FROM public.expense_subcategories WHERE name = 'TARIFAS BANCÁRIAS' AND (company_id IS NULL OR company_id = '5834ff22-a8ce-4c1c-852e-d5522e6f0736') LIMIT 1), 
    'Tarifas', 
    39.6, 
    NULL, 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'paid', 
    'Tarifas', 
    'DESPESAS ADMINISTRATIVAS', 
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
    deductions_amount, discount_amount, remaining_amount
) VALUES (
    '4ef1bae1-827a-49a3-a4ad-72fb6c2777bd', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    '94ca5790-a6ef-4ccc-a53e-adfabed5264b', 
    NULL, 
    39.6, 
    39.6, 
    'paid', 
    '2026-06-01', 
    '2026-06-01', 
    '2026-06-01', 
    'Tarifas', 
    0.0, 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    '7ebd50cd-900b-436d-bced-66c5382894cc', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '4ef1bae1-827a-49a3-a4ad-72fb6c2777bd', 
    '6ff9f7ad-b836-4ecd-aef6-08768406dae8', 
    'debit', 
    39.6, 
    '2026-06-01', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Tarifas', 
    '{"expenseId": "94ca5790-a6ef-4ccc-a53e-adfabed5264b"}'::jsonb
);


-- Item 1344: Salário - Newton Porto - R$ 25000.0
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    'b88c855b-7c5c-4bdb-bc6e-a677eaaae585', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    '6ff9f7ad-b836-4ecd-aef6-08768406dae8', 
    (SELECT id FROM public.expense_subcategories WHERE name = 'SALÁRIOS' AND (company_id IS NULL OR company_id = '5834ff22-a8ce-4c1c-852e-d5522e6f0736') LIMIT 1), 
    'Newton Porto', 
    25000.0, 
    NULL, 
    '2026-06-02', 
    '2026-06-02', 
    '2026-06-02', 
    'paid', 
    'Newton Porto', 
    'DESPESAS FIXAS', 
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
    deductions_amount, discount_amount, remaining_amount
) VALUES (
    'a855a8af-343d-43ef-8e92-08d1d1b97566', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'payable', 
    'standalone_expense', 
    'b88c855b-7c5c-4bdb-bc6e-a677eaaae585', 
    NULL, 
    25000.0, 
    25000.0, 
    'paid', 
    '2026-06-02', 
    '2026-06-02', 
    '2026-06-02', 
    'Newton Porto', 
    0.0, 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    '52a40149-f640-4c90-b61b-03a0830bc40c', 
    '5834ff22-a8ce-4c1c-852e-d5522e6f0736', 
    'a855a8af-343d-43ef-8e92-08d1d1b97566', 
    '6ff9f7ad-b836-4ecd-aef6-08768406dae8', 
    'debit', 
    25000.0, 
    '2026-06-02', 
    'd2b3229f-a324-4a11-829c-4c546897833f', 
    'Newton Porto', 
    '{"expenseId": "b88c855b-7c5c-4bdb-bc6e-a677eaaae585"}'::jsonb
);

ROLLBACK;
-- END MIGRATION --