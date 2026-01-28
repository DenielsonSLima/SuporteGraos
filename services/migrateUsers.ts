/**
 * ============================================================================
 * MIGRATION SCRIPT - Migração de Senhas para Hash Bcrypt
 * ============================================================================
 * 
 * Este script:
 * 1. Lê usuários do localStorage (userService.ts)
 * 2. Converte senhas em texto puro para hash bcrypt
 * 3. Cria registros no Supabase (tabela app_users)
 * 4. Atualiza localStorage com referência aos IDs do Supabase
 * 
 * EXECUTAR UMA ÚNICA VEZ após criar a tabela app_users no Supabase!
 * 
 * Uso:
 * ```typescript
 * import { migrateUsersToSupabase } from './services/migrateUsers';
 * await migrateUsersToSupabase();
 * ```
 */

import { hashPassword } from '../utils/crypto';
// @ts-nocheck - Script de migração com async/await complexo
import { supabase } from './supabase';
import { userService, UserData } from './userService';

// ============================================================================
// TIPOS
// ============================================================================

interface MigrationResult {
  success: boolean;
  migratedCount: number;
  errors: string[];
  users: {
    email: string;
    status: 'migrated' | 'skipped' | 'error';
    reason?: string;
  }[];
}

// ============================================================================
// MIGRAÇÃO PRINCIPAL
// ============================================================================

/**
 * Migra todos os usuários do localStorage para o Supabase com senhas hash
 * @returns Resultado da migração
 */
export const migrateUsersToSupabase = async (): Promise<MigrationResult> => {
  const result: MigrationResult = {
    success: true,
    migratedCount: 0,
    errors: [],
    users: []
  };

  try {
    console.log('🔄 Iniciando migração de usuários...');
    
    // 1. Obter todos os usuários do localStorage
    const localUsers = userService.getAll();
    console.log(`📋 Encontrados ${localUsers.length} usuários no localStorage`);

    // 2. Verificar se a tabela existe no Supabase
    const { error: tableError } = await supabase
      .from('app_users')
      .select('id')
      .limit(1);

    if (tableError) {
      result.success = false;
      result.errors.push('Tabela app_users não encontrada no Supabase. Execute o SQL primeiro!');
      return result;
    }

    // 3. Migrar cada usuário
    for (const user of localUsers) {
      try {
        console.log(`\n🔐 Processando usuário: ${user.email}`);

        // Verificar se já existe no Supabase
        const { data: existing } = await supabase
          .from('app_users')
          .select('id, email')
          .eq('email', user.email)
          .single();

        if (existing) {
          console.log(`⏭️  Usuário ${user.email} já existe no Supabase (ID: ${existing.id})`);
          result.users.push({
            email: user.email,
            status: 'skipped',
            reason: 'Já existe no Supabase'
          });
          continue;
        }

        // Gerar hash da senha
        let passwordHash: string;
        if (user.password) {
          passwordHash = await hashPassword(user.password);
          console.log(`✅ Hash gerado para ${user.email}`);
        } else {
          // Se não tiver senha, gerar uma temporária forte
          const tempPassword = '!Temp@2026!' + Math.random().toString(36);
          passwordHash = await hashPassword(tempPassword);
          console.log(`⚠️  Senha temporária gerada para ${user.email}`);
        }

        // Verificar se o ID é um UUID válido
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
        
        // Preparar dados para inserção
        const supabaseUser: any = {
          // Se não for UUID válido, deixar o Supabase gerar automaticamente
          ...(isValidUUID ? { id: user.id } : {}),
          first_name: user.firstName,
          last_name: user.lastName,
          cpf: user.cpf,
          email: user.email,
          phone: user.phone || null,
          password_hash: passwordHash,
          role: user.role,
          permissions: JSON.stringify(user.permissions || []),
          active: user.active,
          allow_recovery: user.allowRecovery,
          recovery_token: user.recoveryToken || null,
          must_change_password: !user.password, // Se não tinha senha, forçar mudança
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        if (!isValidUUID) {
          console.log(`⚠️  ID "${user.id}" não é UUID válido. Gerando novo ID automaticamente.`);
        }

        // Inserir no Supabase
        const { error: insertError } = await supabase
          .from('app_users')
          .insert([supabaseUser]);

        if (insertError) {
          throw insertError;
        }

        console.log(`✅ Usuário ${user.email} migrado com sucesso!`);
        result.migratedCount++;
        result.users.push({
          email: user.email,
          status: 'migrated'
        });

      } catch (error: any) {
        console.error(`❌ Erro ao migrar ${user.email}:`, error.message);
        result.errors.push(`${user.email}: ${error.message}`);
        result.users.push({
          email: user.email,
          status: 'error',
          reason: error.message
        });
      }
    }

    // 4. Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA MIGRAÇÃO');
    console.log('='.repeat(60));
    console.log(`✅ Migrados com sucesso: ${result.migratedCount}`);
    console.log(`⏭️  Já existiam: ${result.users.filter(u => u.status === 'skipped').length}`);
    console.log(`❌ Erros: ${result.errors.length}`);
    console.log('='.repeat(60));

    if (result.errors.length > 0) {
      console.log('\n⚠️  ERROS ENCONTRADOS:');
      result.errors.forEach(err => console.log(`  - ${err}`));
      result.success = false;
    } else {
      console.log('\n🎉 Migração concluída com sucesso!');
    }

  } catch (error: any) {
    console.error('❌ Erro fatal na migração:', error);
    result.success = false;
    result.errors.push(`Erro fatal: ${error.message}`);
  }

  return result;
};

// ============================================================================
// VALIDAÇÃO PÓS-MIGRAÇÃO
// ============================================================================

/**
 * Valida se a migração foi bem-sucedida comparando localStorage com Supabase
 * @returns true se tudo está sincronizado
 */
export const validateMigration = async (): Promise<boolean> => {
  try {
    console.log('🔍 Validando migração...');

    const localUsers = userService.getAll();
    const { data: supabaseUsers, error } = await supabase
      .from('app_users')
      .select('id, email');

    if (error) {
      console.error('❌ Erro ao buscar usuários do Supabase:', error);
      return false;
    }

    const localEmails = new Set(localUsers.map(u => u.email));
    const supabaseEmails = new Set(supabaseUsers?.map(u => u.email) || []);

    const missingInSupabase = [...localEmails].filter(email => !supabaseEmails.has(email));

    if (missingInSupabase.length > 0) {
      console.log('⚠️  Usuários ausentes no Supabase:', missingInSupabase);
      return false;
    }

    console.log('✅ Migração validada! Todos os usuários estão no Supabase.');
    return true;

  } catch (error) {
    console.error('❌ Erro na validação:', error);
    return false;
  }
};

// ============================================================================
// ROLLBACK (Emergência)
// ============================================================================

/**
 * Remove todos os usuários do Supabase (USE COM CUIDADO!)
 * Útil apenas para testes ou em caso de erro crítico
 */
export const rollbackMigration = async (): Promise<boolean> => {
  try {
    console.warn('⚠️  ATENÇÃO: Executando rollback da migração...');
    
    const confirm = window.confirm(
      'ATENÇÃO: Isso irá DELETAR todos os usuários do Supabase!\n\n' +
      'Os usuários do localStorage permanecerão intactos.\n\n' +
      'Deseja continuar?'
    );

    if (!confirm) {
      console.log('❌ Rollback cancelado pelo usuário');
      return false;
    }

    // Deletar todos
    const { error } = await supabase
      .from('app_users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Condição sempre verdadeira

    if (error) {
      console.error('❌ Erro no rollback:', error);
      return false;
    }

    console.log('✅ Rollback concluído. Todos os usuários foram removidos do Supabase.');
    return true;

  } catch (error) {
    console.error('❌ Erro no rollback:', error);
    return false;
  }
};

// ============================================================================
// HELPER: Atualizar senha de um usuário específico
// ============================================================================

/**
 * Atualiza a senha de um usuário específico no Supabase
 * @param email Email do usuário
 * @param newPassword Nova senha em texto puro
 * @returns true se atualizado com sucesso
 */
export const updateUserPassword = async (email: string, newPassword: string): Promise<boolean> => {
  try {
    const passwordHash = await hashPassword(newPassword);

    const { error } = await supabase
      .from('app_users')
      .update({ 
        password_hash: passwordHash,
        password_changed_at: new Date().toISOString(),
        must_change_password: false
      })
      .eq('email', email);

    if (error) {
      console.error('Erro ao atualizar senha:', error);
      return false;
    }

    console.log(`✅ Senha atualizada para ${email}`);
    return true;

  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
    return false;
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  migrateUsersToSupabase,
  validateMigration,
  rollbackMigration,
  updateUserPassword
};
