import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
const envs = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(envs.VITE_SUPABASE_URL, envs.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: so } = await supabase.from('ops_sales_orders').select('id, legacy_id, number').eq('number', 'PV-2026-836').limit(1);
  console.log("Sales Order:", so);
  if (so && so.length > 0) {
    const { data: fe } = await supabase.from('financial_entries').select('id, origin_id, origin_type, status, total_amount, paid_amount').eq('origin_type', 'sales_order').eq('origin_id', so[0].id);
    console.log("Financial Entries by ops id:", fe);

    if (so[0].legacy_id) {
        const { data: fe2 } = await supabase.from('financial_entries').select('id, origin_id, origin_type, status, total_amount, paid_amount').eq('origin_type', 'sales_order').eq('origin_id', so[0].legacy_id);
        console.log("Financial Entries by legacy id:", fe2);
    }
  }
}
check();
