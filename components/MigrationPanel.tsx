import React, { useState } from 'react';
import { Database, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { migrateUsersToSupabase, validateMigration } from '../services/migrateUsers';

/**
 * Componente temporário para migração de usuários
 * REMOVER após migração concluída
 */
const MigrationPanel: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);

  const handleMigrate = async () => {
    setStatus('migrating');
    setResult(null);

    try {
      const migrationResult = await migrateUsersToSupabase();
      setResult(migrationResult);
      
      if (migrationResult.success) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error: any) {
      setStatus('error');
      setResult({ 
        success: false, 
        errors: [error.message],
        migratedCount: 0,
        users: []
      });
    }
  };

  const handleValidate = async () => {
    const isValid = await validateMigration();
    alert(isValid ? '✅ Validação OK! Todos usuários migrados.' : '⚠️ Alguns usuários não foram migrados.');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <Database size={28} />
            <div>
              <h2 className="text-2xl font-black">Migração de Usuários</h2>
              <p className="text-sm text-indigo-100 mt-1">
                Converter senhas em texto puro para hash bcrypt
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Idle */}
          {status === 'idle' && (
            <div className="text-center py-8">
              <div className="mb-6">
                <Upload size={64} className="mx-auto text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                Pronto para Migrar
              </h3>
              <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
                Esta ação irá converter todos os usuários do localStorage para o Supabase
                com senhas criptografadas usando bcrypt.
              </p>
              <button
                onClick={handleMigrate}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all active:scale-95 shadow-lg"
              >
                Iniciar Migração
              </button>
            </div>
          )}

          {/* Status Migrating */}
          {status === 'migrating' && (
            <div className="text-center py-8">
              <Loader2 size={48} className="mx-auto text-indigo-600 animate-spin mb-4" />
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                Migrando Usuários...
              </h3>
              <p className="text-sm text-slate-600">
                Aguarde enquanto processamos os dados
              </p>
            </div>
          )}

          {/* Status Success */}
          {status === 'success' && result && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={24} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-emerald-900 mb-2">
                      Migração Concluída com Sucesso!
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-emerald-700">Usuários migrados:</span>
                        <span className="font-bold text-emerald-900">{result.migratedCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-700">Já existiam:</span>
                        <span className="font-bold text-emerald-900">
                          {result.users.filter((u: any) => u.status === 'skipped').length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista de Usuários */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
                  Detalhes da Migração:
                </h4>
                <div className="space-y-2">
                  {result.users.map((user: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200"
                    >
                      <span className="text-sm font-medium text-slate-700">
                        {user.email}
                      </span>
                      <span
                        className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                          user.status === 'migrated'
                            ? 'bg-emerald-100 text-emerald-700'
                            : user.status === 'skipped'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {user.status === 'migrated'
                          ? '✅ Migrado'
                          : user.status === 'skipped'
                          ? '⏭️ Já Existia'
                          : '❌ Erro'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-3">
                <button
                  onClick={handleValidate}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all"
                >
                  Validar Migração
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all"
                >
                  Ir para Login
                </button>
              </div>
            </div>
          )}

          {/* Status Error */}
          {status === 'error' && result && (
            <div className="space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle size={24} className="text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-rose-900 mb-2">
                      Erro na Migração
                    </h3>
                    <div className="space-y-2">
                      {result.errors.map((error: string, idx: number) => (
                        <p key={idx} className="text-sm text-rose-700">
                          • {error}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStatus('idle')}
                className="w-full bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wide transition-all"
              >
                Tentar Novamente
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4">
          <p className="text-xs text-slate-500 text-center">
            ⚠️ Este painel pode ser removido após a migração concluída
          </p>
        </div>
      </div>
    </div>
  );
};

export default MigrationPanel;
