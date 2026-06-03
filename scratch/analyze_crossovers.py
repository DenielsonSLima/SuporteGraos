import pandas as pd
import numpy as np

file_path = "Banco de Dados Suporte Gra\u0303os.xlsx"

# Load sheets
print("Loading sheets from Excel...")
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

# Normalize Order IDs in loadings
df_loadings['PedidodeVenda'] = df_loadings['PedidodeVenda'].astype(str).str.strip()
df_loadings['PedidodeCompra'] = df_loadings['PedidodeCompra'].astype(str).str.strip().str.replace('.0', '', regex=False)

df_sales['NpedidoVenda'] = df_sales['NpedidoVenda'].astype(str).str.strip()
df_purchase['NPedidoCompra'] = df_purchase['NPedidoCompra'].astype(str).str.strip().str.replace('.0', '', regex=False)

cut_date = pd.Timestamp('2026-02-01')

print("\n--- ANALYZING SALES ORDERS (PEDIDOS DE VENDA) ---")
# Orders created on or before 2026-01-31
old_sales = df_sales[df_sales['Data'] < cut_date]

sales_crossovers = []
for idx, order in old_sales.iterrows():
    order_id = order['NpedidoVenda']
    # Find loadings for this order
    loadings = df_loadings[df_loadings['PedidodeVenda'] == order_id]
    
    # Check if there are loadings after Jan 2026
    post_jan_loadings = loadings[loadings['data'] >= cut_date]
    pre_jan_loadings = loadings[loadings['data'] < cut_date]
    
    if not post_jan_loadings.empty:
        # Get payments for this order
        receipts = df_receipts[df_receipts['PedidoVenda'] == order_id]
        post_jan_receipts = receipts[receipts['Data'] >= cut_date]
        pre_jan_receipts = receipts[receipts['Data'] < cut_date]
        
        sales_crossovers.append({
            'order_id': order_id,
            'client': order['Cliente'],
            'order_date': order['Data'],
            'total_value': order['Valor Total Contrato'],
            'total_qty_sc': order['QuantidadeSCContrato'],
            'pre_feb_loadings_val': pre_jan_loadings['Valor Total de Venda'].sum(),
            'pre_feb_loadings_qty_sc': pre_jan_loadings['Quantidade Sc'].sum(),
            'post_feb_loadings_val': post_jan_loadings['Valor Total de Venda'].sum(),
            'post_feb_loadings_qty_sc': post_jan_loadings['Quantidade Sc'].sum(),
            'pre_feb_receipts_val': pre_jan_receipts['Valor'].sum(),
            'post_feb_receipts_val': post_jan_receipts['Valor'].sum(),
            'loadings_post_details': post_jan_loadings[['data', 'Quantidade Sc', 'Valor Total de Venda']].to_dict('records')
        })

print(f"Found {len(sales_crossovers)} sales crossover orders.")

print("\n--- ANALYZING PURCHASE ORDERS (PEDIDOS DE COMPRA) ---")
old_purchase = df_purchase[df_purchase['Data'] < cut_date]

purchase_crossovers = []
for idx, order in old_purchase.iterrows():
    order_id = order['NPedidoCompra']
    # Find loadings for this order
    loadings = df_loadings[df_loadings['PedidodeCompra'] == order_id]
    
    # Check if there are loadings after Jan 2026
    post_jan_loadings = loadings[loadings['data'] >= cut_date]
    pre_jan_loadings = loadings[loadings['data'] < cut_date]
    
    if not post_jan_loadings.empty:
        # Get payments for this order
        # Need to clean up PedidodeCompra in PagProdutor
        df_payments['PedidodeCompra'] = df_payments['PedidodeCompra'].astype(str).str.strip().str.replace('.0', '', regex=False)
        payments = df_payments[df_payments['PedidodeCompra'] == order_id]
        post_jan_payments = payments[payments['Data'] >= cut_date]
        pre_jan_payments = payments[payments['Data'] < cut_date]
        
        purchase_crossovers.append({
            'order_id': order_id,
            'producer': order['Produtor'],
            'order_date': order['Data'],
            'total_value': order['Valor Total'],
            'pre_feb_loadings_val': pre_jan_loadings['SubTotal Milho'].sum(),
            'pre_feb_loadings_qty_sc': pre_jan_loadings['Quantidade Sc'].sum(),
            'post_feb_loadings_val': post_jan_loadings['SubTotal Milho'].sum(),
            'post_feb_loadings_qty_sc': post_jan_loadings['Quantidade Sc'].sum(),
            'pre_feb_payments_val': pre_jan_payments['Valor'].sum(),
            'post_feb_payments_val': post_jan_payments['Valor'].sum(),
            'loadings_post_details': post_jan_loadings[['data', 'Quantidade Sc', 'SubTotal Milho']].to_dict('records')
        })

print(f"Found {len(purchase_crossovers)} purchase crossover orders.")

# Save results to output
import json
output = {
    'sales_crossovers': sales_crossovers,
    'purchase_crossovers': purchase_crossovers
}

# Write a neat readable summary to console
print("\n=== DETAILED SALES CROSSOVERS ===")
for sc in sales_crossovers:
    print(f"\nOrder: {sc['order_id']} | Client: {sc['client']} | Date: {sc['order_date'].strftime('%Y-%m-%d')}")
    print(f"  Contrato: R$ {sc['total_value']:,.2f} ({sc['total_qty_sc']:,.2f} Sc)")
    print(f"  Carregado Pre-Fev: R$ {sc['pre_feb_loadings_val']:,.2f} ({sc['pre_feb_loadings_qty_sc']:,.2f} Sc) | Recebido Pre-Fev: R$ {sc['pre_feb_receipts_val']:,.2f}")
    print(f"  Carregado Pos-Fev: R$ {sc['post_feb_loadings_val']:,.2f} ({sc['post_feb_loadings_qty_sc']:,.2f} Sc) | Recebido Pos-Fev: R$ {sc['post_feb_receipts_val']:,.2f}")
    print(f"  Loadings Details after 01/02/2026:")
    for l in sc['loadings_post_details']:
        print(f"    - Date: {l['data'].strftime('%Y-%m-%d')} | Qty: {l['Quantidade Sc']:,.2f} Sc | Val: R$ {l['Valor Total de Venda']:,.2f}")

print("\n=== DETAILED PURCHASE CROSSOVERS ===")
for pc in purchase_crossovers:
    print(f"\nOrder: {pc['order_id']} | Producer: {pc['producer']} | Date: {pc['order_date'].strftime('%Y-%m-%d')}")
    print(f"  Contrato: R$ {pc['total_value']:,.2f}")
    print(f"  Carregado Pre-Fev: R$ {pc['pre_feb_loadings_val']:,.2f} ({pc['pre_feb_loadings_qty_sc']:,.2f} Sc) | Pago Pre-Fev: R$ {pc['pre_feb_payments_val']:,.2f}")
    print(f"  Carregado Pos-Fev: R$ {pc['post_feb_loadings_val']:,.2f} ({pc['post_feb_loadings_qty_sc']:,.2f} Sc) | Pago Pos-Fev: R$ {pc['post_feb_payments_val']:,.2f}")
    print(f"  Loadings Details after 01/02/2026:")
    for l in pc['loadings_post_details']:
        print(f"    - Date: {l['data'].strftime('%Y-%m-%d')} | Qty: {l['Quantidade Sc']:,.2f} Sc | Val: R$ {l['SubTotal Milho']:,.2f}")

with open("scratch/crossover_analysis.json", "w") as f:
    # Serialize datetime to string
    def default(o):
        if isinstance(o, (pd.Timestamp, pd.DatetimeIndex)):
            return o.strftime('%Y-%m-%d')
        elif isinstance(o, (np.int64, np.integer)):
            return int(o)
        elif isinstance(o, (np.float64, np.floating)):
            return float(o)
        return str(o)
    json.dump(output, f, default=default, indent=2)

print("\nAnalysis saved to scratch/crossover_analysis.json")
