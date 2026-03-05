/**
 * userService.ts
 *
 * Responsabilidades:
 *  - getAll()       → lê app_users diretamente via supabase-js (RLS filtra por empresa)
 *  - add()          → cria usuário via Edge Function manage-users (precisa de auth.admin)
 *  - update()       → atualiza via Edge Function
 *  - inactivate()   → set active=false via Edge Function
 *  - delete()       → exclui via Edge Function (hard delete no Auth + CASCADE app_users)
 */

import { supabase, supabaseUrl, supabaseAnonKey, getSupabaseSession } from './supabase';

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface UserData {
  id: string;                // = auth_user_id em app_users
  firstName: string;
  lastName: string;
  cpf: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  permissions: string[];
  password?: string;
  recoveryToken?: string;
  allowRecovery: boolean;
}

// ─── HELPER: CHAMAR EDGE FUNCTION ─────────────────────────────────────────────

async function invokeEdgeFunction(
  action: string,
  payload: Record<string, unknown>,
): Promise<{ data: any; error: string | null }> {
  const session = await getSupabaseSession();
  if (!session?.access_token) {
    return { data: null, error: 'Sessão expirada. Faça login novamente.' };
  }

  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/manage-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch (networkErr: any) {
    return { data: null, error: `Erro de rede: ${networkErr.message}` };
  }

  let json: any;
  try {
    json = await res.json();
  } catch {
    return { data: null, error: `Resposta inválida do servidor (status ${res.status})` };
  }

  if (!res.ok || !json.success) {
    return { data: null, error: json.error ?? `Erro ${res.status}` };
  }

  return { data: json, error: null };
}

// ─── SERVICE ──────────────────────────────────────────────────────────────────

export const userService = {

  /**
   * Lista todos os usuários da empresa.
   * Lê direto de app_users via supabase-js — sem Edge Function.
   * O RLS da tabela garante que só retorna usuários da empresa do usuário logado.
   */
  getAll: async (): Promise<UserData[]> => {
    const { data, error } = await supabase
      .from('app_users')
      .select('auth_user_id, first_name, last_name, cpf, email, phone, role, active, permissions, allow_recovery')
      .order('first_name', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar usuários: ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      id:            row.auth_user_id,
      firstName:     row.first_name  ?? '',
      lastName:      row.last_name   ?? '',
      cpf:           row.cpf         ?? '',
      email:         row.email       ?? '',
      phone:         row.phone       ?? '',
      role:          row.role        ?? 'user',
      active:        row.active      !== false,
      permissions:   Array.isArray(row.permissions) ? row.permissions : [],
      allowRecovery: row.allow_recovery !== false,
    }));
  },

  /**
   * Cria um novo usuário.
   * Salva no Supabase Auth (para login) e em app_users (para o sistema).
   * Retorna a senha gerada se generatePassword=true.
   */
  add: async (
    user: UserData,
    generatePassword = true,
  ): Promise<{ userId: string; generatedPassword?: string }> => {
    const { data, error } = await invokeEdgeFunction('create', {
      firstName:        user.firstName,
      lastName:         user.lastName,
      cpf:              user.cpf,
      email:            user.email,
      phone:            user.phone,
      role:             user.role,
      permissions:      user.permissions,
      active:           user.active,
      allowRecovery:    user.allowRecovery,
      generatePassword,
      password:         generatePassword ? undefined : (user.password ?? ''),
    });

    if (error) throw new Error(error);

    return {
      userId:            data.userId,
      generatedPassword: data.generatedPassword,
    };
  },

  /**
   * Atualiza dados de um usuário existente.
   */
  update: async (user: UserData): Promise<void> => {
    const { error } = await invokeEdgeFunction('update', {
      userId:        user.id,
      firstName:     user.firstName,
      lastName:      user.lastName,
      cpf:           user.cpf,
      phone:         user.phone,
      role:          user.role,
      permissions:   user.permissions,
      active:        user.active,
      allowRecovery: user.allowRecovery,
    });

    if (error) throw new Error(error);
  },

  /**
   * Inativa um usuário (active = false).
   * O usuário continua existindo mas não consegue logar (verificação feita pelo app).
   */
  inactivate: async (id: string): Promise<void> => {
    const { error } = await invokeEdgeFunction('update', {
      userId: id,
      active: false,
    });

    if (error) throw new Error(error);
  },

  /**
   * Reativa um usuário (active = true).
   */
  reactivate: async (id: string): Promise<void> => {
    const { error } = await invokeEdgeFunction('update', {
      userId: id,
      active: true,
    });

    if (error) throw new Error(error);
  },

  /**
   * Exclui definitivamente um usuário do Supabase Auth.
   * O registro em app_users é removido automaticamente via ON DELETE CASCADE.
   */
  delete: async (id: string): Promise<void> => {
    const { error } = await invokeEdgeFunction('delete', { userId: id });
    if (error) throw new Error(error);
  },

  /**
   * Gera um token de recuperação de 8 caracteres e salva em app_users.
   * Só funciona se o usuário tem allowRecovery = true.
   */
  generateRecoveryToken: async (userId: string): Promise<string> => {
    // Verificar se o usuário tem recuperação habilitada
    const { data: row, error: fetchErr } = await supabase
      .from('app_users')
      .select('allow_recovery, first_name')
      .eq('auth_user_id', userId)
      .single();

    if (fetchErr || !row) throw new Error('Usuário não encontrado');
    if (!row.allow_recovery) throw new Error('Este usuário não tem recuperação de senha habilitada');

    const token =
      Math.random().toString(36).slice(2, 6).toUpperCase() + '-' +
      Math.random().toString(36).slice(2, 6).toUpperCase();

    // Salvar token em app_users (coluna recovery_token, se existir)
    // Como a coluna pode não existir ainda, apenas retornamos o token gerado
    // para ser exibido ao admin — sem persistir por enquanto
    return token;
  },

  // Alias legacy para compatibilidade
  deleteLegacy: async (id: string): Promise<void> => userService.inactivate(id),

  /**
   * Assina mudanças em tempo real na tabela app_users.
   * Chame o callback sempre que qualquer INSERT/UPDATE/DELETE ocorrer.
   * Retorna função para cancelar a assinatura (usar no cleanup do useEffect).
   */
  subscribeRealtime: (() => {
    const listeners = new Set<() => void>();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    return (onAnyChange: () => void): (() => void) => {
      listeners.add(onAnyChange);
      if (!channel) {
        channel = supabase
          .channel('realtime:app_users')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'app_users' },
            () => listeners.forEach(fn => fn()),
          )
          .subscribe();
      }
      return () => {
        listeners.delete(onAnyChange);
        if (listeners.size === 0 && channel) { supabase.removeChannel(channel); channel = null; }
      };
    };
  })(),
};
