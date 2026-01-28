import { testDeleteBankAccount, testDeleteExpenseType } from './services/debugDelete';

export async function runDeleteTests() {
  console.log('🚀 Iniciando testes de DELETE...\n');
  
  try {
    await testDeleteBankAccount();
    console.log('\n' + '='.repeat(60) + '\n');
    await testDeleteExpenseType();
  } catch (error) {
    console.error('Erro durante os testes:', error);
  }
}

// Expor globalmente para usar no console
(window as any).runDeleteTests = runDeleteTests;
console.log('✅ Testes disponíveis em window.runDeleteTests()');
