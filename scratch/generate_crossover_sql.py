import pandas as pd
import uuid
import numpy as np

file_path = "Banco de Dados Suporte Gra\u0303os.xlsx"

# Load sheets
df_loadings = pd.read_excel(file_path, sheet_name="CarrinhoFretes")
df_receipts = pd.read_excel(file_path, sheet_name="RecebimentoVenda")
df_payments = pd.read_excel(file_path, sheet_name="PagProdutor")

# Convert dates
df_loadings['data'] = pd.to_datetime(df_loadings['data'], errors='coerce')
df_receipts['Data'] = pd.to_datetime(df_receipts['Data'], errors='coerce')
df_payments['Data'] = pd.to_datetime(df_payments['Data'], errors='coerce')

# Normalize Order IDs
df_loadings['PedidodeVenda'] = df_loadings['PedidodeVenda'].astype(str).str.strip()
df_loadings['PedidodeCompra'] = df_loadings['PedidodeCompra'].astype(str).str.strip().str.replace('.0', '', regex=False)
df_receipts['PedidoVenda'] = df_receipts['PedidoVenda'].astype(str).str.strip()
df_payments['PedidodeCompra'] = df_payments['PedidodeCompra'].astype(str).str.strip().str.replace('.0', '', regex=False)

cut_date = pd.Timestamp('2026-02-01')
company_id = '5834ff22-a8ce-4c1c-852e-d5522e6f0736'
user_id = '53b13148-4b43-411d-8de1-3f82e78ca5af'
impl_account_id = '58691baa-0b99-4fea-b5dc-b0cddd717e14'

# Order Maps
sales_order_map = {
    'P0525NEW93100': ('4b8fca0e-98ad-40ac-8c46-ecc77f0cb4fd', '00000000-0000-0000-0000-0000e9137834'),
    'P0625NEW79120': ('d5f0007e-4051-425b-b696-071cfae675e1', '00000000-0000-0000-0000-000002b5268f'),
    'P0725NEW76128': ('4bececfb-c6a5-4ce3-808c-7c841fe6e9c6', '00000000-0000-0000-0000-0000a7deea90'),
    'P0925RON82143': ('eb6a2fe2-2a3d-4e58-b876-657470427ba7', '00000000-0000-0000-0000-0000c73ad46d'),
    'P1125RON76167': ('f4376ca2-fc51-4563-9002-ff503887a7ed', '00000000-0000-0000-0000-000008a64294'),
    'P0126NEW82192': ('d47e05d4-75af-4b19-95a5-9dd3896b1ed6', '00000000-0000-0000-0000-0000f4e20795'),
    'P0126NEW76193': ('4888bfcf-440f-40d1-8d5f-47493ca20fbf', '00000000-0000-0000-0000-0000944d5d55'),
    'P0126NEW84195': ('69271958-e743-451d-9da2-9f11f4381455', '00000000-0000-0000-0000-0000dfbabd43'),
    'P0126RON81198': ('98daffee-f0ee-4431-8d7d-8b28a7c546ac', '00000000-0000-0000-0000-000047347f69'),
    'P0126NEW80200': ('bb22cc7e-8b41-42c7-bba4-40c78388d6d6', '00000000-0000-0000-0000-000049ffed64'),
    'P0126NEW83201': ('9ae94385-6180-4e81-b265-70529d24c06d', '00000000-0000-0000-0000-0000893d3f09'),
    'P0126NEW77202': ('79984319-173c-4563-9963-2bf720746476', '00000000-0000-0000-0000-0000d1f3bb2b'),
    'P0126NEW77203': ('c25cd85b-aa02-43c0-95ba-1407152592b5', '00000000-0000-0000-0000-0000036d0a92'),
    'P0126RON80205': ('64cb79e8-ad00-47df-a813-8e7a2a167511', '00000000-0000-0000-0000-0000273aec78'),
    'P0126NEW82207': ('ea839398-e79d-45b0-ab57-546de969cfe0', '00000000-0000-0000-0000-00005b858b24')
}

purchase_order_map = {
    '19122515132': ('1eb8843b-c287-47d0-86aa-8d5a95b650f9', '00000000-0000-0000-0000-0000ede309b6'),
    '2901261747': ('96e7fcfe-f2ad-4640-a60c-182a7f4fe5d9', '00000000-0000-0000-0000-000018eb47f8')
}

accounts_map = {
    'S.Grão - Sicredi': '9aaf4fa5-0622-4220-a013-b5632d78b51a',
    'Santiagro': 'b0c57b8d-1be5-4bec-b3ef-e156ac715211',
    'Terceiros': '8c05c237-2ae4-4090-bf4b-ec3da1102cf9',
    'S.Grão - Banco C6': 'f035dccb-66a3-4bb3-9e07-91f5f7f96acb',
    'S.Grão - Bradesco': '8ddee587-141f-418e-9175-a2ad3838061d',
    'Anhanguera': '6ff9f7ad-b836-4ecd-aef6-08768406dae8',
    'N.Nordeste - B.Brasil': '7ed91e96-f31e-453c-b981-53f7d1eb1fc8',
    'Branco - B.Brasil': 'f179d130-a10f-4b39-abe0-19b0bf8684d4',
    'Wendoly Masley': '2072e05f-598c-404e-925e-1485dcd66da9',
    'Implantação': '58691baa-0b99-4fea-b5dc-b0cddd717e14'
}

sql_loadings = []
sql_loadings.append("BEGIN;")
sql_loadings.append(f"SELECT set_config('request.jwt.claims', '{{\"sub\": \"{user_id}\"}}', true);")

for order_id, (db_id, legacy_id) in sales_order_map.items():
    order_loads = df_loadings[df_loadings['PedidodeVenda'] == order_id]
    pre_loads = order_loads[order_loads['data'] < cut_date]
    post_loads = order_loads[order_loads['data'] >= cut_date]
    
    if not pre_loads.empty:
        total_sc = pre_loads['Quantidade Sc'].sum()
        total_val = pre_loads['Valor Total de Venda'].sum()
        total_kg = total_sc * 60
        load_uuid = str(uuid.uuid4())
        sql_loadings.append(f"INSERT INTO public.ops_loadings (id, company_id, legacy_id, loading_date, sales_order_id, weight_kg, unload_weight_kg, total_sales_value, status, vehicle_plate, driver_name, created_at, updated_at) VALUES ('{load_uuid}', '{company_id}', '{str(uuid.uuid4())}', '2026-01-31', '{db_id}', {total_kg}, {total_kg}, {total_val}, 'delivered', 'CVA', 'Crossover Virtual Adjustment', now(), now());")

    if not post_loads.empty:
        for idx, row in post_loads.iterrows():
            load_uuid = str(uuid.uuid4())
            ldate = row['data'].strftime('%Y-%m-%d')
            qty_kg = float(row['Quantidade Kg']) if not pd.isna(row['Quantidade Kg']) else 0.0
            unl_kg = float(row['Peso Descarrego']) if not pd.isna(row['Peso Descarrego']) else qty_kg
            if unl_kg <= 0:
                unl_kg = qty_kg
            val_sales = float(row['Valor Total de Venda']) if not pd.isna(row['Valor Total de Venda']) else 0.0
            plate = str(row['Transportadora']) if not pd.isna(row['Transportadora']) else 'AUTONOMO'
            driver = str(row['Motorista']) if not pd.isna(row['Motorista']) else 'N/I'
            plate = plate.replace("'", "''")
            driver = driver.replace("'", "''")
            sql_loadings.append(f"INSERT INTO public.ops_loadings (id, company_id, legacy_id, loading_date, sales_order_id, weight_kg, unload_weight_kg, total_sales_value, status, vehicle_plate, driver_name, created_at, updated_at) VALUES ('{load_uuid}', '{company_id}', '{str(uuid.uuid4())}', '{ldate}', '{db_id}', {qty_kg}, {unl_kg}, {val_sales}, 'delivered', '{plate}', '{driver}', now(), now());")

for order_id, (db_id, legacy_id) in purchase_order_map.items():
    order_loads = df_loadings[df_loadings['PedidodeCompra'] == order_id]
    pre_loads = order_loads[order_loads['data'] < cut_date]
    post_loads = order_loads[order_loads['data'] >= cut_date]
    
    if not pre_loads.empty:
        total_sc = pre_loads['Quantidade Sc'].sum()
        total_val = pre_loads['SubTotal Milho'].sum()
        total_kg = total_sc * 60
        load_uuid = str(uuid.uuid4())
        sql_loadings.append(f"INSERT INTO public.ops_loadings (id, company_id, legacy_id, loading_date, purchase_order_id, weight_kg, unload_weight_kg, total_purchase_value, status, vehicle_plate, driver_name, created_at, updated_at) VALUES ('{load_uuid}', '{company_id}', '{str(uuid.uuid4())}', '2026-01-31', '{db_id}', {total_kg}, {total_kg}, {total_val}, 'delivered', 'CVA', 'Crossover Virtual Adjustment', now(), now());")

    if not post_loads.empty:
        for idx, row in post_loads.iterrows():
            load_uuid = str(uuid.uuid4())
            ldate = row['data'].strftime('%Y-%m-%d')
            qty_kg = float(row['Quantidade Kg']) if not pd.isna(row['Quantidade Kg']) else 0.0
            unl_kg = float(row['Peso Descarrego']) if not pd.isna(row['Peso Descarrego']) else qty_kg
            if unl_kg <= 0:
                unl_kg = qty_kg
            val_purch = float(row['SubTotal Milho']) if not pd.isna(row['SubTotal Milho']) else 0.0
            plate = str(row['Transportadora']) if not pd.isna(row['Transportadora']) else 'AUTONOMO'
            driver = str(row['Motorista']) if not pd.isna(row['Motorista']) else 'N/I'
            plate = plate.replace("'", "''")
            driver = driver.replace("'", "''")
            sql_loadings.append(f"INSERT INTO public.ops_loadings (id, company_id, legacy_id, loading_date, purchase_order_id, weight_kg, unload_weight_kg, total_purchase_value, status, vehicle_plate, driver_name, created_at, updated_at) VALUES ('{load_uuid}', '{company_id}', '{str(uuid.uuid4())}', '{ldate}', '{db_id}', {qty_kg}, {unl_kg}, {val_purch}, 'delivered', '{plate}', '{driver}', now(), now());")

sql_loadings.append("COMMIT;")

sql_transactions = []
sql_transactions.append("BEGIN;")
sql_transactions.append(f"SELECT set_config('request.jwt.claims', '{{\"sub\": \"{user_id}\"}}', true);")

for order_id, (db_id, legacy_id) in sales_order_map.items():
    order_recs = df_receipts[df_receipts['PedidoVenda'] == order_id]
    pre_recs = order_recs[order_recs['Data'] < cut_date]
    post_recs = order_recs[order_recs['Data'] >= cut_date]
    
    if not pre_recs.empty:
        total_val = pre_recs['Valor'].sum()
        tx_uuid = str(uuid.uuid4())
        sql_transactions.append(f"INSERT INTO public.financial_transactions (id, company_id, entry_id, account_id, amount, transaction_date, type, description, created_by, created_at) VALUES ('{tx_uuid}', '{company_id}', (SELECT id FROM public.financial_entries WHERE (origin_id = '{db_id}' OR origin_id = '{legacy_id}') AND origin_type = 'sales_order' LIMIT 1), '{impl_account_id}', {total_val}, '2026-01-30', 'credit', 'Ajuste Virtual Crossover (CVA) - Recebimento Fase Legada', '{user_id}', now());")
                   
    if not post_recs.empty:
        for idx, row in post_recs.iterrows():
            tx_uuid = str(uuid.uuid4())
            tx_date = row['Data'].strftime('%Y-%m-%d')
            amount = float(row['Valor'])
            acc_name = str(row['Contas']).strip()
            acc_id = accounts_map.get(acc_name, impl_account_id)
            notes = str(row['Anotações']) if not pd.isna(row['Anotações']) else f"Recebimento Venda {order_id}"
            notes = notes.replace("'", "''")
            sql_transactions.append(f"INSERT INTO public.financial_transactions (id, company_id, entry_id, account_id, amount, transaction_date, type, description, created_by, created_at) VALUES ('{tx_uuid}', '{company_id}', (SELECT id FROM public.financial_entries WHERE (origin_id = '{db_id}' OR origin_id = '{legacy_id}') AND origin_type = 'sales_order' LIMIT 1), '{acc_id}', {amount}, '{tx_date}', 'credit', '{notes}', '{user_id}', now());")

for order_id, (db_id, legacy_id) in purchase_order_map.items():
    order_pays = df_payments[df_payments['PedidodeCompra'] == order_id]
    pre_pays = order_pays[order_pays['Data'] < cut_date]
    post_pays = order_pays[order_pays['Data'] >= cut_date]
    
    if not pre_pays.empty:
        total_val = pre_pays['Valor'].sum()
        tx_uuid = str(uuid.uuid4())
        sql_transactions.append(f"INSERT INTO public.financial_transactions (id, company_id, entry_id, account_id, amount, transaction_date, type, description, created_by, created_at) VALUES ('{tx_uuid}', '{company_id}', (SELECT id FROM public.financial_entries WHERE (origin_id = '{db_id}' OR origin_id = '{legacy_id}') AND origin_type = 'purchase_order' LIMIT 1), '{impl_account_id}', {total_val}, '2026-01-30', 'debit', 'Ajuste Virtual Crossover (CVA) - Pagamento Fase Legada', '{user_id}', now());")
                   
    if not post_pays.empty:
        for idx, row in post_pays.iterrows():
            tx_uuid = str(uuid.uuid4())
            tx_date = row['Data'].strftime('%Y-%m-%d')
            amount = float(row['Valor'])
            acc_name = str(row['Conta']).strip()
            acc_id = accounts_map.get(acc_name, impl_account_id)
            notes = str(row['Anotações']) if not pd.isna(row['Anotações']) else f"Pagamento Produtor {order_id}"
            notes = notes.replace("'", "''")
            sql_transactions.append(f"INSERT INTO public.financial_transactions (id, company_id, entry_id, account_id, amount, transaction_date, type, description, created_by, created_at) VALUES ('{tx_uuid}', '{company_id}', (SELECT id FROM public.financial_entries WHERE (origin_id = '{db_id}' OR origin_id = '{legacy_id}') AND origin_type = 'purchase_order' LIMIT 1), '{acc_id}', {amount}, '{tx_date}', 'debit', '{notes}', '{user_id}', now());")

sql_transactions.append("COMMIT;")

# Save split files
with open("scratch/import_loadings.sql", "w") as f:
    f.write("\n".join(sql_loadings))

with open("scratch/import_transactions.sql", "w") as f:
    f.write("\n".join(sql_transactions))

print("Split files generated:")
print(" - scratch/import_loadings.sql")
print(" - scratch/import_transactions.sql")
