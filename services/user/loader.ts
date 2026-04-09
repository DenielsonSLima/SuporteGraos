import { supabase } from '../supabase';
import { UserData } from './types';

export const userLoader = {
  /**
   * Lista todos os usuários da empresa.
   * Lê direto de app_users via supabase-js — sem Edge Function.
   */
  getAll: async (): Promise<UserData[]> => {
    const { data, error } = await supabase
      .from('app_users')
      .select('auth_user_id, first_name, last_name, cpf, email, phone, role, active, permissions, allow_recovery')
      .order('first_name', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar usuários: ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      id:            row.auth_user_id,
      firstName:     row.first_name  ?? '',
      lastName:      row.last_name   ?? '',
      cpf:           row.cpf         ?? '',
      email:         row.email       ?? '',
      phone:         row.phone       ?? '',
      role:          row.role        ?? 'user',
      active:        row.active      !== false,
      permissions:   Array.isArray(row.permissions) ? row.permissions : [],
      allowRecovery: row.allow_recovery !== false,
    }));
  },
};
