#!/usr/bin/env python3
"""Verify patrimony history after fix via rpc_dashboard_data."""
import subprocess, json

url = "https://api.supabase.com/v1/projects/vqhjbsiwzgxaozcedqcn/database/query"

# Get the company_id first
query_company = "SELECT DISTINCT company_id FROM ops_loadings LIMIT 1"
r = subprocess.run([
    "curl", "-s", "-X", "POST", url,
    "-H", "Authorization: Bearer sbp_064702be71438c09fc86ef7138e899fa788fb7eb",
    "-H", "Content-Type: application/json",
    "-d", json.dumps({"query": query_company})
], capture_output=True, text=True)
company_id = json.loads(r.stdout)[0]["company_id"]
print(f"Company ID: {company_id}")

# Now test the patrimony history section by simulating what the RPC does
query = """
WITH months AS (SELECT generate_series(0, 5) AS i),
month_grid AS (
  SELECT
    i,
    (date_trunc('month', CURRENT_DATE - (i || ' months')::interval) + interval '1 month - 1 day')::date AS month_end,
    to_char(date_trunc('month', CURRENT_DATE - (i || ' months')::interval), 'Mon') AS month_name
  FROM months
),
recv AS (
  SELECT
    mg.i, mg.month_name, mg.month_end,
    COALESCE((
      SELECT SUM(l.total_sales_value)
      FROM ops_loadings l
      WHERE l.status NOT IN ('canceled','cancelled')
        AND l.unload_weight_kg IS NOT NULL
        AND l.loading_date <= mg.month_end
    ), 0)
    - COALESCE((
      SELECT SUM(ft.amount)
      FROM financial_transactions ft
      JOIN financial_entries fe ON fe.id = ft.entry_id
      WHERE fe.type LIKE '%receivable%'
        AND lower(ft.type) IN ('in', 'credit')
        AND ft.transaction_date <= mg.month_end
    ), 0) AS receivables
  FROM month_grid mg
  GROUP BY mg.i, mg.month_name, mg.month_end
),
pay AS (
  SELECT
    mg.i,
    COALESCE((
      SELECT SUM(l.total_purchase_value + l.total_freight_value)
      FROM ops_loadings l
      WHERE l.status NOT IN ('canceled','cancelled')
        AND l.loading_date <= mg.month_end
    ), 0)
    - COALESCE((
      SELECT SUM(ft.amount)
      FROM financial_transactions ft
      JOIN financial_entries fe ON fe.id = ft.entry_id
      WHERE fe.type LIKE '%payable%'
        AND lower(ft.type) IN ('out', 'debit')
        AND ft.transaction_date <= mg.month_end
    ), 0) AS payables
  FROM month_grid mg
  GROUP BY mg.i, mg.month_end
)
SELECT r.month_name, r.receivables, p.payables,
  r.receivables - p.payables as net_operational
FROM recv r
JOIN pay p ON p.i = r.i
ORDER BY r.i DESC
"""

r2 = subprocess.run([
    "curl", "-s", "-X", "POST", url,
    "-H", "Authorization: Bearer sbp_064702be71438c09fc86ef7138e899fa788fb7eb",
    "-H", "Content-Type: application/json",
    "-d", json.dumps({"query": query})
], capture_output=True, text=True)
data = json.loads(r2.stdout)
print("\n=== Patrimony History (loading-date-based) ===")
print(json.dumps(data, indent=2))
if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
    print(f"\n{'Month':<8} {'Receivables':>15} {'Payables':>15} {'Net':>15}")
    print("-" * 56)
    for row in data:
        print(f"{row['month_name']:<8} {float(row['receivables']):>15,.2f} {float(row['payables']):>15,.2f} {float(row['net_operational']):>15,.2f}")
