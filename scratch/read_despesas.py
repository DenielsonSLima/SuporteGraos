import os
import pandas as pd

excel_path = "Banco de Dados Suporte Grãos.xlsx"
if not os.path.exists(excel_path):
    excel_path = "Banco de Dados Suporte Grãos.xlsx"

df = pd.read_excel(excel_path, sheet_name="DespesasMensais")
df['ParsedDate'] = pd.to_datetime(df['Data'], errors='coerce')
june_2026 = df[df['ParsedDate'].dt.to_period('M') == '2026-06'].copy()

# Set option to print all columns
pd.set_option('display.max_columns', None)
pd.set_option('display.width', 1000)

print(f"Details of June 2026 Expenses (Total {len(june_2026)} rows):")
for idx, row in june_2026.iterrows():
    print("-" * 50)
    print(f"Row Index: {idx}")
    print(f"ID: {row['id']}")
    print(f"Data: {row['Data']}")
    print(f"Tipo: {row['Tipo']}")
    print(f"Descrição: {row['Descrição']}")
    print(f"Contas: {row['Contas']}")
    print(f"Valor: {row['Valor']}")
    print(f"Anotações: {row['Anotações']}")
    print(f"MesAno: {row['MesAno']}")
    print(f"PedCxMensal: {row['PedCxMensal']}")
