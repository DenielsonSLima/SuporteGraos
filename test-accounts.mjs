import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://vqhjbsiwzgxaozcedqcn.supabase.co', 'sb_publishable_m8MBqafWFUIhbSmhatvDYw_NWrO_E8V');

async function main() {
  const { data, error } = await supabase.from('accounts').select('*');
  if (error) {
    console.error('Error fetching accounts:', error);
  } else {
    console.log('Accounts:');
    data.forEach(a => {
      console.log(`ID: ${a.id} | Name: ${a.account_name} | Owner: ${a.owner} | Balance: ${a.balance} | Type: ${a.type} | Active: ${a.is_active}`);
    });
  }
}

main();
