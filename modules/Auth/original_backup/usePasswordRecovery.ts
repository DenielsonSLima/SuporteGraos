import { useState, useCallback } from 'react';
import { userService, UserData } from '../services/userService';
import { useToast } from '../contexts/ToastContext';

/**
 * Hook que gerencia todo o fluxo de recuperação de senha (token → reset).
 */
export function usePasswordRecovery(
  setLoginError: (msg: string) => void,
  setLoginEmail: (email: string) => void,
) {
  const { addToast } = useToast();

  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'token' | 'reset'>('token');
  const [recoveryUser, setRecoveryUser] = useState<UserData | null>(null);
  const [recoveryToken, setRecoveryToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const startRecovery = useCallback(() => {
    setIsRecovering(true);
    setRecoveryStep('token');
    setError('');
    setLoginError('');
  }, [setLoginError]);

  const cancelRecovery = useCallback(() => {
    setIsRecovering(false);
    setRecoveryStep('token');
    setRecoveryToken('');
    setNewPassword('');
    setConfirmNewPassword('');
    setRecoveryUser(null);
    setError('');
  }, []);

  const handleValidateToken = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryToken || isLoading) return;
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const user = (userService as any).getByRecoveryToken(recoveryToken);
      if (user) {
        setRecoveryUser(user);
        setRecoveryStep('reset');
        setError('');
      } else {
        setError('Token inválido ou não encontrado.');
      }
      setIsLoading(false);
    }, 1000);
  }, [recoveryToken, isLoading]);

  const handleResetPassword = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryUser || !recoveryToken || isLoading) return;

    if (newPassword !== confirmNewPassword) {
      setError('As senhas não conferem.');
      return;
    }
    if (newPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const success = (userService as any).resetPasswordWithToken(recoveryToken, newPassword);
      if (success) {
        addToast('success', 'Senha Redefinida', 'Sua senha foi atualizada com sucesso. Faça login agora.');
        cancelRecovery();
        setLoginEmail(recoveryUser?.email || '');
      } else {
        setError('Falha ao redefinir. Token pode ter expirado.');
      }
      setIsLoading(false);
    }, 1500);
  }, [recoveryUser, recoveryToken, newPassword, confirmNewPassword, isLoading, addToast, cancelRecovery, setLoginEmail]);

  return {
    isRecovering,
    recoveryStep, setRecoveryStep,
    recoveryUser,
    recoveryToken, setRecoveryToken,
    newPassword, setNewPassword,
    confirmNewPassword, setConfirmNewPassword,
    isLoading,
    error, setError,
    startRecovery,
    cancelRecovery,
    handleValidateToken,
    handleResetPassword,
  };
}
