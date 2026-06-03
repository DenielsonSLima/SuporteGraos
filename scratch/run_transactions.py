#!/usr/bin/env python3
import requests
import json
import sys

url = "https://api.supabase.com/v1/projects/vqhjbsiwzgxaozcedqcn/database/query"
token = "sbp_ce6501d3c4ecfc9afe3038821d3770e56b0853e5"

print("Reading scratch/import_transactions.sql...")
with open("scratch/import_transactions.sql", "r") as f:
    sql = f.read()

print("Sending request to Supabase Database Query API...")
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}
payload = {
    "query": sql
}

try:
    response = requests.post(url, headers=headers, json=payload, timeout=60)
    print(f"HTTP Status: {response.status_code}")
    if response.status_code == 201 or response.status_code == 200:
        data = response.json()
        print("Success! Response:")
        print(json.dumps(data, indent=2)[:5000])
    else:
        print("Error response:")
        print(response.text[:5000])
except Exception as e:
    print(f"Exception: {e}", file=sys.stderr)
