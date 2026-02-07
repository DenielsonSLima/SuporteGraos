import './utils/polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('%c╔════════════════════════════════════════╗', 'color: magenta; font-weight: bold; font-size: 14px;');
console.log('%c║  🎯 INDEX.TSX - INICIANDO APLICAÇÃO  ║', 'color: magenta; font-weight: bold; font-size: 14px;');
console.log('%c╚════════════════════════════════════════╝', 'color: magenta; font-weight: bold; font-size: 14px;');
console.log('[INDEX] 📚 Imports concluídos com sucesso');
console.log('[INDEX] 🔍 Procurando elemento root no DOM...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('[INDEX] ❌ ERRO CRÍTICO: Elemento root não encontrado!');
  throw new Error("Could not find root element to mount to");
}

console.log('[INDEX] ✅ Elemento root encontrado:', rootElement);
console.log('[INDEX] 🏗️  Criando React root...');

const root = ReactDOM.createRoot(rootElement);

console.log('[INDEX] 🎨 Renderizando App...');

// ⚠️ StrictMode em desenvolvimento faz double-render propositalmente
// Comentado para clareza dos logs durante desenvolvimento
// Em produção, use StrictMode para detectar bugs
const isDevelopment = process.env.NODE_ENV === 'development';

root.render(
  isDevelopment ? (
    // Em desenvolvimento: sem StrictMode para logs mais limpos
    <App />
  ) : (
    // Em produção: com StrictMode para detecção de bugs
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
);

console.log('[INDEX] 🚀 React render iniciado! Aguardando montagem dos componentes...\n');