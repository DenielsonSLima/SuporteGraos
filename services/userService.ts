
import { ModuleId } from '../types';
import { Persistence } from './persistence';
import { logService } from './logService';
import { authService } from './authService';
import { MENU_ITEMS, SUBMODULES } from '../constants';
import { getSupabaseSession, supabase, supabaseAnonKey, supabaseUrl } from './supabase';

export interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  cpf: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  permissions: string[]; // Alterado para string[] para suportar submódulos (ex: 'financial.payables')
  password?: string; 
  recoveryToken?: string; 
  allowRecovery: boolean; // Flag individual para permitir recuperação via token
}

// Gera todas as permissões possíveis (Módulos Pai + Submódulos Filhos)
const getAllPermissions = () => {
  const parentIds = MENU_ITEMS.map(i => i.id);
  const childIds = Object.values(SUBMODULES).flat().map(s => s.id);
  return [...parentIds, ...childIds];
};

const INITIAL_USERS: UserData[] = [
  {
    id: '1',
    firstName: 'Administrador',
    lastName: 'Sistema',
    cpf: '000.000.000-00',
    email: 'admin',
    phone: '(66) 99999-9999',
    role: 'Administrador',
    active: true,
    allowRecovery: true, // Habilitado por padrão para o Admin
    password: '123', 
    permissions: getAllPermissions() // Acesso Total Granular
  }
];

const db = new Persistence<UserData>('users', INITIAL_USERS);

const getLogInfo = () => {
  const user = authService.getCurrentUser();
  return {
    userId: user?.id || 'system',
    userName: user?.name || 'Sistema'
  };
};

/**
 * Helper para invocar a função centralizada do Supabase
 * Tenta chamar com a função separada primeiro, depois tenta com a centralizada
 */
const invokeAdminFunction = async (functionName: string, action: string, payload: any, session: any) => {
  const centralFunctionName = 'manage-users';
  const safePayload = payload && typeof payload === 'object' ? payload : {};
  const headers = {
    Authorization: `Bearer ${session.access_token}`,
    apikey: supabaseAnonKey,
    'Content-Type': 'application/json'
  };

  const callCentral = async () => {
    const response = await fetch(`${supabaseUrl}/functions/v1/${centralFunctionName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, ...safePayload })
    });

    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return { data, error: response.ok ? null : { message: data?.error || 'Erro na Edge Function' } };
    } catch {
      return { data: null, error: { message: text || 'Resposta invalida da Edge Function' } };
    }
  };

  try {
    console.log(`[ADMIN] Tentando função centralizada: ${centralFunctionName}`);
    const centralResult = await callCentral();
    if (!centralResult.error && centralResult.data?.success) {
      console.log(`[ADMIN] ✅ Sucesso com função centralizada`);
      return { data: centralResult.data, error: null };
    }

    console.log(`[ADMIN] Função centralizada falhou, tentando função separada: ${functionName}`);
    const { data, error } = await supabase.functions.invoke(functionName, {
      headers,
      throwOnError: false,
      body: safePayload,
      method: 'POST'
    });

    if (!error && data?.success) {
      console.log(`[ADMIN] ✅ Sucesso com função separada: ${functionName}`);
      return { data, error: null };
    }

    return { data, error: error || centralResult.error };
  } catch (err) {
    console.error(`[ADMIN] Erro ao invocar função:`, err);
    return { data: null, error: err };
  }
};

const extractEdgeFunctionError = async (error: any): Promise<string> => {
  if (!error) {
    return 'Falha ao executar Edge Function.';
  }

  const fallbackMessage = typeof error === 'string'
    ? error
    : error?.message || 'Falha ao executar Edge Function.';

  const bodyContent = error?.context?.body;
  if (typeof bodyContent === 'string' && bodyContent.trim().length > 0) {
    try {
      const parsed = JSON.parse(bodyContent);
      if (parsed?.error) return parsed.error;
      if (parsed?.message) return parsed.message;
      return bodyContent;
    } catch {
      return bodyContent;
    }
  }

  const response = error?.context?.response as Response | undefined;
  if (!response) {
    return fallbackMessage;
  }

  try {
    const clone = response.clone();
    const text = await clone.text();

    if (text) {
      try {
        const json = JSON.parse(text);
        if (typeof json?.error === 'string') {
          return json.error;
        }
        if (typeof json?.message === 'string') {
          return json.message;
        }
        return text;
      } catch {
        return text;
      }
    }
  } catch (parseError) {
    console.error('[USER] Falha ao interpretar erro da Edge Function:', parseError);
  }

  return fallbackMessage;
};

export const userService = {
  getAll: async () => {
    try {
      const session = await getSupabaseSession();
      if (!session?.access_token) {
        console.warn('[USER] Sem sessão, retornando usuários locais');
        return db.getAll();
      }

      console.log('[USER] Listando usuários via Supabase Auth...');
      const { data, error } = await invokeAdminFunction('list-users', 'list', {}, session);

      if (error || !data?.success) {
        console.error('❌ Erro ao listar usuários (Auth):', error?.message || data?.error);
        console.warn('[USER] Retornando usuários locais como fallback');
        return db.getAll();
      }

      console.log(`✅ ${(data.users || []).length} usuários carregados do Supabase Auth`);

      const usersFromAuth = (data.users || []).map((u: any) => {
        const metadata = u.user_metadata || {};
        const firstName = metadata.first_name || u.first_name || (u.email ? u.email.split('@')[0] : 'Usuario');
        const lastName = metadata.last_name || u.last_name || '';
        const permissions = Array.isArray(metadata.permissions)
          ? metadata.permissions
          : (Array.isArray(u.permissions) ? u.permissions : []);

        return {
          id: u.id,
          firstName,
          lastName,
          cpf: metadata.cpf || u.cpf || '',
          email: u.email || '',
          phone: metadata.phone || u.phone || '',
          role: metadata.role || u.role || 'Operador',
          active: metadata.active !== undefined ? !!metadata.active : (u.active !== undefined ? !!u.active : true),
          permissions,
          allowRecovery: metadata.allow_recovery !== undefined
            ? !!metadata.allow_recovery
            : (u.allow_recovery !== undefined ? !!u.allow_recovery : true)
        } as UserData;
      });

      return usersFromAuth;
    } catch (error) {
      console.error('❌ Erro ao buscar usuários:', error);
      console.warn('[USER] Retornando usuários locais como fallback');
      return db.getAll();
    }
  },
  getById: (id: string) => db.getById(id),
  getByEmail: (email: string) => db.getAll().find(u => u.email === email),

  // Valida o token mas também verifica se o usuário tem permissão de usá-lo
  getByRecoveryToken: (token: string): UserData | undefined => {
    const user = db.getAll().find(u => u.recoveryToken === token);
    
    if (user && !user.allowRecovery) {
        // Se achou o usuário mas ele não tem permissão, retorna undefined como se o token fosse inválido
        return undefined;
    }
    return user;
  },

  add: async (user: UserData, generatePassword: boolean = true) => {
    try {
      if (!generatePassword && !user.password) {
        throw new Error('Senha obrigatoria quando a geracao automatica esta desativada.');
      }
      const session = await getSupabaseSession();
      console.log('[USER] Sessao Supabase:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        userId: session?.user?.id,
        email: session?.user?.email
      });
      if (!session?.access_token) {
        throw new Error('Sessao invalida. Faca login novamente.');
      }
      console.log('🔐 Criando usuario via Edge Function (auth.users)...');

      const { data, error } = await invokeAdminFunction('create-user', 'create', {
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

      console.log('[USER] Resposta Edge Function:', {
        hasError: !!error,
        errorMessage: error?.message,
        data
      });

      const detailedMessageFromFunction = data?.error || data?.message;

      if (error || !data?.success) {
        const detailedMessage = detailedMessageFromFunction || (await extractEdgeFunctionError(error));
        console.error('❌ Erro ao criar usuario:', detailedMessage, error);
        throw new Error(detailedMessage || 'Erro ao criar usuario');
      }

      console.log('✅ Usuario criado em auth.users:', data.user_id);
      if (data.generated_password) {
        console.log('🔑 Senha temporaria gerada:', data.generated_password);
      }

      // Também salvar no localStorage para compatibilidade
      db.add(user);

      const { userId, userName } = getLogInfo();
      logService.addLog({
        userId,
        userName,
        action: 'create',
        module: 'Configurações',
        description: `Cadastrou novo usuário: ${user.firstName} ${user.lastName} (${user.email}) ${generatePassword ? 'com senha gerada automaticamente' : 'com senha definida'}`,
        entityId: user.id
      });

      return {
        userId: data.user_id,
        generatedPassword: data.generated_password
      };
    } catch (error: any) {
      const detailedMessage = await extractEdgeFunctionError(error);
      console.error('❌ Erro ao adicionar usuário:', detailedMessage, error);
      throw new Error(detailedMessage || error?.message || 'Erro ao adicionar usuário');
    }
  },

  update: async (user: UserData) => {
    try {
      const session = await getSupabaseSession();
      if (!session?.access_token) {
        throw new Error('Sessao invalida. Faca login novamente.');
      }

      const { data, error } = await invokeAdminFunction('update-user', 'update', {
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

      if (error || !data?.success) {
        const detailedMessage = data?.error
          || (error ? await extractEdgeFunctionError(error) : 'Erro ao atualizar usuario');
        if (error) {
          console.error('❌ Contexto erro update-user:', error);
        }
        throw new Error(detailedMessage);
      }

      db.update(user);
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
      const detailedMessage = await extractEdgeFunctionError(error);
      console.error('❌ Erro ao atualizar usuário:', detailedMessage, error);
      throw new Error(detailedMessage || error?.message || 'Erro ao atualizar usuário');
    }
  },

  delete: async (id: string) => {
    try {
      const u = db.getById(id);
      console.log('🗑️ Deletando usuário do Supabase Auth...');

      const session = await getSupabaseSession();
      if (!session?.access_token) {
        throw new Error('Sessao invalida. Faca login novamente.');
      }

      const { data, error } = await invokeAdminFunction('delete-user', 'delete', {
        userId: id
      }, session);

      if (error || !data?.success) {
        const detailedMessage = data?.error
          || (error ? await extractEdgeFunctionError(error) : 'Erro ao deletar usuario no Supabase Auth');
        if (error) {
          console.error('❌ Contexto erro delete-user:', error);
        }
        console.error('❌ Erro ao deletar do Supabase Auth:', detailedMessage);
        throw new Error(detailedMessage);
      }

      console.log('✅ Usuário deletado do Supabase Auth');
      db.delete(id);

      const { userId, userName } = getLogInfo();
      logService.addLog({
        userId,
        userName,
        action: 'delete',
        module: 'Configurações',
        description: `Excluiu usuário: ${u?.firstName || 'Desconhecido'}`,
        entityId: id
      });
    } catch (error: any) {
      const detailedMessage = await extractEdgeFunctionError(error);
      console.error('❌ Erro ao deletar usuário:', detailedMessage, error);
      throw new Error(detailedMessage || error?.message || 'Erro ao deletar usuário');
    }
  },

  // --- MÉTODOS DE SEGURANÇA E TOKEN ---

  generateRecoveryToken: (userId: string): string => {
    const user = db.getById(userId);
    if (!user) throw new Error('Usuário não encontrado');
    
    if (!user.allowRecovery) {
        throw new Error('Este usuário não tem permissão para recuperação de senha via token. Ative a opção nas configurações.');
    }

    // Gera um token curto e legível (Ex: AB12-CD34)
    const token = Math.random().toString(36).substr(2, 4).toUpperCase() + '-' + 
                  Math.random().toString(36).substr(2, 4).toUpperCase();
    
    db.update({ ...user, recoveryToken: token });

    // LOG DE GERAÇÃO
    const { userId: adminId, userName } = getLogInfo();
    logService.addLog({
      userId: adminId,
      userName,
      action: 'update',
      module: 'Segurança',
      description: `Gerou token de recuperação para o usuário: ${user.firstName} ${user.lastName}`,
      entityId: userId
    });

    return token;
  },

  resetPasswordWithToken: (token: string, newPassword: string): boolean => {
    const users = db.getAll();
    const user = users.find(u => u.recoveryToken === token);

    // Verificação dupla: Token existe E usuário tem permissão
    if (!user || !user.allowRecovery) return false;

    // Atualiza senha e remove o token (uso único)
    db.update({ 
      ...user, 
      password: newPassword, 
      recoveryToken: undefined 
    });

    // LOG DE REDEFINIÇÃO
    // Como o usuário ainda não está logado (está na tela de login), usamos o ID do usuário recuperado
    logService.addLog({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      action: 'update',
      module: 'Segurança',
      description: `Senha redefinida com sucesso via Token de Recuperação.`,
      entityId: user.id
    });

    return true;
  }
};
