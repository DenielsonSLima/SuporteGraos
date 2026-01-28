import { User } from '../types';
import { logService } from './logService';
import { auditService } from './auditService';
import { supabase } from './supabase';
import { generateAccessToken } from '../utils/jwt';

const STORAGE_KEY = 'sg_user';
let currentSessionId: string | null = null;

export const authService = {
  /**
   * Login usando função Supabase (bcrypt no servidor)
   */
  login: async (email: string, password: string): Promise<User> => {
    try {
      console.log('🔐 Autenticando via Supabase...');

      // Chamar função SQL que valida bcrypt no servidor
      const { data, error } = await supabase.rpc('authenticate_user', {
        p_email: email,
        p_password: password
      });

      if (error) {
        console.error('❌ Erro Supabase:', error);
        void auditService.recordLogin(email, false, 'Erro no servidor');
        throw new Error('Erro ao processar autenticação.');
      }

      console.log('📦 Resposta:', data);

      if (!data || !data.success) {
        void auditService.recordLogin(email, false, data?.error || 'Credenciais inválidas');
        throw new Error(data?.error || 'Credenciais inválidas.');
      }

      const dbUser = data.user;

      // Gerar token JWT
      const accessToken = generateAccessToken({
        userId: dbUser.id,
        email: dbUser.email,
        role: dbUser.role === 'Administrador' ? 'admin' : 'user',
        name: `${dbUser.first_name} ${dbUser.last_name}`,
        permissions: dbUser.permissions || []
      });

      // Criar sessão do usuário
      const userSession: User = {
        id: dbUser.id,
        name: `${dbUser.first_name} ${dbUser.last_name}`,
        email: dbUser.email,
        role: dbUser.role === 'Administrador' ? 'admin' : 'user',
        token: accessToken,
        avatar: `https://ui-avatars.com/api/?name=${dbUser.first_name}+${dbUser.last_name}&background=0D8ABC&color=fff`
      };

      // Salvar sessão
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userSession));

      // Log de auditoria
      logService.addLog({
        userId: dbUser.id,
        userName: userSession.name,
        action: 'login',
        module: 'Sistema',
        description: `Acesso realizado via Supabase (Seguro).`
      });

      void auditService.recordLogin(email, true);

      // Criar sessão
      const session = await auditService.createSession();
      currentSessionId = session.id;

      console.log('✅ Login bem-sucedido!');
      return userSession;

    } catch (error: any) {
      console.error('❌ Erro no login:', error.message);
      throw error;
    }
  },

  logout: () => {
    const user = authService.getCurrentUser();

    if (user) {
      void auditService.logAction('logout', 'Sistema', `${user.name} saiu do sistema`);

      if (currentSessionId) {
        void auditService.closeSession(currentSessionId);
        currentSessionId = null;
      }
    }

    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.clear();
  },

  getCurrentUser: (): User | null => {
    const userStr = sessionStorage.getItem(STORAGE_KEY);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    return authService.getCurrentUser() !== null;
  },

  hasPermission: (permission: string): boolean => {
    const user = authService.getCurrentUser();
    if (!user) return false;
    if (user.role === 'admin') return true;
    return false;
  }
};
