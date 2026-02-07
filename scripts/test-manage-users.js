import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://vqhjbsiwzgxaozcedqcn.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_m8MBqafWFUIhbSmhatvDYw_NWrO_E8V';
const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;
const functionName = process.env.FUNCTION_NAME || 'manage-users';
const action = process.env.FUNCTION_ACTION || 'list';

if (!email || !password) {
  console.error('Missing TEST_EMAIL or TEST_PASSWORD env vars.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const run = async () => {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError || !authData?.session?.access_token) {
    console.error('AUTH_ERROR', authError?.message || authError);
    process.exit(1);
  }

  const token = authData.session.access_token;
  const { data, error } = await supabase.functions.invoke(functionName, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json'
    },
    body: { action },
    method: 'POST'
  });

  if (error) {
    console.error('FUNCTION_ERROR', error?.message || error);
  } else {
    console.log('FUNCTION_OK', JSON.stringify(data));
  }
};

await run();
