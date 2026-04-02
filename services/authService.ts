import { User } from '../types';
import { logService } from './logService';
import { auditService } from './auditService';
import { supabase, getSupabaseSession, onAuthStateChange } from './supabase';

const STORAGE_KEY = 'sg_user';
const SESSION_ID_KEY = 'sg_session_id';
let currentSessionId: string | null = null;

const normalizeRole = (value?: string | null): 'admin' | 'manager' | 'user' => {
  const role = (value || '').trim().toLowerCase();
  if (['admin', 'administrator', 'administrador'].includes(role)) {
    return 'admin';
  }
  if (['manager', 'gerente'].includes(role)) {
    return 'manager';
  }
  return 'user';
};

// ============================================================================
// TIPOS
// ============================================================================

// ============================================================================
// AUTH SERVICE COM SUPABASE AUTH
// ============================================================================

export const authService = {
  /**
   * Login usando Supabase Auth (signInWithPassword)
   * Busca dados adicionais do usuário na tabela app_users
   */
  login: async (email: string, password: string): Promise<User> => {
    const loginTraceId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `login-${Date.now()}`;
    const loginStart = typeof performance !== 'undefined' ? performance.now() : Date.now();


    try {

      // 1. Autenticar com Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - loginStart;
        void auditService.recordLogin(email, false, authError.message || 'Falha ao autenticar');
        throw new Error(authError.message || 'Erro ao processar autenticacao.');
      }

      if (!authData.user || !authData.session) {
        const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - loginStart;
        void auditService.recordLogin(email, false, 'Sessão inválida');
        throw new Error('Falha ao criar sessão de autenticação.');
      }

      const metadata = (authData.user.user_metadata || {}) as Record<string, any>;
      const firstName = metadata.first_name || authData.user.email?.split('@')[0] || 'Usuario';
      const lastName = metadata.last_name || '';

      // 2. Buscar dados adicionais na tabela app_users (incluindo id real da tabela e company_id)
      const { data: userData, error: userError } = await supabase
        .from('app_users')
        .select('id, company_id, role, active, first_name, last_name')
        .eq('auth_user_id', authData.user.id)
        .single();

      if (userError) {
      }

      const roleValue = normalizeRole(userData?.role || metadata.role);
      const isActive = userData?.active ?? (metadata.active !== undefined ? !!metadata.active : true);
      let companyId = userData?.company_id || metadata.company_id || null;

      // FIX: Garantir que companyId não seja string "null" e buscar se estiver faltando
      if (companyId === 'null') companyId = null;

      if (!companyId) {
        // SEGURANÇA: Não buscar "qualquer" empresa. Se não tem vinculada, o usuário está incompleto.
        void auditService.recordLogin(email, false, 'Usuário sem empresa vinculada');
        throw new Error('Seu usuário não está vinculado a nenhuma empresa. Contate o suporte.');
      }

      if (!isActive) {
        await supabase.auth.signOut();
        void auditService.recordLogin(email, false, 'Usuário inativo');
        throw new Error('Usuário inativo. Contate o administrador.');
      }

      const userSession: User = {
        id: authData.user.id,
        appUserId: userData?.id, // ID real da tabela app_users
        name: userData ? `${userData.first_name} ${userData.last_name}`.trim() : `${firstName} ${lastName}`.trim(),
        email: authData.user.email || email,
        role: roleValue,
        companyId: companyId,
        token: authData.session.access_token,
        avatar: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=0D8ABC&color=fff`,
        mustChangePassword: metadata.must_change_password === true
      };


      // 5. Salvar sessão - APENAS se não precisar trocar senha
      if (!userSession.mustChangePassword) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userSession));
      }

      // 6. Log de auditoria + sessão — fire-and-forget (não bloqueia login)
      logService.addLog({
        userId: authData.user.id,
        userName: userSession.name,
        action: 'login',
        module: 'Sistema',
        description: 'Acesso realizado via Supabase Auth'
      });

      void auditService.recordLogin(email, true);

      // 7. Criar sessão de auditoria em background (não bloqueia retorno)
      void auditService.createSession().then(session => {
        currentSessionId = session.id;
        sessionStorage.setItem(SESSION_ID_KEY, session.id);
      }).catch(() => { });

      const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - loginStart;

      return userSession;

    } catch (error: any) {
      const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - loginStart;
      throw error;
    }
  },

  /**
   * Atualiza a senha do usuário logado (usado no primeiro acesso ou recuperação)
   */
  updatePassword: async (newPassword: string): Promise<void> => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
      data: { must_change_password: false }
    });

    if (error) throw error;

    // Sincronizar com app_users também
    if (data.user) {
      await supabase.from('app_users')
        .update({ must_change_password: false })
        .eq('auth_user_id', data.user.id);
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

    // Parar todos os canais Realtime antes do signOut
    const { stopAllRealtime } = await import('./supabaseInitService');
    await stopAllRealtime();

    // Fazer logout no Supabase Auth
    await supabase.auth.signOut();

    // Limpar storage local
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_ID_KEY);
    sessionStorage.clear();

    // Resetar estado de inicialização
    const { resetSupabaseInit } = await import('./supabaseInitService');
    resetSupabaseInit();
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
    const restoreTraceId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `restore-${Date.now()}`;
    const restoreStart = typeof performance !== 'undefined' ? performance.now() : Date.now();

    try {
      const session = await getSupabaseSession();

      if (!session || !session.user) {
        const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - restoreStart;
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }

      // Verificar se já temos dados no sessionStorage
      const storedUser = authService.getCurrentUser();
      if (storedUser) {
        const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - restoreStart;
        return storedUser;
      }

      // Se não tem no storage mas tem sessão Supabase, buscar dados

      // Buscar do app_users para garantir dados atualizados e company_id
      const { data: userData } = await supabase
        .from('app_users')
        .select('id, company_id, role, active, first_name, last_name')
        .eq('auth_user_id', session.user.id)
        .single();

      const metadata = (session.user.user_metadata || {}) as Record<string, any>;
      const firstName = metadata.first_name || session.user.email?.split('@')[0] || 'Usuario';
      const lastName = metadata.last_name || '';
      const roleValue = normalizeRole(userData?.role || metadata.role);
      const isActive = userData?.active ?? (metadata.active !== undefined ? !!metadata.active : true);
      let companyId = userData?.company_id || metadata.company_id || null;

      // FIX: Garantir que companyId não seja string "null" e buscar se estiver faltando
      if (companyId === 'null') companyId = null;

      if (!companyId) {
        // Se não tem empresa no restore, a sessão está inválida
        return null;
      }

      if (!isActive) {
        const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - restoreStart;
        return null;
      }

      const userSession: User = {
        id: session.user.id,
        appUserId: userData?.id,
        name: userData ? `${userData.first_name} ${userData.last_name}`.trim() : `${firstName} ${lastName}`.trim(),
        email: session.user.email || '',
        role: roleValue,
        companyId: companyId,
        token: session.access_token,
        avatar: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=0D8ABC&color=fff`,
        mustChangePassword: metadata.must_change_password === true
      };

      if (userSession.mustChangePassword) {
        // Impede que um usuário com senha temporária pule a tela de troca de senha no refresh
        // Não limpamos sessionStorage aqui porque o login com mustChangePassword já não salva
        return null;
      }

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userSession));
      const storedSessionId = sessionStorage.getItem(SESSION_ID_KEY);
      if (storedSessionId) currentSessionId = storedSessionId;
      const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - restoreStart;
      return userSession;
    } catch (error) {
      const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - restoreStart;
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
  },

  getCurrentSessionId: () => currentSessionId
};
