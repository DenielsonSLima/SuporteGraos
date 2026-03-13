import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

const env = dotenv.parse(fs.readFileSync('.env.local'));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function inspect() {
  console.log("--- Inspecting Sales Order PV-2026-836 ---");
  const { data: so } = await supabase.from('ops_sales_orders').select('*').eq('number', 'PV-2026-836').maybeSingle();
  console.log("Sales Order (ops_sales_orders):", JSON.stringify(so, null, 2));

  if (so) {
    console.log("\n--- Inspecting Financial Entries ---");
    const { data: fe } = await supabase.from('financial_entries').select('*')
      .eq('origin_type', 'sales_order')
      .or(`origin_id.eq.${so.id},origin_id.eq.${so.legacy_id}`);
    console.log("Financial Entries:", JSON.stringify(fe, null, 2));

    if (fe && fe.length > 0) {
      console.log("\n--- Inspecting Financial Transactions for first Entry ---");
      const { data: txs } = await supabase.from('financial_transactions').select('*').eq('entry_id', fe[0].id);
      console.log("Transactions:", JSON.stringify(txs, null, 2));
    }

    console.log("\n--- Inspecting Loadings (ops_loadings) ---");
    const { data: loadings } = await supabase.from('ops_loadings').select('*')
      .or(`sales_order_id.eq.${so.id},sales_order_id.eq.${so.legacy_id}`);
    console.log("Loadings count:", loadings?.length);
    if (loadings && loadings.length > 0) {
       console.log("Sample Loading (first one):", JSON.stringify(loadings[0], null, 2));
    }
  }
}

inspect();
