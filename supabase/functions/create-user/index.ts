import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

type CreateUserRequest = {
  firstName: string;
  lastName: string;
  cpf: string;
  email: string;
  phone?: string | null;
  role?: string;
  permissions?: string[];
  active?: boolean;
  allowRecovery?: boolean;
  generatePassword?: boolean;
  password?: string | null;
};

type CreateUserResponse = {
  success: boolean;
  user_id?: string;
  email?: string;
  generated_password?: string | null;
  error?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const jsonResponse = (status: number, body: CreateUserResponse) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders
    }
  });
};

const generatePassword = (length: number) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};

serve(async (req) => {
  try {
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

    let payload: CreateUserRequest;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse(400, { success: false, error: 'Invalid JSON body' });
    }

    const {
      firstName,
      lastName,
      cpf,
      email,
      phone = null,
      role = 'Operador',
      permissions = [],
      active = true,
      allowRecovery = true,
      generatePassword: shouldGenerate = true,
      password
    } = payload;

    console.log('[EDGE][create-user] Payload recebido:', {
      hasFirstName: !!firstName,
      hasLastName: !!lastName,
      hasCpf: !!cpf,
      email,
      phone,
      role,
      permissionsCount: permissions?.length || 0,
      active,
      allowRecovery,
      shouldGenerate: shouldGenerate,
      passwordProvided: !!password
    });

    if (!firstName || !lastName || !cpf || !email) {
      return jsonResponse(400, { success: false, error: 'Missing required fields' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return jsonResponse(400, { success: false, error: 'E-mail inválido. Informe um endereço completo (ex: usuario@empresa.com).' });
    }

    if (!shouldGenerate && (!password || password.trim() === '')) {
      return jsonResponse(400, { success: false, error: 'Password required' });
    }

    const passwordToUse = shouldGenerate ? generatePassword(12) : password!.trim();

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

    const normalizedEmail = email.trim().toLowerCase();
    const { user: duplicateUser, error: duplicateCheckError } = await findAuthUserByEmail(normalizedEmail);
    if (duplicateCheckError) {
      console.error('[EDGE][create-user] Falha ao verificar duplicidade:', duplicateCheckError);
      return jsonResponse(400, { success: false, error: 'Não foi possível validar o e-mail. Tente novamente em instantes.' });
    }

    if (duplicateUser) {
      console.warn('[EDGE][create-user] E-mail duplicado:', normalizedEmail);
      return jsonResponse(409, { success: false, error: 'Já existe um usuário cadastrado com este e-mail.' });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: passwordToUse,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        cpf,
        phone,
        role,
        permissions,
        active,
        allow_recovery: allowRecovery
      }
    });

    if (authError || !authData?.user) {
      console.error('[EDGE][create-user] Erro Supabase Auth:', authError);
      return jsonResponse(400, {
        success: false,
        error: authError?.message || 'Failed to create auth user',
        error_details: authError || null
      });
    }

    return jsonResponse(200, {
      success: true,
      user_id: authData.user.id,
      email: normalizedEmail,
      generated_password: shouldGenerate ? passwordToUse : null
    });
  } catch (error) {
    console.error('[EDGE][create-user] Erro não tratado:', error);
    const message = error instanceof Error ? error.message : 'Erro interno inesperado ao criar usuário.';
    return jsonResponse(500, { success: false, error: message });
  }
});
