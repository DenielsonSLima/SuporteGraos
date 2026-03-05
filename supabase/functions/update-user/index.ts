import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

type UpdateUserRequest = {
  userId: string;
  email?: string;
  password?: string | null;
  firstName?: string;
  lastName?: string;
  cpf?: string;
  phone?: string | null;
  role?: string;
  permissions?: string[];
  active?: boolean;
  allowRecovery?: boolean;
};

type UpdateUserResponse = {
  success: boolean;
  error?: string;
  error_details?: unknown;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const jsonResponse = (status: number, body: UpdateUserResponse) => {
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

  const findAuthUserByEmail = async (emailToCheck: string) => {
    let page = 1;
    const perPage = 100;

    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        return { error };
      }

      const users = data?.users || [];
      const match = users.find((user) => (user.email || '').toLowerCase() === emailToCheck);
      if (match) {
        return { user: match };
      }

      if (users.length < perPage) {
        break;
      }

      page += 1;
    }

    return { user: null };
  };

  let payload: UpdateUserRequest;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { success: false, error: 'Invalid JSON body' });
  }


  if (!payload.userId) {
    return jsonResponse(400, { success: false, error: 'Missing userId' });
  }

  const { data: existingUserData, error: existingUserError } = await supabase.auth.admin.getUserById(payload.userId);
  if (existingUserError || !existingUserData?.user) {
    return jsonResponse(404, { success: false, error: 'Usuário não encontrado no Supabase Auth.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let normalizedEmail: string | undefined;
  if (typeof payload.email === 'string') {
    normalizedEmail = payload.email.trim().toLowerCase();
    if (normalizedEmail) {
      if (!emailRegex.test(normalizedEmail)) {
        return jsonResponse(400, { success: false, error: 'E-mail inválido. Informe um endereço completo (ex: usuario@empresa.com).' });
      }

      const currentEmail = existingUserData.user.email?.toLowerCase();
      if (currentEmail !== normalizedEmail) {
        const { user: duplicateUser, error: duplicateCheckError } = await findAuthUserByEmail(normalizedEmail);
        if (duplicateCheckError) {
          return jsonResponse(400, { success: false, error: 'Não foi possível validar o e-mail. Tente novamente em instantes.' });
        }

        if (duplicateUser) {
          return jsonResponse(409, { success: false, error: 'Já existe um usuário cadastrado com este e-mail.' });
        }
      }
    }
  }

  const userMetadata: Record<string, unknown> = {};
  if (payload.firstName !== undefined) userMetadata.first_name = payload.firstName;
  if (payload.lastName !== undefined) userMetadata.last_name = payload.lastName;
  if (payload.cpf !== undefined) userMetadata.cpf = payload.cpf;
  if (payload.phone !== undefined) userMetadata.phone = payload.phone;
  if (payload.role !== undefined) userMetadata.role = payload.role;
  if (payload.permissions !== undefined) userMetadata.permissions = payload.permissions;
  if (payload.active !== undefined) userMetadata.active = payload.active;
  if (payload.allowRecovery !== undefined) userMetadata.allow_recovery = payload.allowRecovery;

  const updatePayload: Record<string, unknown> = {
    user_metadata: userMetadata
  };

  if (normalizedEmail) {
    updatePayload.email = normalizedEmail;
  }

  if (payload.password && payload.password.trim().length > 0) {
    updatePayload.password = payload.password;
  }


  const { error } = await supabase.auth.admin.updateUserById(payload.userId, updatePayload);
  if (error) {
    return jsonResponse(400, { success: false, error: error.message || 'Failed to update user', error_details: error });
  }

  return jsonResponse(200, { success: true });
});
