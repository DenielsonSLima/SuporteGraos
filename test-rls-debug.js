// ============================================================================
// SCRIPT DE TESTE: Validar RLS + JWT + Dados
// ============================================================================
// Cole este script no Console (F12) depois de fazer login
// ============================================================================

console.log('🔍 INICIANDO DIAGNÓSTICO DE RLS...\n');

// 1. VALIDAR TOKEN JWT
console.log('=== 1. VALIDANDO JWT TOKEN ===');
const userStr = sessionStorage.getItem('sg_user');
if (!userStr) {
  console.error('❌ ERRO: Nenhum usuário no sessionStorage!');
} else {
  const user = JSON.parse(userStr);
  console.log('✅ Usuário encontrado:', user.email);
  console.log('📧 Nome:', user.name);
  console.log('🔑 Token presente:', !!user.token);
  
  if (user.token) {
    const parts = user.token.split('.');
    if (parts.length === 3) {
      try {
        const decoded = JSON.parse(atob(parts[1]));
        console.log('✅ JWT Válido');
        console.log('   - sub (user_id):', decoded.sub);
        console.log('   - role:', decoded.role);
        console.log('   - email:', decoded.email);
        console.log('   - expires_at:', new Date(decoded.exp * 1000).toLocaleString());
      } catch (e) {
        console.error('❌ Erro ao decodificar JWT:', e.message);
      }
    } else {
      console.error('❌ Token não é um JWT válido (esperado 3 partes, recebido ' + parts.length + ')');
    }
  }
}

// 2. TESTAR QUERY SIMPLES NO SUPABASE
console.log('\n=== 2. TESTANDO QUERY AO SUPABASE ===');
const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.7');
const supabaseUrl = 'https://vqhjbsiwzgxaozcedqcn.supabase.co';
const supabaseAnonKey = 'sb_publishable_m8MBqafWFUIhbSmhatvDYw_NWrO_E8V';
const testClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: window.sessionStorage,
    storageKey: 'supabase.auth.token'
  }
});

// Restaurar sessão
const { data: { session } } = await testClient.auth.getSession();
if (session) {
  console.log('✅ Sessão Supabase ativa');
  console.log('   - User ID:', session.user.id);
  console.log('   - Email:', session.user.email);
  console.log('   - Token:', session.access_token.substring(0, 30) + '...');
} else {
  console.error('❌ Nenhuma sessão Supabase ativa!');
}

// 3. TENTAR BUSCAR PARCEIROS
console.log('\n=== 3. BUSCANDO PARCEIROS ===');
try {
  const { data: partners, error } = await testClient
    .from('partners')
    .select('*')
    .limit(5);
  
  if (error) {
    console.error('❌ ERRO ao buscar parceiros:', error.message);
    console.error('   Código de erro:', error.code);
    console.error('   Detalhes:', error);
  } else {
    console.log('✅ Parceiros buscados com sucesso!');
    console.log('   - Total encontrado:', partners?.length || 0);
    if (partners && partners.length > 0) {
      console.log('   - Primeiro parceiro:', partners[0].name);
      console.log('✅✅✅ RLS ESTÁ FUNCIONANDO! ✅✅✅');
    } else {
      console.warn('⚠️ Query funcionou, mas nenhum parceiro retornou');
      console.warn('   Possível que a tabela esteja vazia ou usuário não tem permissão');
    }
  }
} catch (e) {
  console.error('❌ ERRO na query:', e.message);
}

// 4. VALIDAR RLS NA TABELA
console.log('\n=== 4. CHECANDO RLS NA TABELA ===');
try {
  const { data: policies, error } = await testClient
    .from('partners')
    .select('*')
    .limit(0); // Só pra validar RLS, sem buscar dados
  
  console.log('✅ RLS está ativo na tabela partners');
} catch (e) {
  if (e.message.includes('row level security')) {
    console.error('❌ RLS bloqueando requisição');
  } else {
    console.error('❌ Outro erro:', e.message);
  }
}

console.log('\n=== RESUMO ===');
console.log('Se todos os testes passaram com ✅, então:');
console.log('1. Recarregue a página');
console.log('2. A aba "Parceiros" deve mostrar os dados');
console.log('\nSe algum falhou com ❌, compartilhe o erro comigo!');
