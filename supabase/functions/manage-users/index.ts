/**
 * Edge Function: manage-users
 *
 * Responsabilidade: operações que exigem auth.admin (criar, atualizar, excluir).
 * A LISTAGEM é feita diretamente pelo frontend via supabase-js + RLS — sem passar por aqui.
 *
 * Ações: create | update | delete
 *
 * Padrão canônico Supabase:
 *  - userClient (ANON_KEY + JWT) → identifica o chamador
 *  - adminClient (SERVICE_ROLE)  → operações privilegiadas
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── HEADERS CORS ─────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─── HELPERS DE RESPOSTA ──────────────────────────────────────────────────────

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });

const fail = (message: string, status = 400) =>
  respond({ success: false, error: message }, status);

// ─── NORMALIZAR ROLE ──────────────────────────────────────────────────────────

function normalizeRole(role?: string): 'admin' | 'manager' | 'user' {
  const r = (role ?? '').toLowerCase().trim();
  if (['admin', 'administrator', 'administrador'].includes(r)) return 'admin';
  if (['manager', 'gerente'].includes(r)) return 'manager';
  return 'user';
}

// ─── HANDLER PRINCIPAL ────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return fail('Método não permitido', 405);
  }

  // 1. Ler body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail('Body inválido — esperado JSON');
  }

  const action = (body.action as string | undefined)?.trim();
  if (!action) {
    return fail('Campo "action" ausente');
  }

  // 2. Env vars
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    return fail('Variáveis de ambiente não configuradas', 500);
  }

  // 3. Validar o JWT do chamador
  //    Padrão oficial Supabase: createClient com ANON_KEY + Authorization header
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return fail('Authorization header ausente ou inválido', 401);
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: { user: caller }, error: callerErr } = await userClient.auth.getUser();
  if (callerErr || !caller) {
    return fail(`Token inválido: ${callerErr?.message ?? 'sem usuário'}`, 401);
  }

  // 4. Buscar perfil do chamador em app_users (dados sempre frescos, nunca do JWT)
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: profile, error: profileErr } = await adminClient
    .from('app_users')
    .select('company_id, role, active')
    .eq('auth_user_id', caller.id)
    .single();

  if (profileErr || !profile) {
    return fail(`Perfil não encontrado (uid=${caller.id})`, 403);
  }

  if (!profile.active) {
    return fail('Usuário inativo', 403);
  }

  const companyId = profile.company_id as string;
  const callerRole = (profile.role as string ?? '').toLowerCase();
  const isAdmin = ['admin', 'administrator', 'administrador'].includes(callerRole);

  if (!companyId) {
    return fail('Usuário sem empresa vinculada', 403);
  }

  // create / update / delete exigem admin
  if (['create', 'update', 'delete'].includes(action) && !isAdmin) {
    return fail('Apenas administradores podem gerenciar usuários', 403);
  }

  // 5. Executar a ação solicitada
  try {

    // ────────────────────────────────────────────────────────────── CREATE ───
    if (action === 'create') {
      const {
        firstName, lastName, cpf, email, phone,
        role, permissions, active, allowRecovery,
        password, generatePassword,
      } = body as any;

      if (!firstName || !lastName || !email) {
        return fail('Campos obrigatórios: firstName, lastName, email');
      }

      // Gerar senha temporária simples (6 dígitos) ou usar a fornecida
      const finalPassword: string = generatePassword
        ? Math.floor(100000 + Math.random() * 900000).toString()
        : (password as string | undefined) ?? '';

      if (!finalPassword) {
        return fail('Senha é obrigatória quando generatePassword=false');
      }

      const roleNorm = normalizeRole(role);

      // a) Criar no Supabase Auth
      const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
        email: (email as string).toLowerCase().trim(),
        password: finalPassword,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          cpf: cpf ?? '',
          phone: phone ?? '',
          role: roleNorm,
          company_id: companyId,
          permissions: permissions ?? [],
          active: active !== false,
          allow_recovery: allowRecovery !== false,
          must_change_password: true,
        },
      });

      if (authErr) {
        const already = authErr.message?.toLowerCase().includes('already');
        return fail(
          already ? 'Este e-mail já está em uso' : `Erro no Auth: ${authErr.message}`,
          already ? 409 : 400,
        );
      }

      // b) Inserir em app_users (com upsert para não conflitar com o Trigger nativo)
      const { error: insertErr } = await adminClient.from('app_users').upsert({
        auth_user_id: authData.user.id,
        company_id: companyId,
        first_name: firstName,
        last_name: lastName,
        cpf: cpf ?? null,
        email: (email as string).toLowerCase().trim(),
        phone: phone ?? null,
        role: roleNorm,
        active: active !== false,
        permissions: permissions ?? [],
        allow_recovery: allowRecovery !== false,
        must_change_password: true, // Mantendo sincronizado
      }, { onConflict: 'auth_user_id' });

      if (insertErr) {
        // Rollback
        await adminClient.auth.admin.deleteUser(authData.user.id);
        return fail(`Erro ao salvar perfil: ${insertErr.message}`, 500);
      }

      return respond({
        success: true,
        userId: authData.user.id,
        generatedPassword: generatePassword ? finalPassword : undefined,
      });
    }

    // ────────────────────────────────────────────────────────────── UPDATE ───
    if (action === 'update') {
      const { userId, firstName, lastName, cpf, phone, role, permissions, active, allowRecovery } = body as any;

      if (!userId) return fail('userId é obrigatório');

      const roleNorm = role !== undefined ? normalizeRole(role) : undefined;

      // Atualizar Auth metadata
      const metaUpdate: Record<string, unknown> = {};
      if (firstName !== undefined) metaUpdate.first_name = firstName;
      if (lastName !== undefined) metaUpdate.last_name = lastName;
      if (cpf !== undefined) metaUpdate.cpf = cpf;
      if (phone !== undefined) metaUpdate.phone = phone;
      if (roleNorm !== undefined) metaUpdate.role = roleNorm;
      if (permissions !== undefined) metaUpdate.permissions = permissions;
      if (active !== undefined) metaUpdate.active = active;
      if (allowRecovery !== undefined) metaUpdate.allow_recovery = allowRecovery;

      const { error: authErr } = await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: metaUpdate,
      });
      if (authErr) return fail(`Erro ao atualizar Auth: ${authErr.message}`);

      // Atualizar app_users
      const updates: Record<string, unknown> = {};
      if (firstName !== undefined) updates.first_name = firstName;
      if (lastName !== undefined) updates.last_name = lastName;
      if (cpf !== undefined) updates.cpf = cpf;
      if (phone !== undefined) updates.phone = phone;
      if (roleNorm !== undefined) updates.role = roleNorm;
      if (permissions !== undefined) updates.permissions = permissions;
      if (active !== undefined) updates.active = active;
      if (allowRecovery !== undefined) updates.allow_recovery = allowRecovery;

      const { error: updateErr } = await adminClient
        .from('app_users')
        .update(updates)
        .eq('auth_user_id', userId);

      if (updateErr) return fail(`Erro ao atualizar perfil: ${updateErr.message}`);

      return respond({ success: true });
    }

    // ────────────────────────────────────────────────────────────── DELETE ───
    if (action === 'delete') {
      const { userId } = body as any;
      if (!userId) return fail('userId é obrigatório');

      // Deletar do Auth — CASCADE remove automaticamente de app_users
      const { error: authErr } = await adminClient.auth.admin.deleteUser(userId);
      if (authErr) return fail(`Erro ao excluir: ${authErr.message}`);

      return respond({ success: true });
    }

    return fail(`Ação desconhecida: "${action}"`);

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[manage-users] erro interno:', msg);
    return fail(`Erro interno: ${msg}`, 500);
  }
});
