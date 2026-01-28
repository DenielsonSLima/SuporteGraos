
import { ModuleId } from '../types';
import { Persistence } from './persistence';
import { logService } from './logService';
import { authService } from './authService';
import { MENU_ITEMS, SUBMODULES } from '../constants';
import { supabase } from './supabase';

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

export const userService = {
  getAll: async () => {
    try {
      // Buscar do Supabase
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar usuários do Supabase:', error);
        // Fallback para localStorage
        return db.getAll();
      }

      // Mapear formato Supabase → UserData
      const supabaseUsers: UserData[] = data.map((u: any) => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        cpf: u.cpf,
        email: u.email,
        phone: u.phone,
        role: u.role,
        active: u.active,
        permissions: JSON.parse(u.permissions || '[]'),
        allowRecovery: u.allow_recovery
      }));

      return supabaseUsers;
    } catch (error) {
      console.error('❌ Erro ao buscar usuários:', error);
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
      console.log('🔐 Criando usuário no Supabase...');
      
      // Criar no Supabase com opção de gerar senha automática ou manual
      const { data, error } = await supabase.rpc('create_user_flexible', {
        p_first_name: user.firstName,
        p_last_name: user.lastName,
        p_cpf: user.cpf,
        p_email: user.email,
        p_phone: user.phone,
        p_password: user.password || '',
        p_generate_password: generatePassword,
        p_role: user.role,
        p_permissions: JSON.stringify(user.permissions),
        p_active: user.active,
        p_can_generate_tokens: user.allowRecovery
      });

      if (error || !data?.success) {
        console.error('❌ Erro ao criar no Supabase:', error || data?.error);
        throw new Error(data?.error || 'Erro ao criar usuário no banco de dados');
      }

      console.log('✅ Usuário criado no Supabase:', data.user_id);
      if (data.generated_password) {
        console.log('🔑 Senha gerada:', data.generated_password);
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
      console.error('❌ Erro ao adicionar usuário:', error);
      throw error;
    }
  },

  update: (user: UserData) => {
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
  },

  delete: async (id: string) => {
    try {
      const u = db.getById(id);
      console.log('🗑️ Deletando usuário do Supabase...');
      
      const { data, error } = await supabase.rpc('delete_user_by_id', {
        p_user_id: id
      });

      if (error || !data?.success) {
        console.error('❌ Erro ao deletar do Supabase:', error || data?.error);
        throw new Error(data?.error || 'Erro ao deletar usuário do banco de dados');
      }

      console.log('✅ Usuário deletado do Supabase');
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
      console.error('❌ Erro ao deletar usuário:', error);
      throw error;
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
