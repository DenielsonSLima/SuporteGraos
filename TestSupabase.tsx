import React, { useEffect, useState } from 'react';
import { supabase } from './services/supabase';
import { Loader2, RefreshCw } from 'lucide-react';

interface PingResult {
  ok: boolean;
  message: string;
  rows?: any[];
  error?: string;
}

const TestSupabase: React.FC = () => {
  const [result, setResult] = useState<PingResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSample = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .limit(5);

      if (error) {
        setResult({ ok: false, message: 'Erro ao consultar companies', error: error.message });
      } else {
        setResult({ ok: true, message: 'Conexão OK', rows: data || [] });
      }
    } catch (err: any) {
      setResult({ ok: false, message: 'Falha inesperada', error: err?.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSample();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Diagnóstico</p>
            <h1 className="text-2xl font-bold text-white">Teste de Conexão Supabase</h1>
            <p className="text-sm text-slate-400">Consulta a tabela companies com limite 5</p>
          </div>
          <button
            onClick={fetchSample}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-500 disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Recarregar
          </button>
        </div>

        {result === null || isLoading ? (
          <div className="flex items-center gap-3 text-slate-300">
            <Loader2 className="animate-spin" size={18} />
            <span>Consultando Supabase...</span>
          </div>
        ) : result.ok ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <strong>{result.message}</strong>
            </div>
            <pre className="max-h-96 overflow-auto rounded-lg bg-slate-900/70 p-4 text-xs text-slate-100 border border-slate-800">
              {JSON.stringify(result.rows, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <strong>{result.message}</strong>
            </div>
            {result.error && (
              <p className="text-sm text-red-300">{result.error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestSupabase;
