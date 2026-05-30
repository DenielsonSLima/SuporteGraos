const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase
    .from('financial_entries')
    .select(`
      origin_id,
      description,
      financial_transactions!entry_id (
        account_id
      )
    `)
    .eq('origin_type', 'loan')
    .limit(5);
  console.log(JSON.stringify({ data, error }, null, 2));
}
test();
