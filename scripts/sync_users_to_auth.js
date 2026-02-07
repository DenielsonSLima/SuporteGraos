/**
 * ============================================================================
 * SCRIPT: Sincronizar usuários de app_users para auth.users (Supabase Auth)
 * ============================================================================
 * 
 * Uso:
 * node scripts/sync_users_to_auth.js
 * 
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Carregar .env
dotenv.config();

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERRO: Configure as variáveis de ambiente:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nVerifique seu arquivo .env na raiz do projeto');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

const generatePassword = () => {
  return crypto.randomBytes(6).toString('hex').slice(0, 12);
};

const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// ============================================================================
// SCRIPT PRINCIPAL
// ============================================================================

async function syncUsersToAuth() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  🔄 SINCRONIZANDO USUÁRIOS PARA AUTH.USERS             ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Buscar todos os usuários de app_users
    console.log('📋 Buscando usuários em app_users...');
    const { data: appUsers, error: fetchError } = await supabase
      .from('app_users')
      .select('id, first_name, last_name, email, cpf, phone, password_hash, active')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Erro ao buscar usuários: ${fetchError.message}`);
    }

    console.log(`✅ Encontrados ${appUsers?.length || 0} usuários\n`);

    if (!appUsers || appUsers.length === 0) {
      console.log('⚠️  Nenhum usuário encontrado!');
      return;
    }

    // 2. Buscar usuários que já existem em auth.users
    console.log('🔍 Verificando quais já existem em auth.users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      throw new Error(`Erro ao listar auth.users: ${authError.message}`);
    }

    const existingEmails = new Set(authUsers?.users?.map(u => u.email) || []);
    console.log(`✅ ${existingEmails.size} usuários já em auth.users\n`);

    // 3. Sincronizar usuários
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of appUsers) {
      // Pular se já existe
      if (existingEmails.has(user.email)) {
        console.log(`⏭️  SKIP: ${user.email} (já existe em auth.users)`);
        skipped++;
        continue;
      }

      // Pular usuários inativos
      if (!user.active) {
        console.log(`⏭️  SKIP: ${user.email} (usuário inativo)`);
        skipped++;
        continue;
      }

      console.log(`\n📝 Criando: ${user.first_name} ${user.last_name} (${user.email})`);

      try {
        // Gerar senha temporária
        const tempPassword = generatePassword();

        // Criar usuário em auth.users
        const { data, error } = await supabase.auth.admin.createUser({
          email: user.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            first_name: user.first_name,
            last_name: user.last_name,
            cpf: user.cpf,
            phone: user.phone,
          },
        });

        if (error) {
          throw error;
        }

        console.log(`   ✅ Criado em auth.users com ID: ${data.user?.id}`);
        console.log(`   🔑 Senha temporária: ${tempPassword}`);
        created++;

        // Pequeno delay para não sobrecarregar
        await sleep(500);
      } catch (err) {
        console.error(`   ❌ ERRO: ${err.message}`);
        failed++;
      }
    }

    // 4. Resumo
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  📊 RESUMO DA SINCRONIZAÇÃO                            ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`✅ Criados:   ${created}`);
    console.log(`⏭️  Pulados:   ${skipped}`);
    console.log(`❌ Falhados:  ${failed}`);
    console.log(`📈 Total:    ${appUsers.length}\n`);

    if (created > 0) {
      console.log('✨ Sincronização concluída com sucesso!');
      console.log('💡 Próximos passos:');
      console.log('   1. Informe aos usuários as senhas temporárias');
      console.log('   2. Eles devem alterar a senha no primeiro login');
      console.log('   3. Recarregue o sistema (F5)');
    }

  } catch (error) {
    console.error('\n❌ ERRO FATAL:', error.message);
    console.error('\n📝 Debug Info:');
    console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Not set');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set');
    process.exit(1);
  }
}

// ============================================================================
// EXECUTAR
// ============================================================================

syncUsersToAuth().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
