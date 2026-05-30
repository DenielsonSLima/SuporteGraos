import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: loans } = await supabase.from('loans').select('*').limit(5);
  console.log('loans', loans.map(l => l.id));
  const loanIds = loans.map(l => l.id);
  
  const { data: entries, error } = await supabase
    .from('financial_entries')
    .select(`
      origin_id,
      description,
      financial_transactions!entry_id (
        account_id
      )
    `)
    .in('origin_id', loanIds)
    .eq('origin_type', 'loan');
  console.log('entries', JSON.stringify(entries, null, 2));
  console.log('error', error);
}
run();
