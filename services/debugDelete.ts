// Debug script para testar deleção no Supabase
import { supabase } from './supabase';

export const testDeleteBankAccount = async () => {
  try {
    console.log('🧪 TESTE: Tentando deletar conta bancária de teste...');
    
    // 1. Criar conta de teste
    const testId = 'test-delete-' + Date.now();
    console.log('1️⃣ Criando conta de teste:', testId);
    
    const { data: insertData, error: insertError } = await supabase
      .from('contas_bancarias')
      .insert({
        id: testId,
        bank_name: 'Banco de Teste Para Delete',
        owner: 'Teste',
        agency: '0001',
        account_number: '123456',
        active: true,
        company_id: null
      });
    
    if (insertError) {
      console.error('❌ Erro ao inserir:', insertError);
      return;
    }
    console.log('✅ Conta criada:', insertData);
    
    // 2. Verificar que foi criada
    const { data: selectBefore } = await supabase
      .from('contas_bancarias')
      .select('*')
      .eq('id', testId);
    console.log('2️⃣ Conta antes de deletar:', selectBefore);
    
    // 3. DELETAR
    console.log('3️⃣ Deletando...');
    const { data: deleteData, error: deleteError } = await supabase
      .from('contas_bancarias')
      .delete()
      .eq('id', testId)
      .select();
    
    console.log('🔴 DELETE Response:');
    console.log('   Data:', deleteData);
    console.log('   Error:', deleteError);
    
    if (deleteError) {
      console.error('❌ Erro ao deletar:', deleteError);
      return;
    }
    
    // 4. Verificar que foi deletada
    const { data: selectAfter } = await supabase
      .from('contas_bancarias')
      .select('*')
      .eq('id', testId);
    console.log('4️⃣ Conta após deletar:', selectAfter);
    
    if (selectAfter && selectAfter.length === 0) {
      console.log('✅ DELETE FUNCIONOU!');
    } else {
      console.error('❌ DELETE FALHOU - conta ainda existe');
    }
    
  } catch (error) {
    console.error('🔥 Erro no teste:', error);
  }
};

export const testDeleteExpenseType = async () => {
  try {
    console.log('🧪 TESTE: Tentando deletar tipo de despesa de teste...');
    
    // 1. Criar tipo de teste
    const testId = 'test-expense-' + Date.now();
    console.log('1️⃣ Criando tipo de teste:', testId);
    
    const { data: insertData, error: insertError } = await supabase
      .from('expense_types')
      .insert({
        id: testId,
        name: 'Tipo de Teste Para Delete',
        type_key: 'custom',
        color: 'bg-gray-50',
        icon: null,
        is_system: false,
        company_id: null
      });
    
    if (insertError) {
      console.error('❌ Erro ao inserir:', insertError);
      return;
    }
    console.log('✅ Tipo criado:', insertData);
    
    // 2. Verificar que foi criado
    const { data: selectBefore } = await supabase
      .from('expense_types')
      .select('*')
      .eq('id', testId);
    console.log('2️⃣ Tipo antes de deletar:', selectBefore);
    
    // 3. DELETAR
    console.log('3️⃣ Deletando...');
    const { data: deleteData, error: deleteError } = await supabase
      .from('expense_types')
      .delete()
      .eq('id', testId)
      .select();
    
    console.log('🔴 DELETE Response:');
    console.log('   Data:', deleteData);
    console.log('   Error:', deleteError);
    
    if (deleteError) {
      console.error('❌ Erro ao deletar:', deleteError);
      return;
    }
    
    // 4. Verificar que foi deletado
    const { data: selectAfter } = await supabase
      .from('expense_types')
      .select('*')
      .eq('id', testId);
    console.log('4️⃣ Tipo após deletar:', selectAfter);
    
    if (selectAfter && selectAfter.length === 0) {
      console.log('✅ DELETE FUNCIONOU!');
    } else {
      console.error('❌ DELETE FALHOU - tipo ainda existe');
    }
    
  } catch (error) {
    console.error('🔥 Erro no teste:', error);
  }
};

// Rodar testes
(async () => {
  console.log('\n================== TESTE 1: CONTAS BANCÁRIAS ==================\n');
  await testDeleteBankAccount();
  
  console.log('\n\n================== TESTE 2: TIPOS DE DESPESA ==================\n');
  await testDeleteExpenseType();
})();
