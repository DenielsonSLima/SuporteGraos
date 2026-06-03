import json
import requests

url = "https://vqhjbsiwzgxaozcedqcn.supabase.co/rest/v1"
headers = {
    "apikey": "sb_publishable_m8MBqafWFUIhbSmhatvDYw_NWrO_E8V",
    "Authorization": "Bearer sb_publishable_m8MBqafWFUIhbSmhatvDYw_NWrO_E8V"
}

# Load the crossover analysis results we found
with open("scratch/crossover_analysis.json") as f:
    crossover_data = json.load(f)

sales_orders = [o['order_id'] for o in crossover_data['sales_crossovers']]
purchase_orders = [o['order_id'] for o in crossover_data['purchase_crossovers']]

print(f"Checking {len(sales_orders)} Sales Orders in Supabase...")
# Fetch all sales orders
res_sales = requests.get(f"{url}/ops_sales_orders?select=id,number,status,total_value,received_value,balance_value", headers=headers)
if res_sales.status_code == 200:
    db_sales = res_sales.json()
    db_sales_numbers = {s['number']: s for s in db_sales}
    
    print("\n--- Sales Orders Status in Supabase ---")
    for order_id in sales_orders:
        match = db_sales_numbers.get(order_id)
        if match:
            print(f"✅ {order_id} exists. Status: {match['status']} | Total: {match['total_value']} | Received: {match['received_value']} | Balance: {match['balance_value']}")
        else:
            print(f"❌ {order_id} is MISSING from Supabase.")
else:
    print("Error fetching sales orders:", res_sales.status_code, res_sales.text)

print(f"\nChecking {len(purchase_orders)} Purchase Orders in Supabase...")
res_purchase = requests.get(f"{url}/ops_purchase_orders?select=id,number,status,total_value,paid_value", headers=headers)
if res_purchase.status_code == 200:
    db_purchase = res_purchase.json()
    # Normalize order numbers (sometimes they are stored as numbers or strings)
    db_purchase_numbers = {str(p['number']).strip(): p for p in db_purchase}
    
    print("\n--- Purchase Orders Status in Supabase ---")
    for order_id in purchase_orders:
        match = db_purchase_numbers.get(order_id)
        if match:
            print(f"✅ {order_id} exists. Status: {match['status']} | Total: {match['total_value']} | Paid: {match['paid_value']}")
        else:
            print(f"❌ {order_id} is MISSING from Supabase.")
else:
    print("Error fetching purchase orders:", res_purchase.status_code, res_purchase.text)

