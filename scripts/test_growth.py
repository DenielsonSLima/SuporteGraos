#!/usr/bin/env python3
"""Test the growth percent calculation."""
import subprocess, json

url = "https://api.supabase.com/v1/projects/vqhjbsiwzgxaozcedqcn/database/query"

# Simulate history: Oct-Jan = 0, Feb = -5373, Mar = 20273
query = """
WITH hist AS (
  SELECT unnest(ARRAY[
    '{"netWorth": 0}'::json,
    '{"netWorth": 0}'::json,
    '{"netWorth": 0}'::json,
    '{"netWorth": 0}'::json,
    '{"netWorth": -5373}'::json,
    '{"netWorth": 20273}'::json
  ]) AS elem
),
hist_values AS (
  SELECT (elem->>'netWorth')::NUMERIC AS net_worth, ROW_NUMBER() OVER () AS rn
  FROM hist
),
first_nonzero AS (
  SELECT hv.net_worth FROM hist_values hv WHERE hv.net_worth <> 0
  ORDER BY hv.rn ASC LIMIT 1
),
last_value AS (
  SELECT hv.net_worth FROM hist_values hv ORDER BY hv.rn DESC LIMIT 1
)
SELECT fn.net_worth as first_nz, lv.net_worth as last_val,
  ROUND(((lv.net_worth - fn.net_worth) / ABS(fn.net_worth)) * 100, 1) as growth_pct
FROM first_nonzero fn, last_value lv
"""

r = subprocess.run([
    "curl", "-s", "-X", "POST", url,
    "-H", "Authorization: Bearer sbp_064702be71438c09fc86ef7138e899fa788fb7eb",
    "-H", "Content-Type: application/json",
    "-d", json.dumps({"query": query})
], capture_output=True, text=True)
print(json.dumps(json.loads(r.stdout), indent=2))
