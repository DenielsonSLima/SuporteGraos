import { Persistence } from './persistence';
import { authService } from './authService';
import { logService } from './logService';
import { getSupabaseSession, supabaseAnonKey, supabaseUrl } from './supabase';

export interface UserData {
  id: string;
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

const db = new Persistence<UserData>('users', []);

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return {
    userId: user?.id || 'system',
    userName: user?.name || 'Sistema'
  };
};

/**
 * Helper para invocar a função centralizada do Supabase 'manage-users'
 */
const invokeAdminFunction = async (action: string, payload: any, session: any) => {
  const functionName = 'manage-users';
  const headers = {
    Authorization: `Bearer ${session.access_token}`,
    apikey: supabaseAnonKey,
    'Content-Type': 'application/json'
  };

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, ...payload })
    });

    const text = await response.text();
    try {
      const data = JSON.parse(text);
      if (!response.ok || !data.success) {
        return { data: null, error: { message: data?.error || data?.message || `Erro ${response.status} na Edge Function` } };
      }
      return { data, error: null };
    } catch {
      return { data: null, error: { message: text || 'Resposta inválida da Edge Function' } };
    }
  } catch (err: any) {
    console.error(`[USER_SERVICE] Erro ao invocar função ${functionName}:`, err);
    return { data: null, error: { message: err.message || 'Erro de conexão com o servidor' } };
  }
};

export const userService = {
  getAll: async () => {
    try {
      const session = await getSupabaseSession();
      if (!session?.access_token) {
        throw new Error('Sessão inválida. Faça login novamente.');
      }

      console.log('[USER_SERVICE] Listando usuários...');
      const { data, error } = await invokeAdminFunction('list', {}, session);

      if (error) {
        throw new Error(error.message);
      }

      return (data.users || []).map((u: any) => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        cpf: u.cpf || '',
        email: u.email || '',
        phone: u.phone || '',
        role: u.role || 'Operador',
        active: !!u.active,
        permissions: Array.isArray(u.permissions) ? u.permissions : [],
        allowRecovery: !!u.allow_recovery
      } as UserData));
    } catch (error: any) {
      console.error('❌ Erro ao buscar usuários:', error);
      throw error;
    }
  },

  add: async (user: UserData, generatePassword: boolean = true) => {
    try {
      const session = await getSupabaseSession();
      if (!session?.access_token) {
        throw new Error('Sessão inválida. Faça login novamente.');
      }

      const { data, error } = await invokeAdminFunction('create', {
        firstName: user.firstName,
        lastName: user.lastName,
        cpf: user.cpf,
        email: user.email,
        phone: user.phone,
        role: user.role,
        permissions: user.permissions,
        active: user.active,
        allowRecovery: user.allowRecovery,
        generatePassword,
        password: user.password || null
      }, session);

      if (error) {
        throw new Error(error.message);
      }

      const { userId, userName } = getLogInfo();
      logService.addLog({
        userId,
        userName,
        action: 'create',
        module: 'Configurações',
        description: `Cadastrou novo usuário: ${user.firstName} ${user.lastName} (${user.email})`,
        entityId: data.user_id
      });

      return {
        userId: data.user_id,
        generatedPassword: data.generated_password
      };
    } catch (error: any) {
      console.error('❌ Erro ao adicionar usuário:', error);
      throw error;
    }
  },

  update: async (user: UserData) => {
    try {
      const session = await getSupabaseSession();
      if (!session?.access_token) {
        throw new Error('Sessão inválida. Faça login novamente.');
      }

      const { error } = await invokeAdminFunction('update', {
        userId: user.id,
        email: user.email,
        password: user.password || null,
        firstName: user.firstName,
        lastName: user.lastName,
        cpf: user.cpf,
        phone: user.phone,
        role: user.role,
        permissions: user.permissions,
        active: user.active,
        allowRecovery: user.allowRecovery
      }, session);

      if (error) {
        throw new Error(error.message);
      }

      const { userId, userName } = getLogInfo();
      logService.addLog({
        userId,
        userName,
        action: 'update',
        module: 'Configurações',
        description: `Atualizou cadastro do usuário: ${user.firstName} ${user.lastName}`,
        entityId: user.id
      });
    } catch (error: any) {
      console.error('❌ Erro ao atualizar usuário:', error);
      throw error;
    }
  },

  /**
   * Inativa um usuário (muda status para active: false)
   */
  inactivate: async (id: string) => {
    try {
      const session = await getSupabaseSession();
      if (!session?.access_token) {
        throw new Error('Sessão inválida. Faça login novamente.');
      }

      const { error } = await invokeAdminFunction('update', {
        userId: id,
        active: false
      }, session);

      if (error) {
        throw new Error(error.message);
      }

      const { userId, userName } = getLogInfo();
      logService.addLog({
        userId,
        userName,
        action: 'update',
        module: 'Configurações',
        description: `Inativou usuário ID: ${id}`,
        entityId: id
      });
    } catch (error: any) {
      console.error('❌ Erro ao inativar usuário:', error);
      throw error;
    }
  },

  /**
   * Exclui definitivamente um usuário do Supabase Auth
   */
  delete: async (id: string) => {
    try {
      const session = await getSupabaseSession();
      if (!session?.access_token) {
        throw new Error('Sessão inválida. Faça login novamente.');
      }

      const { error } = await invokeAdminFunction('delete', {
        userId: id
      }, session);

      if (error) {
        throw new Error(error.message);
      }

      const { userId, userName } = getLogInfo();
      logService.addLog({
        userId,
        userName,
        action: 'delete',
        module: 'Configurações',
        description: `Excluiu definitivamente o usuário ID: ${id}`,
        entityId: id
      });
    } catch (error: any) {
      console.error('❌ Erro ao excluir usuário:', error);
      throw error;
    }
  },

  getById: (id: string) => db.getById(id),
  getByEmail: (email: string) => db.getAll().find(u => u.email === email),

  // Valida o token mas também verifica se o usuário tem permissão de usá-lo
  getByRecoveryToken: (token: string): UserData | undefined => {
    const user = db.getAll().find(u => u.recoveryToken === token);

    if (user && !user.allowRecovery) {
      return undefined;
    }
    return user;
  },

  // --- MÉTODOS DE SEGURANÇA E TOKEN ---

  generateRecoveryToken: (userId: string): string => {
    // Busca na lista local (db) ou tenta buscar pelo ID se necessário
    // Para simplificar e manter compatibilidade com o que existia:
    const user = db.getById(userId);
    if (!user) throw new Error('Usuário não encontrado localmente para gerar token');

    if (!user.allowRecovery) {
      throw new Error('Este usuário não tem permissão para recuperação de senha via token.');
    }

    const token = Math.random().toString(36).substr(2, 4).toUpperCase() + '-' +
      Math.random().toString(36).substr(2, 4).toUpperCase();

    db.update({ ...user, recoveryToken: token });

    const { userId: adminId, userName } = getLogInfo();
    logService.addLog({
      userId: adminId,
      userName,
      action: 'update',
      module: 'Segurança',
      description: `Gerou token de recuperação para o usuário: ${user.firstName}`,
      entityId: userId
    });

    return token;
  },

  resetPasswordWithToken: (token: string, newPassword: string): boolean => {
    const users = db.getAll();
    const user = users.find(u => u.recoveryToken === token);

    if (!user || !user.allowRecovery) return false;

    db.update({
      ...user,
      password: newPassword,
      recoveryToken: undefined
    });

    logService.addLog({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      action: 'update',
      module: 'Segurança',
      description: `Senha redefinida com sucesso via Token de Recuperação.`,
      entityId: user.id
    });

    return true;
  },

  /**
   * Mantido para compatibilidade, aponta para inactivate
   * @deprecated Use inactivate() ou delete()
   */
  deleteLegacy: async (id: string) => {
    return userService.inactivate(id);
  }
};
