import re

def parse_sql():
    with open("scratch/import_loadings.sql", "r") as f:
        content = f.read()

    # Find all INSERT statements
    insert_pattern = re.compile(
        r"INSERT\s+INTO\s+public\.ops_loadings\s*\((.*?)\)\s*VALUES\s*\((.*?)\);",
        re.IGNORECASE | re.DOTALL
    )
    
    updates = []
    
    for match in insert_pattern.finditer(content):
        cols_str, vals_str = match.groups()
        
        # Simple split by comma, ignoring commas inside quotes
        # Since the values list might have quotes, we can parse it carefully
        cols = [c.strip() for c in cols_str.split(",")]
        
        # Parse values
        vals = []
        current_val = []
        in_quotes = False
        quote_char = None
        
        for char in vals_str:
            if char in ("'", '"'):
                if not in_quotes:
                    in_quotes = True
                    quote_char = char
                elif quote_char == char:
                    in_quotes = False
                    quote_char = None
                current_val.append(char)
            elif char == ',' and not in_quotes:
                vals.append("".join(current_val).strip())
                current_val = []
            else:
                current_val.append(char)
        if current_val:
            vals.append("".join(current_val).strip())
            
        # Map cols to vals
        val_map = dict(zip(cols, vals))
        
        loading_id = val_map.get("id").replace("'", "")
        
        # Check sales or purchase
        is_sales = "sales_order_id" in val_map
        is_purchase = "purchase_order_id" in val_map
        
        weight_kg = float(val_map.get("weight_kg", "0"))
        unload_weight_kg = float(val_map.get("unload_weight_kg", "0"))
        
        if is_sales:
            total_sales_value = float(val_map.get("total_sales_value", "0"))
            # Calculate sales price per bag (60kg)
            ref_weight = unload_weight_kg if unload_weight_kg > 0 else weight_kg
            sales_price = (total_sales_value / (ref_weight / 60.0)) if ref_weight > 0 else 0
            
            # Prepare metadata and raw_payload
            meta = f"'{{\"salesPrice\": {sales_price:.6f}, \"totalSalesValue\": {total_sales_value:.2f}, \"totalFreightValue\": 0, \"totalPurchaseValue\": 0}}'::jsonb"
            
            updates.append(
                f"UPDATE public.ops_loadings SET total_sales_value = {total_sales_value:.2f}, metadata = {meta}, raw_payload = {meta} WHERE id = '{loading_id}';"
            )
            
        elif is_purchase:
            total_purchase_value = float(val_map.get("total_purchase_value", "0"))
            ref_weight = weight_kg
            purchase_price = (total_purchase_value / (ref_weight / 60.0)) if ref_weight > 0 else 0
            
            meta = f"'{{\"purchasePricePerSc\": {purchase_price:.6f}, \"totalSalesValue\": 0, \"totalFreightValue\": 0, \"totalPurchaseValue\": {total_purchase_value:.2f}}}'::jsonb"
            
            updates.append(
                f"UPDATE public.ops_loadings SET total_purchase_value = {total_purchase_value:.2f}, metadata = {meta}, raw_payload = {meta} WHERE id = '{loading_id}';"
            )

    # Write SQL updates
    with open("scratch/fix_loadings.sql", "w") as f:
        f.write("BEGIN;\n")
        f.write("-- Disable triggers\n")
        f.write("ALTER TABLE public.ops_loadings DISABLE TRIGGER trg_ops_loading_compute_totals;\n")
        f.write("ALTER TABLE public.ops_loadings DISABLE TRIGGER trg_loading_unload_sync;\n\n")
        
        for up in updates:
            f.write(up + "\n")
            
        f.write("\n-- Re-enable triggers\n")
        f.write("ALTER TABLE public.ops_loadings ENABLE TRIGGER trg_ops_loading_compute_totals;\n")
        f.write("ALTER TABLE public.ops_loadings ENABLE TRIGGER trg_loading_unload_sync;\n")
        f.write("COMMIT;\n")
        
    print(f"Generated {len(updates)} update statements in scratch/fix_loadings.sql")

if __name__ == "__main__":
    parse_sql()
