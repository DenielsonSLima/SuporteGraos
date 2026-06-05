import re
import uuid

with open("scratch/insert_expenses.sql", "r", encoding="utf-8") as f:
    sql = f.read()

# Find all single quoted strings that look like UUIDs or potential UUIDs
# UUIDs are 36 characters with hyphens
uuids = re.findall(r"'([a-f0-9_\-]{36})'", sql)

invalid_uuids = []
for u in uuids:
    try:
        uuid.UUID(u)
    except ValueError:
        invalid_uuids.append(u)

print("Found UUIDs:", len(uuids))
print("Invalid UUIDs:", invalid_uuids)
