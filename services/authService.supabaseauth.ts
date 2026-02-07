import { User } from '../types';
import { logService } from './logService';
import { auditService } from './auditService';
import { supabase, getSupabaseSession, onAuthStateChange } from './supabase';

const STORAGE_KEY = 'sg_user';
let currentSessionId: string | null = null;

// ============================================================================
// TIPOS
// ============================================================================

interface AppUserMetadata {
  id: string;
  first_name: string;
  last_name: string;
  cpf: string;
  phone?: string;
  role: string;
  permissions: string[];
  company_id?: string;
  active: boolean;
}

// ============================================================================
// AUTH SERVICE COM SUPABASE AUTH
// ============================================================================

export const authService = {
  /**
   * Login usando Supabase Auth (signInWithPassword)
   * Busca dados adicionais do usuário na tabela app_users
   */
  login: async (email: string, password: string): Promise<User> => {
    try {
      console.log('🔐 Autenticando via Supabase Auth...');
      console.log('📧 Email:', email);

      // 1. Autenticar com Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.error('❌ Erro Supabase Auth:', authError);
        void auditService.recordLogin(email, false, authError.message);
        throw new Error(authError.message || 'Erro ao processar autenticação.');
      }

      if (!authData.user || !authData.session) {
        void auditService.recordLogin(email, false, 'Sessão inválida');
        throw new Error('Falha ao criar sessão de autenticação.');
      }

      console.log('✅ Autenticação Supabase bem-sucedida!');
      console.log('👤 User ID:', authData.user.id);
      console.log('🎫 Access Token:', authData.session.access_token.substring(0, 20) + '...');

      // 2. Buscar dados adicionais do usuário na tabela app_users
      const { data: appUser, error: userError } = await supabase
        .from('app_users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError) {
        console.error('⚠️ Aviso: Usuário não encontrado em app_users:', userError);
        // Se não encontrar, usar dados básicos do Supabase Auth
        const userSession: User = {
          id: authData.user.id,
          name: authData.user.email?.split('@')[0] || 'Usuário',
          email: authData.user.email || email,
          role: 'user',
          token: authData.session.access_token,
          avatar: `https://ui-avatars.com/api/?name=${authData.user.email}&background=0D8ABC&color=fff`
        };

        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userSession));
        
        logService.addLog({
          userId: authData.user.id,
          userName: userSession.name,
          action: 'login',
          module: 'Sistema',
          description: 'Acesso via Supabase Auth (sem dados em app_users)'
        });

        void auditService.recordLogin(email, true);
        const session = await auditService.createSession();
        currentSessionId = session.id;

        return userSession;
      }

      // 3. Verificar se usuário está ativo
      if (!appUser.active) {
        // Fazer logout imediato
        await supabase.auth.signOut();
        void auditService.recordLogin(email, false, 'Usuário inativo');
        throw new Error('Usuário inativo. Contate o administrador.');
      }

      // 4. Criar sessão do usuário com dados completos
      const userSession: User = {
        id: appUser.id,
        name: `${appUser.first_name} ${appUser.last_name}`,
        email: appUser.email,
        role: appUser.role === 'Administrador' ? 'admin' : 'user',
        token: authData.session.access_token,
        avatar: `https://ui-avatars.com/api/?name=${appUser.first_name}+${appUser.last_name}&background=0D8ABC&color=fff`
      };

      // 5. Salvar sessão
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userSession));

      // 6. Log de auditoria
      logService.addLog({
        userId: appUser.id,
        userName: userSession.name,
        action: 'login',
        module: 'Sistema',
        description: 'Acesso realizado via Supabase Auth (JWT + RLS)'
      });

      void auditService.recordLogin(email, true);

      // 7. Criar sessão de auditoria
      const session = await auditService.createSession();
      currentSessionId = session.id;

      console.log('✅ Login completo bem-sucedido!');
      return userSession;

    } catch (error: any) {
      console.error('❌ Erro no login:', error.message);
      throw error;
    }
  },

  /**
   * Logout - encerra sessão Supabase e local
   */
  logout: async () => {
    const user = authService.getCurrentUser();

    if (user) {
      void auditService.logAction('logout', 'Sistema', `${user.name} saiu do sistema`);

      if (currentSessionId) {
        void auditService.closeSession(currentSessionId);
        currentSessionId = null;
      }
    }

    // Fazer logout no Supabase Auth
    await supabase.auth.signOut();

    // Limpar storage local
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.clear();
  },

  /**
   * Obtém usuário atual do sessionStorage
   */
  getCurrentUser: (): User | null => {
    const userStr = sessionStorage.getItem(STORAGE_KEY);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
  },

  /**
   * Verifica se usuário está autenticado
   */
  isAuthenticated: (): boolean => {
    return !!authService.getCurrentUser();
  },

  /**
   * Verifica se usuário tem permissão específica
   */
  hasPermission: (requiredRole: 'admin' | 'manager' | 'user'): boolean => {
    const user = authService.getCurrentUser();
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === requiredRole) return true;
    return false;
  },

  /**
   * Verifica e restaura sessão do Supabase ao carregar app
   */
  restoreSession: async (): Promise<User | null> => {
    try {
      const session = await getSupabaseSession();
      
      if (!session || !session.user) {
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }

      // Verificar se já temos dados no sessionStorage
      const storedUser = authService.getCurrentUser();
      if (storedUser) {
        console.log('✅ Sessão restaurada do storage');
        return storedUser;
      }

      // Se não tem no storage mas tem sessão Supabase, buscar dados
      console.log('🔄 Restaurando sessão do Supabase...');
      
      const { data: appUser } = await supabase
        .from('app_users')
        .select('*')
        .eq('email', session.user.email)
        .single();

      if (appUser && appUser.active) {
        const userSession: User = {
          id: appUser.id,
          name: `${appUser.first_name} ${appUser.last_name}`,
          email: appUser.email,
          role: appUser.role === 'Administrador' ? 'admin' : 'user',
          token: session.access_token,
          avatar: `https://ui-avatars.com/api/?name=${appUser.first_name}+${appUser.last_name}&background=0D8ABC&color=fff`
        };

        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userSession));
        console.log('✅ Sessão restaurada com sucesso');
        return userSession;
      }

      return null;
    } catch (error) {
      console.error('❌ Erro ao restaurar sessão:', error);
      return null;
    }
  },

  /**
   * Observa mudanças no estado de autenticação
   */
  onAuthStateChanged: (callback: (user: User | null) => void) => {
    return onAuthStateChange(async (session) => {
      if (session && session.user) {
        const user = await authService.restoreSession();
        callback(user);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
        callback(null);
      }
    });
  }
};
