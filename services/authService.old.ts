
import { User } from '../types';
import { logService } from './logService';
import { api } from './api';
import { userService } from './userService';
import { auditService } from './auditService';

const STORAGE_KEY = 'sg_user';
let currentSessionId: string | null = null;

export const authService = {
  login: async (email: string, password: string): Promise<User> => {
    // 1. Tenta autenticação local primeiro (para suportar usuários criados dinamicamente e resets de senha)
    const localUser = userService.getByEmail(email);
    
    if (localUser) {
        // Verifica a senha (em produção isso seria hash, aqui é comparação direta para o protótipo)
        if (localUser.password === password && localUser.active) {
            const userSession: User = {
                id: localUser.id,
                name: `${localUser.firstName} ${localUser.lastName}`,
                email: localUser.email,
                role: localUser.role === 'Administrador' ? 'admin' : 'user', // Mapeamento simples
                token: `mock-jwt-token-${localUser.id}`,
                avatar: `https://ui-avatars.com/api/?name=${localUser.firstName}+${localUser.lastName}&background=0D8ABC&color=fff`
            };
            
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userSession));
            
            // Log de auditoria
            logService.addLog({
              userId: userSession.id,
              userName: userSession.name,
              action: 'login',
              module: 'Sistema',
              description: `Acesso realizado via Banco Local.`,
            });

            // Registrar login no sistema de auditoria
            void auditService.recordLogin(email, true);

            // Criar sessão
            const session = await auditService.createSession();
            currentSessionId = session.id;
            return userSession;
        } else if (!localUser.active) {
            // Registrar tentativa de login com usuário inativo
            void auditService.recordLogin(email, false, 'Usuário inativo');
            throw new Error('Usuário inativo. Contate o administrador.');
        } else {
             // Se achou usuário mas senha errada, lança erro direto
             // Registrar tentativa falhada
             void auditService.recordLogin(email, false, 'Credenciais inválidas');
             throw new Error('Credenciais inválidas.');
        }
    }

    // 2. Fallback para API Mock estática (apenas se não achou no local)
    try {
        const user = await api.post<User>('/auth/login', { email, password }, { skipAuth: true });
        
        if (user && user.token) {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
          
          // Registrar login bem-sucedido
          void auditService.recordLogin(email, true);
          
          // Criar sessão
          const session = await auditService.createSession();
          currentSessionId = session.id;
          
          return user;
        }
        throw new Error('Resposta de login inválida.');
    } catch (error: any) {
        console.error("Login error:", error);
        // Registrar falha de login
        void auditService.recordLogin(email, false, error.message);
        throw new Error(error.message || 'Falha na autenticação.');
    }
  },

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
    }
    
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.clear();
  },

  getCurrentUser: (): User | null => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id && parsed.token) {
            return parsed;
        }
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    return null;
  },

  isAuthenticated: (): boolean => {
    return !!authService.getCurrentUser();
  },

  hasPermission: (requiredRole: 'admin' | 'manager' | 'user'): boolean => {
      const user = authService.getCurrentUser();
      if (!user) return false;
      if (user.role === 'admin') return true;
      if (user.role === requiredRole) return true;
      return false;
  }
};
