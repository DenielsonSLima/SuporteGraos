import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        global: 'globalThis',
        'process.env': {}
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          buffer: 'buffer/',
          util: 'util/',
          stream: 'stream-browserify',
          events: 'events'
        }
      },
      optimizeDeps: {
        esbuildOptions: {
          define: {
            global: 'globalThis'
          }
        },
        include: ['buffer', 'util', 'stream-browserify', 'events']
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: (id) => {
              // Normaliza o caminho para evitar problemas de case sensitivity
              const normalizedId = id.replace(/\\/g, '/');
              
              // Vendor chunks - bibliotecas grandes separadas
              if (normalizedId.includes('node_modules')) {
                // React e ReactDOM em um chunk separado
                if (normalizedId.includes('/react/') || normalizedId.includes('/react-dom/')) {
                  return 'vendor-react';
                }
                // Scheduler é dependency do React, deve ir junto
                if (normalizedId.includes('/scheduler/')) {
                  return 'vendor-react';
                }
                // Lucide icons em chunk separado
                if (normalizedId.includes('lucide-react')) {
                  return 'vendor-icons';
                }
                // Supabase em chunk separado
                if (normalizedId.includes('@supabase')) {
                  return 'vendor-supabase';
                }
                // Outras bibliotecas vendors
                return 'vendor-libs';
              }
              
              // Não separa services e components compartilhados para evitar chunks circulares
              // Eles serão incluídos nos módulos que os usam
              
              // Módulos principais ficam no chunk principal para evitar dependências cíclicas
              // Cada módulo será lazy loaded conforme necessário
            }
          }
        },
        // Aumenta o limite de aviso para 2MB
        chunkSizeWarningLimit: 2000,
        // Usar esbuild para minificação (mais rápido e sem dependências extras)
        minify: 'esbuild',
        // Configurações para melhor compatibilidade com diferentes sistemas
        commonjsOptions: {
          include: [/node_modules/],
          transformMixedEsModules: true
        }
      }
    };
});
