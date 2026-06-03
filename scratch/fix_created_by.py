#!/usr/bin/env python3

files = [
    "scratch/import_transactions.sql",
    "scratch/import_transactions_part1.sql",
    "scratch/import_transactions_part2.sql",
    "scratch/import_transactions_part3.sql"
]

# We want to replace Jhonata's auth_user_id with app_users.id for the created_by field
# Jhonata's auth_user_id: 53b13148-4b43-411d-8de1-3f82e78ca5af
# Jhonata's app_users.id: e7c303c8-a832-4fda-8c51-fd757b678677

old_val = "'53b13148-4b43-411d-8de1-3f82e78ca5af', now()"
new_val = "'e7c303c8-a832-4fda-8c51-fd757b678677', now()"

for file_path in files:
    print(f"Fixing created_by in {file_path}...")
    with open(file_path, "r") as f:
        content = f.read()
    
    # Do replacement of the created_by value (which is paired with now() at the end of the values list)
    new_content = content.replace(old_val, new_val)
    
    with open(file_path, "w") as f:
        f.write(new_content)

print("Done fixing created_by column values!")
