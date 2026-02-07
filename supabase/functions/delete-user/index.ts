import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

type DeleteUserRequest = {
  userId: string;
};

type DeleteUserResponse = {
  success: boolean;
  error?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const jsonResponse = (status: number, body: DeleteUserResponse) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders
    }
  });
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { success: false, error: 'Method not allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { success: false, error: 'Missing Supabase env vars' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let payload: DeleteUserRequest;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { success: false, error: 'Invalid JSON body' });
  }

  if (!payload.userId) {
    return jsonResponse(400, { success: false, error: 'Missing userId' });
  }

  const { error } = await supabase.auth.admin.deleteUser(payload.userId);
  if (error) {
    return jsonResponse(400, { success: false, error: error.message || 'Failed to delete user' });
  }

  return jsonResponse(200, { success: true });
});
