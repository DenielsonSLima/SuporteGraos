import { useState, useCallback } from 'react';
import { authService } from '../services/authService';
import { loginScreenService } from '../services/loginScreenService';
import { User } from '../types';

/**
 * Hook que gerencia o formulário de login (email, senha, remember, submit).
 */
export function useLoginForm(onLoginSuccess: (user: User) => void) {
  const [email, setEmail] = useState(() => {
    if (typeof window === 'undefined') return '';
    const remember = localStorage.getItem('login_remember') === 'true';
    return remember ? (localStorage.getItem('login_email') || '') : '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('login_remember') === 'true';
  });
  const [requirePasswordChange, setRequirePasswordChange] = useState<User | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setError('');
    setIsLoading(true);

    try {
      const user = await authService.login(email, password);

      if (user.mustChangePassword) {
        setRequirePasswordChange(user);
        setIsLoading(false);
        return;
      }

      // Inicializar serviços que dependem de autenticação
      loginScreenService.startRealtime();

      onLoginSuccess(user);

      if (typeof window !== 'undefined') {
        if (rememberMe) {
          localStorage.setItem('login_email', email);
          localStorage.setItem('login_remember', 'true');
        } else {
          localStorage.removeItem('login_email');
          localStorage.removeItem('login_remember');
        }
      }
    } catch (err: any) {
      const rawMessage = err?.message || 'Erro ao realizar login. Verifique suas credenciais.';
      const isInactive = typeof rawMessage === 'string' && rawMessage.toLowerCase().includes('inativo');
      setError(isInactive ? 'Usuário desativado. Contate o administrador.' : rawMessage);
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  }, [email, password, isLoading, rememberMe, onLoginSuccess]);

  return {
    email, setEmail,
    password, setPassword,
    showPassword, setShowPassword,
    isLoading, setIsLoading,
    error, setError,
    rememberMe, setRememberMe,
    requirePasswordChange, setRequirePasswordChange,
    handleSubmit,
  };
}
