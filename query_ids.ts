import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: so } = await supabase.from('ops_sales_orders').select('id, legacy_id, number').eq('number', 'PV-2026-836').limit(1);
  console.log("Sales Order:", so);

  if (so && so.length > 0) {
    const id = so[0].id;
    const legacy = so[0].legacy_id;

    const { data: entries } = await supabase.from('financial_entries').select('id, origin_id, origin_type').in('origin_id', [id, legacy]).eq('origin_type', 'sales_order');
    console.log("Financial Entries:", entries);

    const { data: loadings } = await supabase.from('ops_loadings').select('id, legacy_id, sales_order_id, raw_payload').in('sales_order_id', [id, legacy]).limit(3);
    console.log("Loadings by sales_order_id:", loadings.length);

    // Check if salesOrderId exists in raw_payload
    const { data: loadingsPayload } = await supabase.from('ops_loadings').select('id, legacy_id, sales_order_id, raw_payload').limit(10);
    const related = loadingsPayload?.filter(l => l.raw_payload?.salesOrderId === id || l.raw_payload?.salesOrderId === legacy);
    console.log("Loadings by raw_payload:", related?.length);
  }
}
check();
