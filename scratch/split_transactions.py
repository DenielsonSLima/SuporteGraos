#!/usr/bin/env python3
import sys

print("Reading scratch/import_transactions.sql...")
with open("scratch/import_transactions.sql", "r") as f:
    lines = f.readlines()

# The first line is "BEGIN;"
# The second line is "SELECT set_config('request.jwt.claims', '{\"sub\": \"53b13148-4b43-411d-8de1-3f82e78ca5af\"}', true);"
# The last line is "COMMIT;"
header = [
    "BEGIN;\n",
    "SELECT set_config('request.jwt.claims', '{\"sub\": \"53b13148-4b43-411d-8de1-3f82e78ca5af\"}', true);\n"
]
footer = [
    "COMMIT;\n"
]

# Insert statements are from line 3 to line 240
inserts = []
for line in lines:
    if line.strip() and not line.startswith("BEGIN") and not line.startswith("SELECT set_config") and not line.startswith("COMMIT"):
        inserts.append(line)

print(f"Total insert statements: {len(inserts)}")

# Split into 3 parts
chunk_size = (len(inserts) + 2) // 3
for i in range(3):
    start = i * chunk_size
    end = min(start + chunk_size, len(inserts))
    part_inserts = inserts[start:end]
    
    part_content = header + part_inserts + footer
    part_file = f"scratch/import_transactions_part{i+1}.sql"
    
    with open(part_file, "w") as out:
        out.writelines(part_content)
        
    print(f"Saved {part_file} with {len(part_inserts)} inserts.")
