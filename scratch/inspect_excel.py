import pandas as pd

file_path = "Banco de Dados Suporte Gra\u0303os.xlsx"

try:
    xl = pd.ExcelFile(file_path)
    print("Sheets in Excel:")
    print(xl.sheet_names)
    
    # Print columns of some key sheets
    for sheet in ["PedidodeVenda", "PedidodeCompra", "CarrinhoFretes", "RecebimentoVenda", "PagProdutor"]:
        if sheet in xl.sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet, nrows=5)
            print(f"\n--- Sheet: {sheet} ---")
            print("Columns:", list(df.columns))
            print("Sample Row:")
            print(df.iloc[0].to_dict() if not df.empty else "Empty")
        else:
            print(f"\nSheet {sheet} not found")
except Exception as e:
    print("Error:", e)
