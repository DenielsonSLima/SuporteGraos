import pandas as pd
import json

file_path = "Banco de Dados Suporte Gra\u0303os.xlsx"

# Load sheets
df_sales = pd.read_excel(file_path, sheet_name="PedidodeVenda")
df_purchase = pd.read_excel(file_path, sheet_name="PedidodeCompra")
df_loadings = pd.read_excel(file_path, sheet_name="CarrinhoFretes")
df_receipts = pd.read_excel(file_path, sheet_name="RecebimentoVenda")
df_payments = pd.read_excel(file_path, sheet_name="PagProdutor")

# Convert dates to datetime
df_sales['Data'] = pd.to_datetime(df_sales['Data'], errors='coerce')
df_purchase['Data'] = pd.to_datetime(df_purchase['Data'], errors='coerce')
df_loadings['data'] = pd.to_datetime(df_loadings['data'], errors='coerce')
df_receipts['Data'] = pd.to_datetime(df_receipts['Data'], errors='coerce')
df_payments['Data'] = pd.to_datetime(df_payments['Data'], errors='coerce')

# Convert string IDs
df_loadings['PedidodeVenda'] = df_loadings['PedidodeVenda'].astype(str).str.strip()
df_loadings['PedidodeCompra'] = df_loadings['PedidodeCompra'].astype(str).str.strip().str.replace('.0', '', regex=False)
df_sales['NpedidoVenda'] = df_sales['NpedidoVenda'].astype(str).str.strip()
df_purchase['NPedidoCompra'] = df_purchase['NPedidoCompra'].astype(str).str.strip().str.replace('.0', '', regex=False)
df_receipts['PedidoVenda'] = df_receipts['PedidoVenda'].astype(str).str.strip()
df_payments['PedidodeCompra'] = df_payments['PedidodeCompra'].astype(str).str.strip().str.replace('.0', '', regex=False)

# Filters for Feb 2026 (2026-02-01 to 2026-02-28)
start_feb = pd.Timestamp('2026-02-01')
end_feb = pd.Timestamp('2026-02-28')

feb_loadings = df_loadings[(df_loadings['data'] >= start_feb) & (df_loadings['data'] <= end_feb)]
feb_receipts = df_receipts[(df_receipts['Data'] >= start_feb) & (df_receipts['Data'] <= end_feb)]
feb_payments = df_payments[(df_payments['Data'] >= start_feb) & (df_payments['Data'] <= end_feb)]

print(f"=== FEBRUARY 2026 OVERVIEW ===")
print(f"Loadings (CarrinhoFretes) in Feb: {len(feb_loadings)}")
print(f"Receipts (RecebimentoVenda) in Feb: {len(feb_receipts)} - Total: R$ {feb_receipts['Valor'].sum():,.2f}")
print(f"Payments (PagProdutor) in Feb: {len(feb_payments)} - Total: R$ {feb_payments['Valor'].sum():,.2f}")

# Check loaded orders in Feb
loaded_sales_ids = feb_loadings['PedidodeVenda'].unique()
loaded_purchase_ids = feb_loadings['PedidodeCompra'].unique()

print(f"\nUnique Sales Orders loaded in Feb: {len(loaded_sales_ids)}")
print(f"Unique Purchase Orders loaded in Feb: {len(loaded_purchase_ids)}")

print(f"\n--- Sales Orders loaded in Feb 2026 ---")
for s_id in loaded_sales_ids:
    order_info = df_sales[df_sales['NpedidoVenda'] == s_id]
    loads = feb_loadings[feb_loadings['PedidodeVenda'] == s_id]
    recs = feb_receipts[feb_receipts['PedidoVenda'] == s_id]
    
    if not order_info.empty:
        client = order_info.iloc[0]['Cliente']
        order_date = order_info.iloc[0]['Data']
        print(f"Order: {s_id} | Client: {client} | Date: {order_date.strftime('%Y-%m-%d') if not pd.isna(order_date) else 'N/I'}")
        print(f"  Feb Loadings: {len(loads)} loads | Qty SC: {loads['Quantidade Sc'].sum():,.2f} | Sales Val: R$ {loads['Valor Total de Venda'].sum():,.2f}")
        print(f"  Feb Receipts: {len(recs)} receipts | Total Received: R$ {recs['Valor'].sum():,.2f}")
    else:
        print(f"Order: {s_id} NOT found in PedidodeVenda sheet!")
        print(f"  Feb Loadings: {len(loads)} loads | Qty SC: {loads['Quantidade Sc'].sum():,.2f} | Sales Val: R$ {loads['Valor Total de Venda'].sum():,.2f}")

print(f"\n--- Purchase Orders loaded in Feb 2026 ---")
for p_id in loaded_purchase_ids:
    order_info = df_purchase[df_purchase['NPedidoCompra'] == p_id]
    loads = feb_loadings[feb_loadings['PedidodeCompra'] == p_id]
    pays = feb_payments[feb_payments['PedidodeCompra'] == p_id]
    
    if not order_info.empty:
        producer = order_info.iloc[0]['Produtor']
        order_date = order_info.iloc[0]['Data']
        print(f"Order: {p_id} | Producer: {producer} | Date: {order_date.strftime('%Y-%m-%d') if not pd.isna(order_date) else 'N/I'}")
        print(f"  Feb Loadings: {len(loads)} loads | Qty SC: {loads['Quantidade Sc'].sum():,.2f} | Purchase Val: R$ {loads['SubTotal Milho'].sum():,.2f}")
        print(f"  Feb Payments: {len(pays)} payments | Total Paid: R$ {pays['Valor'].sum():,.2f}")
    else:
        print(f"Order: {p_id} NOT found in PedidodeCompra sheet!")
        print(f"  Feb Loadings: {len(loads)} loads | Qty SC: {loads['Quantidade Sc'].sum():,.2f} | Purchase Val: R$ {loads['SubTotal Milho'].sum():,.2f}")

# Detail details of feb loadings (columns: Transportadora, Motorista, Quantidade Kg, Peso Descarrego, etc.)
print(f"\n--- Sample Loadings details from Feb ---")
sample_l = feb_loadings.head(5)
for idx, r in sample_l.iterrows():
    print(f"Date: {r['data'].strftime('%Y-%m-%d')} | Transp: {r['Transportadora']} | Motorista: {r['Motorista']} | Qty KG: {r['Quantidade Kg']} | Descarrego: {r['Peso Descarrego']} | Plate: {r.get('Placa', 'N/I')}")
