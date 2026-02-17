import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const jsonResponse = (body: any, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
};

const readJsonBody = async (req: Request) => {
  const rawBody = await req.text();
  if (!rawBody) {
    return { error: 'Missing body' };
  }
  try {
    const payload = JSON.parse(rawBody);
    return { payload };
  } catch (e) {
    console.error('❌ Invalid JSON:', e);
    return { error: 'Invalid JSON' };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing env vars:', { hasUrl: !!supabaseUrl, hasKey: !!serviceRoleKey });
    return jsonResponse({ success: false, error: 'Missing env vars' }, 500);
  }

  // 1. Verificar Autorização do Chamador
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ success: false, error: 'Authorization header missing' }, 401);
  }

  const userClient = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } }
  });

  // Extrair o JWT (remover 'Bearer ')
  const token = authHeader.replace('Bearer ', '');
  const { data: { user: caller }, error: authError } = await userClient.auth.getUser(token);

  if (authError || !caller) {
    console.error('❌ AUTH ERROR:', authError);
    return jsonResponse({ success: false, error: 'Unauthorized: Invalid token' }, 401);
  }

  // Verificar se o chamador é administrativo e está ativo
  const callerMetadata = caller.user_metadata || {};
  const callerCompanyId = callerMetadata.company_id;
  const isCallerAdmin = callerMetadata.role === 'Admin';
  const isCallerActive = callerMetadata.active !== false;

  if (!isCallerActive) {
    return jsonResponse({ success: false, error: 'Chamador está inativo' }, 403);
  }

  if (!isCallerAdmin) {
    return jsonResponse({ success: false, error: 'Permissão negada: Apenas administradores podem gerenciar usuários' }, 403);
  }

  if (!callerCompanyId) {
    return jsonResponse({ success: false, error: 'Chamador sem empresa vinculada' }, 403);
  }

  const { payload, error: bodyError } = await readJsonBody(req);
  if (bodyError) {
    return jsonResponse({ success: false, error: bodyError }, 400);
  }

  const action = payload.action;
  if (!action) {
    console.error('❌ Missing action field in payload:', payload);
    return jsonResponse({ success: false, error: 'Missing action field' }, 400);
  }

  console.log('📢 manage-users invoked by:', { callerEmail: caller.email, companyId: callerCompanyId, action });

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // CREATE USER
    if (action === 'create') {
      const {
        firstName,
        lastName,
        cpf,
        email,
        phone,
        role,
        permissions,
        active,
        allowRecovery,
        password,
        generatePassword
      } = payload;

      if (!firstName || !lastName || !cpf || !email) {
        return jsonResponse({ success: false, error: 'Campos obrigatórios ausentes' }, 400);
      }

      const passwordToUse = generatePassword
        ? Math.random().toString(36).substr(2, 12)
        : password;

      if (!passwordToUse) {
        return jsonResponse({ success: false, error: 'Senha é obrigatória' }, 400);
      }

      const { data, error } = await supabase.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password: passwordToUse,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          cpf,
          phone,
          role: role || 'Operador',
          permissions: permissions || [],
          active: active !== undefined ? active : true,
          allow_recovery: allowRecovery !== undefined ? allowRecovery : true,
          company_id: callerCompanyId // 🔒 Vínculo forçado à empresa do chamador
        }
      });

      if (error) {
        if (error.message?.includes('already exists')) {
          return jsonResponse({ success: false, error: 'Este e-mail já está em uso.' }, 409);
        }
        return jsonResponse({ success: false, error: error.message }, 400);
      }

      return jsonResponse({
        success: true,
        user_id: data.user.id,
        email,
        generated_password: generatePassword ? passwordToUse : null
      });
    }

    // UPDATE USER
    if (action === 'update') {
      const {
        userId,
        firstName,
        lastName,
        cpf,
        email,
        phone,
        role,
        permissions,
        active,
        allowRecovery,
        password
      } = payload;

      if (!userId) {
        return jsonResponse({ success: false, error: 'userId ausente' }, 400);
      }

      // 1. Verificar se o usuário alvo pertence à mesma empresa
      const { data: targetUser, error: getError } = await supabase.auth.admin.getUserById(userId);
      if (getError || !targetUser?.user) {
        return jsonResponse({ success: false, error: 'Usuário não encontrado' }, 404);
      }

      if (targetUser.user.user_metadata?.company_id !== callerCompanyId) {
        return jsonResponse({ success: false, error: 'Acesso negado: Usuário pertence a outra empresa' }, 403);
      }

      const updateData: any = {
        user_metadata: { ...targetUser.user.user_metadata }
      };

      if (firstName) updateData.user_metadata.first_name = firstName;
      if (lastName) updateData.user_metadata.last_name = lastName;
      if (cpf) updateData.user_metadata.cpf = cpf;
      if (phone) updateData.user_metadata.phone = phone;
      if (role) updateData.user_metadata.role = role;
      if (permissions) updateData.user_metadata.permissions = permissions;
      if (active !== undefined) updateData.user_metadata.active = active;
      if (allowRecovery !== undefined) updateData.user_metadata.allow_recovery = allowRecovery;

      if (email) updateData.email = email.toLowerCase().trim();
      if (password) updateData.password = password;

      const { error } = await supabase.auth.admin.updateUserById(userId, updateData);

      if (error) {
        return jsonResponse({ success: false, error: error.message }, 400);
      }

      return jsonResponse({ success: true });
    }

    // DELETE USER
    if (action === 'delete') {
      const { userId } = payload;

      if (!userId) {
        return jsonResponse({ success: false, error: 'userId ausente' }, 400);
      }

      // 1. Verificar se o usuário alvo pertence à mesma empresa
      const { data: targetUser, error: getError } = await supabase.auth.admin.getUserById(userId);
      if (getError || !targetUser?.user) {
        return jsonResponse({ success: false, error: 'Usuário não encontrado' }, 404);
      }

      if (targetUser.user.user_metadata?.company_id !== callerCompanyId) {
        return jsonResponse({ success: false, error: 'Acesso negado: Usuário pertence a outra empresa' }, 403);
      }

      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) {
        return jsonResponse({ success: false, error: error.message }, 400);
      }

      return jsonResponse({ success: true });
    }

    // LIST USERS
    if (action === 'list') {
      let filteredUsers: any[] = [];
      let page = 1;
      const perPage = 100;

      while (true) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) {
          return jsonResponse({ success: false, error: error.message }, 400);
        }

        const users = (data?.users || [])
          .filter((u: any) => u.user_metadata?.company_id === callerCompanyId) // 🔒 Filtro por empresa
          .map((u: any) => ({
            id: u.id,
            email: u.email,
            phone: u.phone,
            first_name: u.user_metadata?.first_name || u.email?.split('@')[0],
            last_name: u.user_metadata?.last_name || '',
            cpf: u.user_metadata?.cpf || '',
            role: u.user_metadata?.role || 'Operador',
            permissions: u.user_metadata?.permissions || [],
            active: u.user_metadata?.active !== undefined ? u.user_metadata.active : true,
            allow_recovery: u.user_metadata?.allow_recovery !== undefined ? u.user_metadata.allow_recovery : true,
            last_sign_in_at: u.last_sign_in_at,
            created_at: u.created_at
          }));

        filteredUsers = [...filteredUsers, ...users];

        if (data?.users.length < perPage) break;
        page++;
      }

      return jsonResponse({ success: true, users: filteredUsers });
    }

    return jsonResponse({ success: false, error: 'Invalid action' }, 400);
  } catch (err) {
    console.error('❌ UNHANDLED ERROR in manage-users:', err);
    return jsonResponse({ success: false, error: err instanceof Error ? err.message : 'Internal server error' }, 500);
  }
});
