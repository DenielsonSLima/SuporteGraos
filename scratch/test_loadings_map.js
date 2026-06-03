import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vqhjbsiwzgxaozcedqcn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxaGpic2l3emd4YW96Y2VkcWNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDU4NTUsImV4cCI6MjA4NDYyMTg1NX0.LrDKJfqgcpaBNkBtdU-bCq5AL8MuXHgk9MtNBqQg90w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLoadings() {
  const { data, error } = await supabase
    .from('ops_loadings')
    .select(`
      *,
      purchase_order:ops_purchase_orders(id, legacy_id, number, partner_id, partner_name)
    `)
    .limit(10);

  if (error) {
    console.error("Error fetching loadings:", error);
    return;
  }

  console.log("=== RAW DATA AND MAPPED FIELDS ===");
  data.forEach((row, i) => {
    const meta = row.metadata || {};
    console.log(`\nRow ${i + 1}:`);
    console.log(`  Database ID: ${row.id}`);
    console.log(`  Database PO ID: ${row.purchase_order_id}`);
    console.log(`  Metadata PO ID: ${meta.purchaseOrderId}`);
    console.log(`  Nested PO ID: ${row.purchase_order?.id}`);
    console.log(`  Nested PO Legacy ID: ${row.purchase_order?.legacy_id}`);
    
    // Simulate mapLoadingFromDb
    const base = meta ? { ...meta } : {};
    const purchaseOrderId = row.purchase_order_id || '';
    const mappedPurchaseOrderId = base.purchaseOrderId ?? purchaseOrderId;
    console.log(`  Mapped purchaseOrderId in frontend: ${mappedPurchaseOrderId}`);
  });
}

checkLoadings();
