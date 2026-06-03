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

# Normalize Order IDs
df_loadings['PedidodeVenda'] = df_loadings['PedidodeVenda'].astype(str).str.strip()
df_loadings['PedidodeCompra'] = df_loadings['PedidodeCompra'].astype(str).str.strip().str.replace('.0', '', regex=False)
df_sales['NpedidoVenda'] = df_sales['NpedidoVenda'].astype(str).str.strip()
df_purchase['NPedidoCompra'] = df_purchase['NPedidoCompra'].astype(str).str.strip().str.replace('.0', '', regex=False)
df_receipts['PedidoVenda'] = df_receipts['PedidoVenda'].astype(str).str.strip()
df_payments['PedidodeCompra'] = df_payments['PedidodeCompra'].astype(str).str.strip().str.replace('.0', '', regex=False)

cut_date = pd.Timestamp('2026-02-01')

print("Generating detailed math for Sales Crossovers...")
sales_details = []
for idx, order in df_sales[df_sales['Data'] < cut_date].iterrows():
    order_id = order['NpedidoVenda']
    loadings = df_loadings[df_loadings['PedidodeVenda'] == order_id]
    post_loadings = loadings[loadings['data'] >= cut_date]
    pre_loadings = loadings[loadings['data'] < cut_date]
    
    if not post_loadings.empty:
        receipts = df_receipts[df_receipts['PedidoVenda'] == order_id]
        pre_receipts = receipts[receipts['Data'] < cut_date]
        post_receipts = receipts[receipts['Data'] >= cut_date]
        
        pre_load_val = pre_loadings['Valor Total de Venda'].sum()
        pre_load_qty = pre_loadings['Quantidade Sc'].sum()
        post_load_val = post_loadings['Valor Total de Venda'].sum()
        post_load_qty = post_loadings['Quantidade Sc'].sum()
        
        pre_rec_val = pre_receipts['Valor'].sum()
        post_rec_val = post_receipts['Valor'].sum()
        
        net_pre = pre_load_val - pre_rec_val
        net_post = post_load_val - post_rec_val
        total_load = pre_load_val + post_load_val
        total_rec = pre_rec_val + post_rec_val
        final_bal = total_load - total_rec
        
        sales_details.append({
            'order_id': order_id,
            'client': order['Cliente'],
            'date': order['Data'].strftime('%Y-%m-%d'),
            'contract_val': float(order['Valor Total Contrato']),
            'contract_qty': float(order['QuantidadeSCContrato']),
            'pre_load_qty': float(pre_load_qty),
            'pre_load_val': float(pre_load_val),
            'pre_rec_val': float(pre_rec_val),
            'net_pre_balance': float(net_pre),
            'post_load_qty': float(post_load_qty),
            'post_load_val': float(post_load_val),
            'post_rec_val': float(post_rec_val),
            'net_post_balance': float(net_post),
            'total_load_val': float(total_load),
            'total_rec_val': float(total_rec),
            'final_balance': float(final_bal),
            'status': order['Status']
        })

print("Generating detailed math for Purchase Crossovers...")
purchase_details = []
for idx, order in df_purchase[df_purchase['Data'] < cut_date].iterrows():
    order_id = order['NPedidoCompra']
    loadings = df_loadings[df_loadings['PedidodeCompra'] == order_id]
    post_loadings = loadings[loadings['data'] >= cut_date]
    pre_loadings = loadings[loadings['data'] < cut_date]
    
    if not post_loadings.empty:
        payments = df_payments[df_payments['PedidodeCompra'] == order_id]
        pre_payments = payments[payments['Data'] < cut_date]
        post_payments = payments[payments['Data'] >= cut_date]
        
        pre_load_val = pre_loadings['SubTotal Milho'].sum()
        pre_load_qty = pre_loadings['Quantidade Sc'].sum()
        post_load_val = post_loadings['SubTotal Milho'].sum()
        post_load_qty = post_loadings['Quantidade Sc'].sum()
        
        pre_pay_val = pre_payments['Valor'].sum()
        post_pay_val = post_payments['Valor'].sum()
        
        # For purchase: net is loaded (what we owe) - paid (what we paid).
        # Positive = we owe the producer. Negative = we overpaid / advanced.
        net_pre = pre_load_val - pre_pay_val
        net_post = post_load_val - post_pay_val
        total_load = pre_load_val + post_load_val
        total_pay = pre_pay_val + post_pay_val
        final_bal = total_load - total_pay
        
        purchase_details.append({
            'order_id': order_id,
            'producer': order['Produtor'],
            'date': order['Data'].strftime('%Y-%m-%d'),
            'contract_val': float(order['Valor Total']),
            'pre_load_qty': float(pre_load_qty),
            'pre_load_val': float(pre_load_val),
            'pre_pay_val': float(pre_pay_val),
            'net_pre_balance': float(net_pre),
            'post_load_qty': float(post_load_qty),
            'post_load_val': float(post_load_val),
            'post_pay_val': float(post_pay_val),
            'net_post_balance': float(net_post),
            'total_load_val': float(total_load),
            'total_pay_val': float(total_pay),
            'final_balance': float(final_bal),
            'status': order['Status']
        })

output_math = {
    'sales': sales_details,
    'purchase': purchase_details
}

with open("scratch/crossover_math_results.json", "w") as f:
    json.dump(output_math, f, indent=2)

print("Math details generated and saved to scratch/crossover_math_results.json")
