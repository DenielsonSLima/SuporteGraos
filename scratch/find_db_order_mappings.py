import pandas as pd
import json
import psycopg2

# Database connection details
db_url = "postgresql://postgres:postgres@db.vqhjbsiwzgxaozcedqcn.supabase.co:5432/postgres"

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
except Exception as e:
    print("Database connection error:", e)
    exit(1)

file_path = "Banco de Dados Suporte Gra\u0303os.xlsx"

# Load sheets
df_sales = pd.read_excel(file_path, sheet_name="PedidodeVenda")
df_purchase = pd.read_excel(file_path, sheet_name="PedidodeCompra")
df_loadings = pd.read_excel(file_path, sheet_name="CarrinhoFretes")

df_sales['Data'] = pd.to_datetime(df_sales['Data'], errors='coerce')
df_purchase['Data'] = pd.to_datetime(df_purchase['Data'], errors='coerce')
df_loadings['data'] = pd.to_datetime(df_loadings['data'], errors='coerce')

df_loadings['PedidodeVenda'] = df_loadings['PedidodeVenda'].astype(str).str.strip()
df_loadings['PedidodeCompra'] = df_loadings['PedidodeCompra'].astype(str).str.strip().str.replace('.0', '', regex=False)
df_sales['NpedidoVenda'] = df_sales['NpedidoVenda'].astype(str).str.strip()
df_purchase['NPedidoCompra'] = df_purchase['NPedidoCompra'].astype(str).str.strip().str.replace('.0', '', regex=False)

start_feb = pd.Timestamp('2026-02-01')
end_feb = pd.Timestamp('2026-02-28')
feb_loadings = df_loadings[(df_loadings['data'] >= start_feb) & (df_loadings['data'] <= end_feb)]

# Get all unique orders loaded in Feb from Excel
excel_sales_ids = feb_loadings['PedidodeVenda'].unique()
excel_purchase_ids = feb_loadings['PedidodeCompra'].unique()

print("Excel sales orders loaded in Feb:", excel_sales_ids)
print("Excel purchase orders loaded in Feb:", excel_purchase_ids)

# Let's query all sales orders in DB
cursor.execute("SELECT id, number, customer_name, order_date, total_value, quantity, unit_price FROM ops_sales_orders;")
db_sales = cursor.fetchall()
df_db_sales = pd.DataFrame(db_sales, columns=['db_id', 'number', 'customer_name', 'order_date', 'total_value', 'quantity', 'unit_price'])

# Let's query all purchase orders in DB
cursor.execute("SELECT id, number, partner_name, order_date, total_value FROM ops_purchase_orders;")
db_purchase = cursor.fetchall()
df_db_purchase = pd.DataFrame(db_purchase, columns=['db_id', 'number', 'partner_name', 'order_date', 'total_value'])

print("\n--- Sales Orders Mapping Analysis ---")
for xls_id in excel_sales_ids:
    if xls_id == 'nan' or not xls_id:
        continue
    xls_row = df_sales[df_sales['NpedidoVenda'] == xls_id]
    if xls_row.empty:
        print(f"Excel Order {xls_id} info not found in PedidodeVenda sheet!")
        continue
    xls_info = xls_row.iloc[0]
    client = xls_info['Cliente']
    val = float(xls_info['Valor Total Contrato'])
    qty = float(xls_info['QuantidadeSCContrato'])
    price = float(xls_info['Valor Unitario'])
    date = xls_info['Data']
    
    print(f"\nExcel Order: {xls_id} | Client: {client} | Date: {date.strftime('%Y-%m-%d') if not pd.isna(date) else 'N/I'} | Val: R$ {val:,.2f} | Qty: {qty:,.2f} Sc | Price: R$ {price:,.2f}")
    
    # Try to find match in DB
    matches = df_db_sales[df_db_sales['customer_name'].str.contains(client[:6], case=False, na=False)]
    if not matches.empty:
        print("  Possible DB matches:")
        for idx, r in matches.iterrows():
            print(f"    - DB Number: {r['number']} | DB ID: {r['db_id']} | Cust: {r['customer_name']} | Date: {r['order_date']} | Val: R$ {float(r['total_value']):,.2f} | Qty: {float(r['quantity']):,.2f} | Price: R$ {float(r['unit_price']):,.2f}")
    else:
        print("  NO DB MATCH FOUND by customer name!")

print("\n--- Purchase Orders Mapping Analysis ---")
for xls_id in excel_purchase_ids:
    if xls_id == 'nan' or not xls_id or xls_id == 'None':
        continue
    xls_row = df_purchase[df_purchase['NPedidoCompra'] == xls_id]
    if xls_row.empty:
        print(f"Excel Order {xls_id} info not found in PedidodeCompra sheet!")
        continue
    xls_info = xls_row.iloc[0]
    producer = xls_info['Produtor']
    val = float(xls_info['Valor Total'])
    date = xls_info['Data']
    
    print(f"\nExcel Order: {xls_id} | Producer: {producer} | Date: {date.strftime('%Y-%m-%d') if not pd.isna(date) else 'N/I'} | Val: R$ {val:,.2f}")
    
    # Try to find match in DB
    matches = df_db_purchase[df_db_purchase['partner_name'].str.contains(producer[:6], case=False, na=False)]
    if not matches.empty:
        print("  Possible DB matches:")
        for idx, r in matches.iterrows():
            print(f"    - DB Number: {r['number']} | DB ID: {r['db_id']} | Part: {r['partner_name']} | Date: {r['order_date']} | Val: R$ {float(r['total_value']):,.2f}")
    else:
        print("  NO DB MATCH FOUND by producer name!")

conn.close()
