import os
import pandas as pd
import uuid

excel_path = "Banco de Dados Suporte Grãos.xlsx"
if not os.path.exists(excel_path):
    excel_path = "Banco de Dados Suporte Grãos.xlsx"

df = pd.read_excel(excel_path, sheet_name="DespesasMensais")
df['ParsedDate'] = pd.to_datetime(df['Data'], errors='coerce')
june_2026 = df[df['ParsedDate'].dt.to_period('M') == '2026-06'].copy()

# Master Categories
CAT_FIXAS = "00000000-0000-0000-0000-000000000001"
CAT_VARIAVEIS = "00000000-0000-0000-0000-000000000002"
CAT_ADMINISTRATIVAS = "00000000-0000-0000-0000-000000000003"

# Existing Subcategory Mappings (names to IDs from DB query)
existing_subcategories = {
    "TARIFAS BANCÁRIAS": {"id": "e4c29023-e183-4660-984f-df466e4ff918", "category_id": CAT_ADMINISTRATIVAS},
    "CONTABILIDADE": {"id": "c2ec3579-0aab-42cb-92a4-de68bb218494", "category_id": CAT_ADMINISTRATIVAS},
    "SEGURO": {"id": "739c72fb-0d00-4ba0-bbe1-d7bca79bb9a3", "category_id": CAT_FIXAS},
    "DIVERSOS": {"id": "ff1071a2-5d50-41be-a7dc-bb3e5874668e", "category_id": CAT_VARIAVEIS},
    "BALANÇA": {"id": "db7c058d-2797-40cd-9eda-49dd87490ee5", "category_id": CAT_VARIAVEIS},
    "DAE": {"id": "0cad687d-b305-4514-9229-f71526d4af44", "category_id": CAT_VARIAVEIS},
    "SALÁRIOS": {"id": "c3ad2e74-0290-4b1c-86d2-fb74f0b4e961", "category_id": CAT_FIXAS}
}

# Accounts
accounts = {
    "S.Grão - Sicredi": "9aaf4fa5-0622-4220-a013-b5632d78b51a", # Maps to "Sicredi"
    "Anhanguera": "6ff9f7ad-b836-4ecd-aef6-08768406dae8"
}

company_id = "5834ff22-a8ce-4c1c-852e-d5522e6f0736"
user_id = "d2b3229f-a324-4a11-829c-4c546897833f"

sql_lines = []
sql_lines.append("-- START MIGRATION --")
sql_lines.append("BEGIN;")
sql_lines.append("")

# Step 1: Subcategories inserts (with ON CONFLICT)
new_subcategories = {
    "LIQUIDAÇÃO PARCELA SICREDI": {"category_id": CAT_FIXAS},
    "IOF PJ CHEQUE ESPECIAL": {"category_id": CAT_ADMINISTRATIVAS}
}

sql_lines.append("-- 1. Insert missing subcategories")
for name, info in new_subcategories.items():
    sql_lines.append(f"""
INSERT INTO public.expense_subcategories (category_id, company_id, name, is_system, active)
VALUES ('{info['category_id']}', '{company_id}', '{name}', false, true)
ON CONFLICT (category_id, name, company_id) DO NOTHING;
""")

sql_lines.append("")

# Helper to map a row to category name and category_id
def map_row_to_subcategory(tipo):
    t_upper = tipo.upper().strip()
    if t_upper == "SALÁRIO":
        return "SALÁRIOS"
    if t_upper in existing_subcategories:
        return t_upper
    if t_upper in new_subcategories:
        return t_upper
    # Check close matches
    for k in existing_subcategories.keys():
        if k in t_upper or t_upper in k:
            return k
    return t_upper

sql_lines.append("-- 2. Insert admin expenses, financial entries, and financial transactions")

# To keep track of the subcategory IDs after dynamic insertions
for idx, row in june_2026.iterrows():
    # Resolve subcategory name
    subcat_name = map_row_to_subcategory(row['Tipo'])
    
    # Resolve category info
    if subcat_name in existing_subcategories:
        cat_id = existing_subcategories[subcat_name]['category_id']
        # Query for subcategory ID using a SELECT in SQL
        subcat_id_sql = f"(SELECT id FROM public.expense_subcategories WHERE name = '{subcat_name}' AND (company_id IS NULL OR company_id = '{company_id}') LIMIT 1)"
    else:
        # It's a new subcategory
        cat_id = new_subcategories[subcat_name]['category_id']
        subcat_id_sql = f"(SELECT id FROM public.expense_subcategories WHERE name = '{subcat_name}' AND company_id = '{company_id}' LIMIT 1)"
    
    # Resolve category type label (FIXA, VARIAVEL, ADMINISTRATIVA)
    if cat_id == CAT_FIXAS:
        category_label = "DESPESAS FIXAS"
        sub_type = "fixed"
    elif cat_id == CAT_VARIAVEIS:
        category_label = "DESPESAS VARIÁVEIS"
        sub_type = "variable"
    else:
        category_label = "DESPESAS ADMINISTRATIVAS"
        sub_type = "administrative"

    # Resolve account UUID
    acc_name_excel = row['Contas']
    acc_id = accounts.get(acc_name_excel, None)
    if not acc_id:
        # Default or warning
        print(f"Warning: Account '{acc_name_excel}' not mapped.")
        continue
    
    # Generate UUIDs for inserts so we can link them
    exp_id = str(uuid.uuid4())
    ent_id = str(uuid.uuid4())
    tx_id = str(uuid.uuid4())
    
    desc = str(row['Descrição'])
    notes = str(row['Anotações']) if pd.notna(row['Anotações']) else ""
    # Append the excel ID as legacy reference in notes
    notes_with_ref = f"[REF:{row['id']}]"
    if notes:
        notes_with_ref += f" - {notes}"
        
    val = float(row['Valor'])
    date_str = row['Data'].strftime('%Y-%m-%d')
    
    sql_lines.append(f"""
-- Item {idx}: {row['Tipo']} - {desc} - R$ {val}
-- 2.1 admin_expenses
INSERT INTO public.admin_expenses (
    id, company_id, account_id, category_id, description, amount, payee_name, 
    expense_date, due_date, paid_date, status, entity_name, category, 
    original_value, paid_value, discount_value, sub_type, bank_account, notes
) VALUES (
    '{exp_id}', 
    '{company_id}', 
    '{acc_id}', 
    {subcat_id_sql}, 
    '{desc}', 
    {val}, 
    NULL, 
    '{date_str}', 
    '{date_str}', 
    '{date_str}', 
    'paid', 
    '{desc}', 
    '{category_label}', 
    {val}, 
    {val}, 
    0.0, 
    'expense', 
    '{acc_name_excel}', 
    '{notes_with_ref}'
);

-- 2.2 financial_entries
INSERT INTO public.financial_entries (
    id, company_id, type, origin_type, origin_id, partner_id, total_amount, 
    paid_amount, status, created_date, due_date, paid_date, description, 
    deductions_amount, discount_amount, remaining_amount
) VALUES (
    '{ent_id}', 
    '{company_id}', 
    'payable', 
    'standalone_expense', 
    '{exp_id}', 
    NULL, 
    {val}, 
    {val}, 
    'paid', 
    '{date_str}', 
    '{date_str}', 
    '{date_str}', 
    '{desc}', 
    0.0, 
    0.0, 
    0.0
);

-- 2.3 financial_transactions
INSERT INTO public.financial_transactions (
    id, company_id, entry_id, account_id, type, amount, transaction_date, 
    created_by, description, metadata
) VALUES (
    '{tx_id}', 
    '{company_id}', 
    '{ent_id}', 
    '{acc_id}', 
    'debit', 
    {val}, 
    '{date_str}', 
    '{user_id}', 
    '{desc}', 
    '{{"expenseId": "{exp_id}"}}'::jsonb
);
""")

sql_lines.append("COMMIT;")
sql_lines.append("-- END MIGRATION --")

sql_content = "\n".join(sql_lines)
with open("scratch/insert_expenses.sql", "w", encoding="utf-8") as f:
    f.write(sql_content)

print(f"Generated SQL written to scratch/insert_expenses.sql")
print(f"Total SQL lines: {len(sql_lines)}")
