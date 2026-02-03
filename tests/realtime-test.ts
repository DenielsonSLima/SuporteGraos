/**
 * 🧪 TESTE DE REALTIME - Utilitário de Validação
 * 
 * Usado para testar conexões realtime em tabelas do Supabase
 * antes de implementar em produção.
 * 
 * Uso:
 * ```typescript
 * import { testRealtimeConnection } from './tests/realtime-test';
 * 
 * // Testar tabela
 * const channel = await testRealtimeConnection('partners');
 * 
 * // Parar teste
 * channel.unsubscribe();
 * ```
 */

import { supabase } from '../services/supabase';

interface RealtimeTestResult {
  channel: any;
  stop: () => void;
}

/**
 * Testa conexão realtime em uma tabela específica
 */
export const testRealtimeConnection = async (
  table: string,
  timeout: number = 30000
): Promise<RealtimeTestResult> => {
  console.log(`🧪 Testando realtime em '${table}'...`);
  
  const startTime = Date.now();
  let eventCount = 0;
  
  const channel = supabase
    .channel(`test_${table}_${Date.now()}`)
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table 
    }, (payload) => {
      eventCount++;
      const elapsed = Date.now() - startTime;
      
      console.log('✅ Evento recebido:', {
        table,
        eventType: payload.eventType,
        elapsed: `${elapsed}ms`,
        eventNumber: eventCount,
        data: payload.new || payload.old
      });
    })
    .subscribe((status) => {
      const elapsed = Date.now() - startTime;
      
      if (status === 'SUBSCRIBED') {
        console.log(`📡 Status: CONECTADO (${elapsed}ms)`);
        console.log(`✅ Realtime funcionando em '${table}'`);
        console.log(`⏱️ Aguardando eventos por ${timeout/1000}s...`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`❌ ERRO no canal '${table}'`);
      } else if (status === 'TIMED_OUT') {
        console.warn(`⏱️ TIMEOUT no canal '${table}'`);
      } else {
        console.log(`📡 Status: ${status}`);
      }
    });
  
  // Auto-encerrar após timeout
  const timeoutId = setTimeout(() => {
    console.log(`⏱️ Timeout alcançado (${timeout/1000}s)`);
    console.log(`📊 Total de eventos recebidos: ${eventCount}`);
    channel.unsubscribe();
  }, timeout);
  
  // Função para parar manualmente
  const stop = () => {
    clearTimeout(timeoutId);
    console.log(`🛑 Teste encerrado manualmente`);
    console.log(`📊 Total de eventos recebidos: ${eventCount}`);
    channel.unsubscribe();
  };
  
  return { channel, stop };
};

/**
 * Testa múltiplas tabelas simultaneamente
 */
export const testMultipleTables = async (
  tables: string[],
  timeout: number = 30000
): Promise<{ [key: string]: RealtimeTestResult }> => {
  console.log(`🧪 Testando ${tables.length} tabelas simultaneamente...`);
  
  const results: { [key: string]: RealtimeTestResult } = {};
  
  for (const table of tables) {
    results[table] = await testRealtimeConnection(table, timeout);
    // Pequeno delay entre inicializações
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
};

/**
 * Para todos os testes ativos
 */
export const stopAllTests = (results: { [key: string]: RealtimeTestResult }) => {
  console.log('🛑 Encerrando todos os testes...');
  Object.values(results).forEach(result => result.stop());
  console.log('✅ Todos os testes encerrados');
};

// Exemplo de uso (comentado)
/*
// Teste simples
const test = await testRealtimeConnection('partners', 60000);
// ... fazer INSERT/UPDATE/DELETE na tabela no Supabase Dashboard
test.stop();

// Teste múltiplo
const tests = await testMultipleTables(['partners', 'loadings', 'sales_orders']);
// ... fazer operações
stopAllTests(tests);
*/
