#!/usr/bin/env node

/**
 * Script de teste para verificar se a persistência de audit_logs está funcionando
 * Insere um registro de teste direto no Supabase
 */

const SUPABASE_URL = 'https://rbpllybacqygmpzgcbmw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJicGxseWJhY3F5Z21wemdjYm13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA5NzAwNDcsImV4cCI6MjA0NjU0NjA0N30.TzPqw8tRe3rBqk3jGfSx1xJHJT3sVbXhFZ6w4ItZXRc';

async function testAuditInsert() {
  console.log('🧪 Testando inserção de audit_log com user_id = NULL...\n');

  try {
    const payload = {
      id: crypto.randomUUID(),
      user_id: null,  // ✅ NULL em vez de UUID inválido
      user_name: 'TESTE_SISTEMA',
      action: 'TEST_AUDIT_FIX',
      module: 'TESTING',
      entity_id: 'test-001',
      description: 'Teste de persistência de audit_log com fix NULL',
      metadata: { teste: true },
      created_at: new Date().toISOString()
    };

    console.log('📤 Payload a inserir:', JSON.stringify(payload, null, 2));
    console.log('');

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/audit_logs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      }
    );

    const responseText = await response.text();
    console.log(`📥 Status HTTP: ${response.status}`);
    console.log(`📥 Resposta: ${responseText}\n`);

    if (response.ok) {
      console.log('✅ SUCCESS: Audit log inserido com sucesso!');
      console.log('✅ A correção está funcionando - NULL user_id é aceito!');
      return true;
    } else {
      console.log('❌ ERRO: Falha ao inserir audit log');
      try {
        const error = JSON.parse(responseText);
        console.log('❌ Detalhes do erro:', error);
      } catch {
        console.log('❌ Resposta bruta:', responseText);
      }
      return false;
    }
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
    return false;
  }
}

async function checkAuditLogsCount() {
  console.log('\n📊 Verificando total de registros em audit_logs...\n');

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/audit_logs?select=count()&limit=0`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const countHeader = response.headers.get('content-range');
    console.log(`📊 Content-Range: ${countHeader}`);

    if (countHeader) {
      const match = countHeader.match(/(\d+)$/);
      if (match) {
        const total = parseInt(match[1]) + 1; // +1 para contar do 0
        console.log(`\n✅ Total de registros em audit_logs: ${total}\n`);
      }
    }
  } catch (err) {
    console.error('❌ Erro ao contar registros:', err);
  }
}

// Executar testes
(async () => {
  const success = await testAuditInsert();
  if (success) {
    await checkAuditLogsCount();
  }
})();
