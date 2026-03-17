
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vqhjbsiwzgxaozcedqcn.supabase.co';
const supabaseAnonKey = 'sb_publishable_m8MBqafWFUIhbSmhatvDYw_NWrO_E8V';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debug() {
  console.log('--- DEBUG CASHIER METRICS ---');
  
  // Try to get company_id first
  const { data: users, error: userError } = await supabase
    .from('app_users')
    .select('company_id')
    .limit(1);

  if (userError) {
    console.error('Error fetching company_id:', userError);
    return;
  }

  const companyId = users[0]?.company_id;
  console.log('Company ID:', companyId);

  // Call the operational details RPC
  const { data: opDetails, error: opError } = await supabase.rpc('rpc_get_cashier_operational_details', {
    p_company_id: companyId
  });

  if (opError) {
    console.error('Error calling RPC:', opError);
  } else {
    console.log('RPC Operational Details:', JSON.stringify(opDetails, null, 2));
  }

  // Debug financial_transactions for this month
  const startDate = new Date();
  startDate.setDate(1);
  startDate.setHours(0,0,0,0);

  const { data: txs, error: txError } = await supabase
    .from('financial_transactions')
    .select('id, type, amount, transaction_date, source_table, entry_id, description')
    .gte('transaction_date', startDate.toISOString().split('T')[0])
    .eq('company_id', companyId);

  if (txError) {
    console.error('Error fetching transactions:', txError);
  } else {
    console.log('\n--- TRANSACTIONS (Current Month) ---');
    console.table(txs.map(t => ({
      date: t.transaction_date,
      type: t.type,
      amount: t.amount,
      source: t.source_table,
      entry: t.entry_id,
      description: t.description?.substring(0, 30)
    })));

    const debits = txs.filter(t => ['debit', 'OUT', 'out', 'DEBIT'].includes(t.type));
    const totalOut = debits.reduce((acc, t) => acc + Number(t.amount), 0);
    const transfers = debits.filter(t => t.source_table === 'transfers').reduce((acc, t) => acc + Number(t.amount), 0);
    
    console.log('\nCalculated Total Out:', totalOut);
    console.log('Calculated Transfers:', transfers);
    console.log('Operational Out (Total - Transfers):', totalOut - transfers);
  }
}

debug();
