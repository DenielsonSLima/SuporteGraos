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

    console.log('%c╔════════════════════════════════════╗', 'color: orange; font-weight: bold;');
    console.log('%c║  🔐 AUTH SERVICE - LOGIN INICIADO  ║', 'color: orange; font-weight: bold;');
    console.log('%c╚════════════════════════════════════╝', 'color: orange; font-weight: bold;');
    console.log('[AUTH] 🧭 Trace ID:', loginTraceId);
    console.log('[AUTH] 📧 Email recebido:', email);
    console.log('[AUTH] 🕐 Timestamp:', new Date().toISOString());

    try {
      console.log('[AUTH] 🔐 Autenticando via Supabase Auth...');

      // 1. Autenticar com Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - loginStart;
        console.warn('[AUTH] ⚠️ Supabase Auth falhou:', {
          traceId: loginTraceId,
          message: authError.message,
          code: authError.code,
          status: authError.status,
          elapsedMs: Math.round(elapsedMs)
        });
        void auditService.recordLogin(email, false, authError.message || 'Falha ao autenticar');
        throw new Error(authError.message || 'Erro ao processar autenticacao.');
      }

      if (!authData.user || !authData.session) {
        const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - loginStart;
        console.error('[AUTH] ❌ Sessão inválida - authData.user ou authData.session é null', {
          traceId: loginTraceId,
          hasUser: !!authData.user,
          hasSession: !!authData.session,
          elapsedMs: Math.round(elapsedMs)
        });
        void auditService.recordLogin(email, false, 'Sessão inválida');
        throw new Error('Falha ao criar sessão de autenticação.');
      }

      console.log('[AUTH] ✅ Autenticação Supabase bem-sucedida!');
      const metadata = (authData.user.user_metadata || {}) as Record<string, any>;
      const firstName = metadata.first_name || authData.user.email?.split('@')[0] || 'Usuario';
      const lastName = metadata.last_name || '';

      // 2. Buscar dados adicionais na tabela app_users (incluindo company_id)
      console.log('[AUTH] 🔍 Buscando perfil em app_users...');
      const { data: userData, error: userError } = await supabase
        .from('app_users')
        .select('company_id, role, active, name')
        .eq('auth_user_id', authData.user.id)
        .single();

      if (userError) {
        console.warn('[AUTH] ⚠️ Nao foi possivel buscar dados em app_users:', userError.message);
      }

      const roleValue = normalizeRole(userData?.role || metadata.role);
      const isActive = userData?.active ?? (metadata.active !== undefined ? !!metadata.active : true);
      const companyId = userData?.company_id || metadata.company_id || null;

      if (!isActive) {
        await supabase.auth.signOut();
        void auditService.recordLogin(email, false, 'Usuário inativo');
        throw new Error('Usuário inativo. Contate o administrador.');
      }

      const userSession: User = {
        id: authData.user.id,
        name: userData?.name || `${firstName} ${lastName}`.trim(),
        email: authData.user.email || email,
        role: roleValue,
        companyId: companyId,
        token: authData.session.access_token,
        avatar: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=0D8ABC&color=fff`
      };

      console.log('[AUTH] 👤 UserSession criado:', {
        id: userSession.id,
        name: userSession.name,
        email: userSession.email,
        role: userSession.role,
        companyId: userSession.companyId
      });

      // 5. Salvar sessão
      console.log('[AUTH] 💾 Salvando sessão no sessionStorage...');
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userSession));
      console.log('[AUTH] ✅ Sessão salva com sucesso');

      // 6. Log de auditoria
      console.log('[AUTH] 📝 Criando log de auditoria...');
      logService.addLog({
        userId: authData.user.id,
        userName: userSession.name,
        action: 'login',
        module: 'Sistema',
        description: 'Acesso realizado via Supabase Auth'
      });

      console.log('[AUTH] 📊 Gravando login no auditService...');
      void auditService.recordLogin(email, true);

      // 7. Criar sessão de auditoria
      console.log('[AUTH] 🔐 Criando sessão de auditoria...');
      const session = await auditService.createSession();
      currentSessionId = session.id;
      sessionStorage.setItem(SESSION_ID_KEY, session.id);
      console.log('[AUTH] ✅ Sessão de auditoria criada com ID:', currentSessionId);

      console.log('%c╔════════════════════════════════════╗', 'color: green; font-weight: bold;');
      console.log('%c║  ✅ LOGIN COMPLETO BEM-SUCEDIDO!  ║', 'color: green; font-weight: bold;');
      console.log('%c╚════════════════════════════════════╝', 'color: green; font-weight: bold;');
      const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - loginStart;
      console.log('[AUTH] ✅ Duração total do login (ms):', Math.round(elapsedMs));
      console.log('[AUTH] 🧭 Trace ID final:', loginTraceId);
      console.log('[AUTH] 📤 Retornando userSession completo:', userSession);

      return userSession;

    } catch (error: any) {
      const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - loginStart;
      console.error('❌ Erro no login:', {
        traceId: loginTraceId,
        message: error?.message || String(error),
        elapsedMs: Math.round(elapsedMs)
      });
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
    sessionStorage.removeItem(SESSION_ID_KEY);
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
    const restoreTraceId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `restore-${Date.now()}`;
    const restoreStart = typeof performance !== 'undefined' ? performance.now() : Date.now();

    try {
      console.log('[AUTH] 🔁 RestoreSession iniciado:', restoreTraceId);
      const session = await getSupabaseSession();

      if (!session || !session.user) {
        const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - restoreStart;
        console.log('[AUTH] ℹ️ Nenhuma sessão Supabase encontrada:', {
          traceId: restoreTraceId,
          elapsedMs: Math.round(elapsedMs)
        });
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }

      // Verificar se já temos dados no sessionStorage
      const storedUser = authService.getCurrentUser();
      if (storedUser) {
        const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - restoreStart;
        console.log('✅ Sessão restaurada do storage', {
          traceId: restoreTraceId,
          elapsedMs: Math.round(elapsedMs)
        });
        return storedUser;
      }

      // Se não tem no storage mas tem sessão Supabase, buscar dados
      console.log('🔄 Restaurando sessão do Supabase...', {
        traceId: restoreTraceId,
        email: session.user.email
      });

      // Buscar do app_users para garantir dados atualizados e company_id
      const { data: userData } = await supabase
        .from('app_users')
        .select('company_id, role, active, name')
        .eq('auth_user_id', session.user.id)
        .single();

      const metadata = (session.user.user_metadata || {}) as Record<string, any>;
      const firstName = metadata.first_name || session.user.email?.split('@')[0] || 'Usuario';
      const lastName = metadata.last_name || '';
      const roleValue = normalizeRole(userData?.role || metadata.role);
      const isActive = userData?.active ?? (metadata.active !== undefined ? !!metadata.active : true);
      const companyId = userData?.company_id || metadata.company_id || null;

      if (!isActive) {
        const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - restoreStart;
        console.log('[AUTH] ℹ️ RestoreSession usuario inativo:', {
          traceId: restoreTraceId,
          elapsedMs: Math.round(elapsedMs)
        });
        return null;
      }

      const userSession: User = {
        id: session.user.id,
        name: userData?.name || `${firstName} ${lastName}`.trim(),
        email: session.user.email || '',
        role: roleValue,
        companyId: companyId,
        token: session.access_token,
        avatar: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=0D8ABC&color=fff`
      };

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userSession));
      const storedSessionId = sessionStorage.getItem(SESSION_ID_KEY);
      if (storedSessionId) currentSessionId = storedSessionId;
      const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - restoreStart;
      console.log('✅ Sessão restaurada com sucesso', {
        traceId: restoreTraceId,
        companyId: userSession.companyId,
        elapsedMs: Math.round(elapsedMs)
      });
      return userSession;
    } catch (error) {
      const elapsedMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - restoreStart;
      console.error('❌ Erro ao restaurar sessão:', {
        traceId: restoreTraceId,
        error,
        elapsedMs: Math.round(elapsedMs)
      });
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
