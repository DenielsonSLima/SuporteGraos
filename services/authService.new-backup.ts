/**
 * ============================================================================
 * AUTH SERVICE - Serviço de Autenticação com Segurança Avançada
 * ============================================================================
 * 
 * Recursos de Segurança Implementados:
 * - ✅ Hash de senhas com bcrypt
 * - ✅ Rate limiting (bloqueio após 5 tentativas falhas)
 * - ✅ Tokens JWT reais
 * - ✅ Refresh token para renovação de sessão
 * - ✅ Timeout de sessão (2 horas de inatividade)
 * - ✅ Registro de tentativas de login
 * - ✅ Detecção de conta bloqueada
 */

import { User } from '../types';
import { logService } from './logService';
import { auditService } from './auditService';
import { supabase } from './supabase';
import { verifyPassword } from '../utils/crypto';
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../utils/jwt';

// ============================================================================
// CONSTANTES
// ============================================================================

const STORAGE_KEY = 'sg_user';
const REFRESH_TOKEN_KEY = 'sg_refresh_token';
const LAST_ACTIVITY_KEY = 'sg_last_activity';
const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 horas em milissegundos

let currentSessionId: string | null = null;
let inactivityTimer: number | null = null;

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Verifica se o usuário está bloqueado por tentativas falhas
 */
const checkIfUserLocked = async (email: string): Promise<{ locked: boolean; remainingTime?: number }> => {
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select('account_locked_until, failed_login_attempts')
      .eq('email', email)
      .single();

    if (error || !data) {
      return { locked: false };
    }

    if (data.account_locked_until) {
      const lockUntil = new Date(data.account_locked_until).getTime();
      const now = Date.now();

      if (lockUntil > now) {
        const remainingMs = lockUntil - now;
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        return { locked: true, remainingTime: remainingMinutes };
      } else {
        // Desbloquear automaticamente
        await supabase
          .from('app_users')
          .update({ account_locked_until: null, failed_login_attempts: 0 })
          .eq('email', email);
        return { locked: false };
      }
    }

    return { locked: false };
  } catch (error) {
    console.error('Erro ao verificar bloqueio:', error);
    return { locked: false };
  }
};

/**
 * Registra tentativa de login falhada
 */
const recordFailedAttempt = async (email: string, reason: string): Promise<void> => {
  try {
    // 1. Registrar na tabela login_attempts
    await supabase
      .from('login_attempts')
      .insert({
        email,
        attempt_type: 'failed',
        failure_reason: reason,
        ip_address: 'localhost', // TODO: Capturar IP real
        created_at: new Date().toISOString()
      });

    // 2. Incrementar contador de falhas
    const { data: user } = await supabase
      .from('app_users')
      .select('failed_login_attempts')
      .eq('email', email)
      .single();

    if (user) {
      const newCount = (user.failed_login_attempts || 0) + 1;
      const updates: any = {
        failed_login_attempts: newCount,
        last_failed_login: new Date().toISOString()
      };

      // Bloquear após 5 tentativas (15 minutos)
      if (newCount >= 5) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        updates.account_locked_until = lockUntil;
      }

      await supabase
        .from('app_users')
        .update(updates)
        .eq('email', email);
    }
  } catch (error) {
    console.error('Erro ao registrar tentativa falhada:', error);
  }
};

/**
 * Reseta tentativas falhadas após login bem-sucedido
 */
const resetFailedAttempts = async (email: string): Promise<void> => {
  try {
    await supabase
      .from('app_users')
      .update({
        failed_login_attempts: 0,
        last_failed_login: null,
        account_locked_until: null,
        last_login_at: new Date().toISOString(),
        last_login_ip: 'localhost' // TODO: Capturar IP real
      })
      .eq('email', email);
  } catch (error) {
    console.error('Erro ao resetar tentativas:', error);
  }
};

// ============================================================================
// TIMEOUT DE SESSÃO
// ============================================================================

/**
 * Atualiza timestamp da última atividade
 */
const updateLastActivity = (): void => {
  sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
};

/**
 * Verifica se a sessão expirou por inatividade
 */
const checkSessionTimeout = (): boolean => {
  const lastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY);
  if (!lastActivity) return true;

  const elapsed = Date.now() - parseInt(lastActivity, 10);
  return elapsed > SESSION_TIMEOUT_MS;
};

/**
 * Inicia timer de inatividade
 */
const startInactivityTimer = (): void => {
  // Limpar timer anterior se existir
  if (inactivityTimer) {
    window.clearInterval(inactivityTimer);
  }

  // Verificar a cada minuto
  inactivityTimer = window.setInterval(() => {
    if (checkSessionTimeout()) {
      console.warn('⏱️ Sessão expirada por inatividade');
      authService.logout();
      window.location.reload(); // Recarregar para mostrar login
    }
  }, 60 * 1000) as unknown as number; // Verificar a cada 1 minuto
};

/**
 * Monitora atividade do usuário
 */
const setupActivityMonitoring = (): void => {
  if (typeof window === 'undefined') return;

  const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
  
  const activityHandler = () => {
    updateLastActivity();
  };

  events.forEach(event => {
    window.addEventListener(event, activityHandler);
  });

  // Atualizar atividade inicial
  updateLastActivity();
  
  // Iniciar timer
  startInactivityTimer();
};

// ============================================================================
// AUTENTICAÇÃO PRINCIPAL
// ============================================================================

export const authService = {
  /**
   * Realiza login com verificação de hash e rate limiting
   */
  login: async (email: string, password: string): Promise<User> => {
    try {
      // 1. Verificar se a conta está bloqueada
      const lockStatus = await checkIfUserLocked(email);
      if (lockStatus.locked) {
        throw new Error(`Conta bloqueada. Tente novamente em ${lockStatus.remainingTime} minutos.`);
      }

      // 2. Buscar usuário no Supabase
      const { data: dbUser, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !dbUser) {
        await recordFailedAttempt(email, 'Usuário não encontrado');
        throw new Error('Credenciais inválidas.');
      }

      // 3. Verificar se usuário está ativo
      if (!dbUser.active) {
        await recordFailedAttempt(email, 'Usuário inativo');
        throw new Error('Usuário inativo. Contate o administrador.');
      }

      // 4. Verificar senha com bcrypt
      const isPasswordValid = await verifyPassword(password, dbUser.password_hash);
      if (!isPasswordValid) {
        await recordFailedAttempt(email, 'Senha incorreta');
        throw new Error('Credenciais inválidas.');
      }

      // 5. Resetar tentativas falhadas
      await resetFailedAttempts(email);

      // 6. Registrar login bem-sucedido
      await supabase
        .from('login_attempts')
        .insert({
          email: dbUser.email,
          user_id: dbUser.id,
          attempt_type: 'success',
          ip_address: 'localhost',
          created_at: new Date().toISOString()
        });

      // 7. Gerar tokens JWT
      const accessToken = generateAccessToken({
        userId: dbUser.id,
        email: dbUser.email,
        role: dbUser.role === 'Administrador' ? 'admin' : 'user',
        name: `${dbUser.first_name} ${dbUser.last_name}`,
        permissions: JSON.parse(dbUser.permissions || '[]')
      });

      const refreshToken = generateRefreshToken(dbUser.id);

      // 8. Salvar refresh token no Supabase
      await supabase
        .from('refresh_tokens')
        .insert({
          user_id: dbUser.id,
          token: refreshToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          ip_address: 'localhost'
        });

      // 9. Criar objeto User
      const userSession: User = {
        id: dbUser.id,
        name: `${dbUser.first_name} ${dbUser.last_name}`,
        email: dbUser.email,
        role: dbUser.role === 'Administrador' ? 'admin' : 'user',
        token: accessToken,
        avatar: `https://ui-avatars.com/api/?name=${dbUser.first_name}+${dbUser.last_name}&background=0D8ABC&color=fff`
      };

      // 10. Armazenar na sessão
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userSession));
      sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

      // 11. Log de auditoria
      logService.addLog({
        userId: dbUser.id,
        userName: userSession.name,
        action: 'login',
        module: 'Sistema',
        description: `Acesso realizado via autenticação segura (JWT + Bcrypt).`
      });

      // 12. Criar sessão no sistema de auditoria
      const session = await auditService.createSession();
      currentSessionId = session.id;

      // 13. Iniciar monitoramento de inatividade
      setupActivityMonitoring();

      console.log('✅ Login bem-sucedido:', email);
      return userSession;

    } catch (error: any) {
      console.error('❌ Erro no login:', error.message);
      throw error;
    }
  },

  /**
   * Realiza logout e limpa todas as sessões
   */
  logout: () => {
    const user = authService.getCurrentUser();

    // Registrar logout no sistema de auditoria
    if (user) {
      void auditService.logAction('logout', 'Sistema', `${user.name} saiu do sistema`);

      // Fechar sessão se existir
      if (currentSessionId) {
        void auditService.closeSession(currentSessionId);
        currentSessionId = null;
      }

      // Revogar refresh token
      const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        supabase
          .from('refresh_tokens')
          .update({ is_revoked: true, revoked_at: new Date().toISOString() })
          .eq('token', refreshToken)
          .then(() => console.log('🔒 Refresh token revogado'));
      }
    }

    // Limpar storage
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(LAST_ACTIVITY_KEY);
    sessionStorage.clear();

    // Limpar timer de inatividade
    if (inactivityTimer) {
      window.clearInterval(inactivityTimer);
      inactivityTimer = null;
    }

    console.log('👋 Logout realizado');
  },

  /**
   * Retorna o usuário atual da sessão
   */
  getCurrentUser: (): User | null => {
    // Verificar timeout
    if (checkSessionTimeout()) {
      authService.logout();
      return null;
    }

    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id && parsed.token) {
          // Validar token JWT
          const decoded = verifyAccessToken(parsed.token);
          if (!decoded) {
            // Token inválido, tentar refresh
            console.warn('⚠️ Token inválido, tentando refresh...');
            return null;
          }
          return parsed;
        }
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    return null;
  },

  /**
   * Verifica se está autenticado
   */
  isAuthenticated: (): boolean => {
    return !!authService.getCurrentUser();
  },

  /**
   * Verifica permissão de acesso
   */
  hasPermission: (requiredRole: 'admin' | 'manager' | 'user'): boolean => {
    const user = authService.getCurrentUser();
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === requiredRole) return true;
    return false;
  },

  /**
   * Renova o access token usando o refresh token
   */
  refreshAccessToken: async (): Promise<string | null> => {
    try {
      const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        return null;
      }

      // Validar refresh token
      const decoded = verifyRefreshToken(refreshToken);
      if (!decoded) {
        console.warn('⚠️ Refresh token inválido');
        return null;
      }

      // Verificar se não foi revogado
      const { data: tokenData } = await supabase
        .from('refresh_tokens')
        .select('*')
        .eq('token', refreshToken)
        .single();

      if (!tokenData || tokenData.is_revoked) {
        console.warn('⚠️ Refresh token revogado');
        return null;
      }

      // Buscar usuário atualizado
      const { data: dbUser } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', decoded.userId)
        .single();

      if (!dbUser || !dbUser.active) {
        return null;
      }

      // Gerar novo access token
      const newAccessToken = generateAccessToken({
        userId: dbUser.id,
        email: dbUser.email,
        role: dbUser.role === 'Administrador' ? 'admin' : 'user',
        name: `${dbUser.first_name} ${dbUser.last_name}`,
        permissions: JSON.parse(dbUser.permissions || '[]')
      });

      // Atualizar sessão
      const userSession: User = {
        id: dbUser.id,
        name: `${dbUser.first_name} ${dbUser.last_name}`,
        email: dbUser.email,
        role: dbUser.role === 'Administrador' ? 'admin' : 'user',
        token: newAccessToken,
        avatar: `https://ui-avatars.com/api/?name=${dbUser.first_name}+${dbUser.last_name}&background=0D8ABC&color=fff`
      };

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userSession));
      
      console.log('✅ Access token renovado');
      return newAccessToken;

    } catch (error) {
      console.error('❌ Erro ao renovar token:', error);
      return null;
    }
  }
};

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

// Configurar monitoramento de atividade se houver usuário logado
if (typeof window !== 'undefined' && authService.isAuthenticated()) {
  setupActivityMonitoring();
}

export default authService;
