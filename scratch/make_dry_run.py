with open("scratch/insert_expenses.sql", "r", encoding="utf-8") as f:
    sql = f.read()

# Replace COMMIT; at the end with ROLLBACK;
sql_dry = sql.replace("COMMIT;", "ROLLBACK;")

with open("scratch/insert_expenses_dry_run.sql", "w", encoding="utf-8") as f:
    f.write(sql_dry)

print("Dry-run SQL file written to scratch/insert_expenses_dry_run.sql")
