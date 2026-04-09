#!/usr/bin/env python3
"""Execute migration SQL on Supabase via Management API."""
import subprocess, json, sys

url = "https://api.supabase.com/v1/projects/vqhjbsiwzgxaozcedqcn/database/query"
token = "sbp_ce6501d3c4ecfc9afe3038821d3770e56b0853e5"

# Read the migration SQL file
sql_file = "supabase/migrations/20260409_fix_dual_state.sql"
with open(sql_file, "r") as f:
    sql = f.read()

body = json.dumps({"query": sql})

result = subprocess.run([
    "curl", "-s", "-X", "POST", url,
    "-H", f"Authorization: Bearer {token}",
    "-H", "Content-Type: application/json",
    "-d", body
], capture_output=True, text=True)

try:
    data = json.loads(result.stdout)
    print(json.dumps(data, indent=2))
except:
    print("RAW:", result.stdout[:2000])
    if result.stderr:
        print("ERR:", result.stderr[:2000])
