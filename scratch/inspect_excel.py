import os
import openpyxl
import pandas as pd

excel_path = "Banco de Dados Suporte Grãos.xlsx"
if not os.path.exists(excel_path):
    # Try with normal a+tilde
    excel_path = "Banco de Dados Suporte Grãos.xlsx"

print("Checking file path:", excel_path)
print("File exists:", os.path.exists(excel_path))

try:
    xl = pd.ExcelFile(excel_path)
    print("Sheets in Excel (pandas):", xl.sheet_names)
except Exception as e:
    print("Error with pandas:", e)
    try:
        wb = openpyxl.load_workbook(excel_path, read_only=True)
        print("Sheets in Excel (openpyxl):", wb.sheetnames)
    except Exception as e2:
        print("Error with openpyxl:", e2)
