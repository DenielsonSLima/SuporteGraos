import { supabase } from '../supabase';
import { UserData } from './types';
import { invokeEdgeFunction } from './api';
import { authService } from '../authService';

export const userActions = {
  /**
   * Cria um novo usuário via Edge Function.
   */
  add: async (
    user: UserData,
    generatePassword = true,
  ): Promise<{ userId: string; generatedPassword?: string }> => {
    const { data, error } = await invokeEdgeFunction('create', {
      firstName:        user.firstName,
      lastName:         user.lastName,
      cpf:              user.cpf,
      email:            user.email,
      phone:            user.phone,
      role:             user.role,
      permissions:      user.permissions,
      active:           user.active,
      allowRecovery:    user.allowRecovery,
      generatePassword,
      password:         generatePassword ? undefined : (user.password ?? ''),
    });

    if (error) throw new Error(error);

    return {
      userId:            data.userId,
      generatedPassword: data.generatedPassword,
    };
  },

  /**
   * Atualiza dados de um usuário existente via Edge Function.
   */
  update: async (user: UserData): Promise<void> => {
    const { error } = await invokeEdgeFunction('update', {
      userId:        user.id,
      firstName:     user.firstName,
      lastName:      user.lastName,
      cpf:           user.cpf,
      phone:         user.phone,
      role:          user.role,
      permissions:   user.permissions,
      active:        user.active,
      allowRecovery: user.allowRecovery,
    });

    if (error) throw new Error(error);
  },

  /**
   * Inativa um usuário (active = false).
   */
  inactivate: async (id: string): Promise<void> => {
    const { error } = await invokeEdgeFunction('update', {
      userId: id,
      active: false,
    });

    if (error) throw new Error(error);
  },

  /**
   * Reativa um usuário (active = true).
   */
  reactivate: async (id: string): Promise<void> => {
    const { error } = await invokeEdgeFunction('update', {
      userId: id,
      active: true,
    });

    if (error) throw new Error(error);
  },

  /**
   * Exclui definitivamente um usuário do Supabase Auth.
   */
  delete: async (id: string): Promise<void> => {
    const { error } = await invokeEdgeFunction('delete', { userId: id });
    if (error) throw new Error(error);
  },

  /**
   * Gera um token de recuperação.
   */
  generateRecoveryToken: async (userId: string): Promise<string> => {
    const { data: row, error: fetchErr } = await supabase
      .from('app_users')
      .select('allow_recovery, first_name')
      .eq('auth_user_id', userId)
      .single();

    if (fetchErr || !row) throw new Error('Usuário não encontrado');
    if (!row.allow_recovery) throw new Error('Este usuário não tem recuperação de senha habilitada');

    const token =
      Math.random().toString(36).slice(2, 6).toUpperCase() + '-' +
      Math.random().toString(36).slice(2, 6).toUpperCase();

    return token;
  },

  // Alias legacy para compatibilidade
  deleteLegacy: async (id: string): Promise<void> => userActions.inactivate(id),
};
