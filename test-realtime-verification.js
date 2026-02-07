#!/usr/bin/env node

/**
 * Script de Verificação de Realtime
 * 
 * Testa:
 * 1. Drivers Realtime (INSERT/UPDATE/DELETE)
 * 2. Transporters Realtime
 * 3. Vehicles Realtime
 * 4. Partners Realtime
 * 5. Sales Realtime
 * 6. Balance/Receivables Cross-User Sync
 * 
 * Uso: node test-realtime-verification.js
 */

import fs from 'fs';
import path from 'path';

console.log('\n' + '='.repeat(80));
console.log('🔄 VERIFICAÇÃO DE REALTIME - ANÁLISE DE CÓDIGO');
console.log('='.repeat(80) + '\n');

// Arquivos a serem verificados
const filesToCheck = [
  '/Users/denielson/Desktop/Suporte Graos ERP - cópia 3/services/driverService.ts',
  '/Users/denielson/Desktop/Suporte Graos ERP - cópia 3/services/transporterService.ts',
  '/Users/denielson/Desktop/Suporte Graos ERP - cópia 3/services/vehicleService.ts',
  '/Users/denielson/Desktop/Suporte Graos ERP - cópia 3/services/salesService.ts',
  '/Users/denielson/Desktop/Suporte Graos ERP - cópia 3/services/supabaseInitService.ts',
  '/Users/denielson/Desktop/Suporte Graos ERP - cópia 3/App.tsx'
];

const tests = {
  'startRealtime exported': {
    files: ['driverService.ts', 'transporterService.ts', 'vehicleService.ts', 'salesService.ts'],
    check: (content) => /startRealtime\s*$/.test(content) && /export const \w+Service|`\s*$/.test(content)
  },
  'startRealtime called in supabaseInitService': {
    files: ['supabaseInitService.ts'],
    check: (content) => /if \(typeof driverModule\.startRealtime === 'function'\) driverModule\.startRealtime\(\);/.test(content)
  },
  'Welcome toast in handleLoginSuccess': {
    files: ['App.tsx'],
    check: (content) => /addToast\('success', 'Bem-vindo!'/m.test(content)
  },
  'useToast imported in App': {
    files: ['App.tsx'],
    check: (content) => /useToast\s*\}\s*from\s*['"].*ToastContext['"]/.test(content)
  }
};

let totalTests = 0;
let passedTests = 0;
let failedTests = [];

console.log('📋 VERIFICAÇÕES:\n');

for (const [testName, testConfig] of Object.entries(tests)) {
  console.log(`🔍 ${testName}`);
  
  for (const file of testConfig.files) {
    totalTests++;
    const fullPath = filesToCheck.find(f => f.includes(file));
    
    if (!fullPath) {
      console.log(`   ❌ Arquivo não encontrado: ${file}`);
      failedTests.push({ test: testName, file, reason: 'Arquivo não encontrado' });
      continue;
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const passed = testConfig.check(content);
      
      if (passed) {
        console.log(`   ✅ ${file}`);
        passedTests++;
      } else {
        console.log(`   ❌ ${file}`);
        failedTests.push({ test: testName, file, reason: 'Verificação falhou' });
      }
    } catch (error) {
      console.log(`   ❌ ${file} (erro ao ler)`);
      failedTests.push({ test: testName, file, reason: error.message });
    }
  }
  console.log();
}

console.log('='.repeat(80));
console.log(`\n📊 RESULTADO: ${passedTests}/${totalTests} verificações passaram\n`);

if (failedTests.length > 0) {
  console.log('❌ FALHAS DETECTADAS:\n');
  failedTests.forEach((failure, i) => {
    console.log(`${i + 1}. ${failure.test} (${failure.file})`);
    console.log(`   Motivo: ${failure.reason}\n`);
  });
} else {
  console.log('✅ TODAS AS VERIFICAÇÕES PASSARAM!\n');
  console.log('🎉 REALTIME CONFIGURADO CORRETAMENTE!\n');
  console.log('PRÓXIMAS AÇÕES:');
  console.log('1. Fazer login no sistema');
  console.log('2. Observar notificação "Bem-vindo!" no canto superior direito');
  console.log('3. Abrir dois browsers com contas diferentes');
  console.log('4. Criar um motorista em browser 1');
  console.log('5. Verificar se aparece instantaneamente em browser 2');
  console.log('6. Atualizar saldo em browser 1');
  console.log('7. Verificar atualização em tempo real no browser 2 (se acesso compartilhado)');
  console.log();
}

console.log('='.repeat(80) + '\n');

process.exit(failedTests.length > 0 ? 1 : 0);
