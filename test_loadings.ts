import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: so } = await supabase.from('ops_sales_orders').select('id, legacy_id, number').eq('number', 'PV-2026-836').limit(1);
  console.log("Sales Order:", so);
  if (so && so.length > 0) {
    const { data: loadings } = await supabase.from('ops_loadings').select('id, legacy_id, purchase_order_id, sales_order_id, raw_payload').eq('sales_order_id', so[0].id).limit(2);
    console.log("Loadings matched by DB sales_order_id:", loadings);
  }
}
check();
