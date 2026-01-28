
import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Zap, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Activity, 
  Cpu, 
  Database,
  Globe
} from 'lucide-react';
import SettingsSubPage from '../components/SettingsSubPage';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '../../../services/supabase';

interface Props {
  onBack: () => void;
}

type StatusType = 'idle' | 'checking' | 'online' | 'offline' | 'degraded';

interface ServiceStatus {
  id: string;
  name: string;
  type: string;
  status: StatusType;
  latency: number | null;
  message: string;
  icon: any;
  color: string;
}

const ApiSettings: React.FC<Props> = ({ onBack }) => {
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const [services, setServices] = useState<ServiceStatus[]>([
    {
      id: 'supabase_db',
      name: 'Supabase Database',
      type: 'PostgreSQL Cloud',
      status: 'idle',
      latency: null,
      message: 'Aguardando verificação...',
      icon: Database,
      color: 'text-emerald-600 bg-emerald-50'
    },
    {
      id: 'supabase_realtime',
      name: 'Supabase Realtime',
      type: 'WebSocket Subscriptions',
      status: 'idle',
      latency: null,
      message: 'Aguardando verificação...',
      icon: Zap,
      color: 'text-violet-600 bg-violet-50'
    },
    {
      id: 'gemini',
      name: 'Google Gemini AI',
      type: 'Generative Models',
      status: 'idle',
      latency: null,
      message: 'Aguardando verificação...',
      icon: Sparkles,
      color: 'text-rose-600 bg-rose-50'
    },
    {
      id: 'vercel_edge',
      name: 'Vercel Edge Network',
      type: 'CDN & Serverless',
      status: 'idle',
      latency: null,
      message: 'Aguardando verificação...',
      icon: Globe,
      color: 'text-blue-600 bg-blue-50'
    }
  ]);

  const updateServiceStatus = (id: string, updates: Partial<ServiceStatus>) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const checkSupabaseDB = async () => {
    updateServiceStatus('supabase_db', { status: 'checking', message: 'Conectando ao PostgreSQL...' });
    const startTime = performance.now();
    
    try {
      // Testa conexão real com Supabase executando uma query simples em tabela que existe
      const { data, error } = await supabase
        .from('partners')
        .select('id')
        .limit(1);

      if (error) throw error;

      const latency = Math.round(performance.now() - startTime);
      updateServiceStatus('supabase_db', { 
        status: 'online', 
        latency, 
        message: 'PostgreSQL Operacional' 
      });
    } catch (error: any) {
      console.error('Supabase DB Check Error:', error);
      updateServiceStatus('supabase_db', { 
        status: 'offline', 
        latency: null, 
        message: error.message || 'Falha na conexão' 
      });
    }
  };

  const checkSupabaseRealtime = async () => {
    updateServiceStatus('supabase_realtime', { status: 'checking', message: 'Testando WebSocket...' });
    const startTime = performance.now();
    
    try {
      // Testa conexão Realtime criando e removendo uma subscription
      const channel = supabase.channel('health_check_' + Date.now());
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
        
        channel
          .on('presence', { event: 'sync' }, () => {
            clearTimeout(timeout);
            resolve();
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              clearTimeout(timeout);
              resolve();
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              clearTimeout(timeout);
              reject(new Error('Subscription failed'));
            }
          });
      });

      await supabase.removeChannel(channel);
      
      const latency = Math.round(performance.now() - startTime);
      updateServiceStatus('supabase_realtime', { 
        status: 'online', 
        latency, 
        message: 'WebSocket Conectado' 
      });
    } catch (error: any) {
      console.error('Supabase Realtime Check Error:', error);
      updateServiceStatus('supabase_realtime', { 
        status: 'offline', 
        latency: null, 
        message: error.message || 'WebSocket Indisponível' 
      });
    }
  };

  const checkVercelEdge = async () => {
    updateServiceStatus('vercel_edge', { status: 'checking', message: 'Verificando CDN...' });
    const startTime = performance.now();
    
    try {
      // Verifica o próprio frontend (se está no Vercel ou localhost)
      const response = await fetch(window.location.origin + '/metadata.json');
      if (!response.ok) throw new Error('CDN não respondeu');
      
      const latency = Math.round(performance.now() - startTime);
      const isVercel = window.location.hostname.includes('vercel.app');
      
      updateServiceStatus('vercel_edge', { 
        status: 'online', 
        latency, 
        message: isVercel ? 'Edge Network Ativo' : 'Localhost (Dev Mode)' 
      });
    } catch (error: any) {
      console.error('Vercel Edge Check Error:', error);
      updateServiceStatus('vercel_edge', { 
        status: 'degraded', 
        latency: null, 
        message: 'CDN Inacessível' 
      });
    }
  };

  const checkGemini = async () => {
    updateServiceStatus('gemini', { status: 'checking', message: 'Autenticando...' });
    const startTime = performance.now();
    
    try {
      if (!process.env.API_KEY) throw new Error("Chave de API não encontrada");

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Realiza uma chamada leve para validar a chave e medir latência real
      await ai.models.countTokens({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: 'ping' }] },
      });

      const latency = Math.round(performance.now() - startTime);
      updateServiceStatus('gemini', { 
        status: 'online', 
        latency, 
        message: 'Operacional (Autenticado)' 
      });
    } catch (error: any) {
      console.error('Gemini Check Error:', error);
      updateServiceStatus('gemini', { 
        status: 'offline', 
        latency: null, 
        message: error.message || 'Falha na conexão' 
      });
    }
  };

  const runDiagnostics = async () => {
    setIsChecking(true);
    setLastCheck(new Date());

    // Executa verificações em paralelo real
    await Promise.all([
      checkSupabaseDB(),
      checkSupabaseRealtime(),
      checkGemini(),
      checkVercelEdge()
    ]);
    
    setIsChecking(false);
  };

  // Auto-check on mount e auto-refresh a cada 30 minutos
  useEffect(() => {
    runDiagnostics();
    
    const interval = setInterval(() => {
      runDiagnostics();
    }, 1800000); // Atualiza a cada 30 minutos (30 * 60 * 1000ms)
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case 'online': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'degraded': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'offline': return 'text-red-600 bg-red-50 border-red-200';
      case 'checking': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-slate-400 bg-slate-50 border-slate-200';
    }
  };

  const getStatusIcon = (status: StatusType) => {
    switch (status) {
      case 'online': return <CheckCircle2 size={20} />;
      case 'degraded': return <AlertTriangle size={20} />;
      case 'offline': return <XCircle size={20} />;
      case 'checking': return <RefreshCw size={20} className="animate-spin" />;
      default: return <Activity size={20} />;
    }
  };

  return (
    <SettingsSubPage
      title="API e Status do Sistema"
      description="Monitoramento em tempo real da infraestrutura, latência e serviços externos."
      icon={Server}
      color="bg-slate-500"
      onBack={onBack}
    >
      <div className="space-y-6">
        
        {/* Header */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">Status da Infraestrutura</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                Atualização automática a cada 30 minutos • Última verificação: {lastCheck ? lastCheck.toLocaleTimeString() : 'Nunca'}
              </p>
            </div>
            {isChecking && (
              <RefreshCw size={18} className="animate-spin text-slate-400" />
            )}
          </div>
        </div>

        {/* Status Cards Grid - Design Simplificado */}
        <div className="grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <div 
              key={service.id}
              className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2.5 ${service.color}`}>
                    <service.icon size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-800">{service.name}</h4>
                    <p className="text-xs text-slate-500">{service.type}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ${getStatusColor(service.status)}`}>
                  {getStatusIcon(service.status)}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  {service.message}
                </span>
                {service.latency !== null && (
                  <span className={`text-sm font-bold ${service.latency < 300 ? 'text-emerald-600' : service.latency < 500 ? 'text-amber-600' : 'text-red-600'}`}>
                    {service.latency}ms
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Info Note */}
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Activity className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold">Monitoramento em Tempo Real</p>
              <p className="mt-1 opacity-90">
                Testes reais contra Supabase (PostgreSQL + WebSocket), Google Gemini AI e Vercel Edge Network. 
                Latência abaixo de 500ms é considerada excelente para servidores internacionais.
              </p>
            </div>
          </div>
        </div>

      </div>
    </SettingsSubPage>
  );
};

export default ApiSettings;
