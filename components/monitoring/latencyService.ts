// ⚡ Serviço de monitoramento de latência do banco de dados
// Facilita mudanças futuras na lógica de medição

import { supabase } from '../../services/supabase';

export type LatencyStatus = 'excellent' | 'good' | 'slow' | 'critical' | 'offline';

export interface LatencyData {
  ms: number;
  status: LatencyStatus;
  timestamp: Date;
}

class LatencyMonitorService {
  private currentLatency: LatencyData = {
    ms: 0,
    status: 'offline',
    timestamp: new Date()
  };

  private subscribers: ((data: LatencyData) => void)[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;

  // 🎯 Configuração dos thresholds (ajustado para servidor internacional)
  private readonly THRESHOLDS = {
    excellent: 100,  // < 100ms = Verde (muito bom para internacional)
    good: 250,       // < 250ms = Verde claro (bom para internacional)
    slow: 400,       // < 400ms = Amarelo (aceitável)
    critical: 800    // < 800ms = Vermelho (ruim mas usável)
    // >= 800ms = Offline
  };

  constructor() {
    this.startMonitoring();
  }

  // 📊 Classificar latência
  private getStatus(ms: number): LatencyStatus {
    if (ms === 0) return 'offline';
    if (ms < this.THRESHOLDS.excellent) return 'excellent';
    if (ms < this.THRESHOLDS.good) return 'good';
    if (ms < this.THRESHOLDS.slow) return 'slow';
    if (ms < this.THRESHOLDS.critical) return 'critical';
    return 'offline';
  }

  // 🔄 Medir latência REAL com Supabase
  private async measureLatency(): Promise<number> {
    try {
      const start = performance.now();
      
      // ✅ PING REAL: Query simples na tabela users
      const { error } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      const end = performance.now();
      const latency = Math.round(end - start);
      
      // Se houver erro de autenticação, ainda retorna a latência (conexão existe)
      if (error && !error.message?.includes('JWT') && !error.message?.includes('auth')) {
        console.warn('Latency check error:', error);
      }
      
      return latency;
    } catch (error) {
      console.error('Latency measurement failed:', error);
      return 0; // 0 = offline
    }
  }

  // 🚀 Iniciar monitoramento contínuo
  private startMonitoring() {
    // Medir imediatamente
    this.updateLatency();
    
    // Atualizar a cada 10 segundos (reduzido para economizar requests)
    this.intervalId = setInterval(() => {
      this.updateLatency();
    }, 10000);
  }

  // 📡 Atualizar latência e notificar subscribers
  private async updateLatency() {
    const ms = await this.measureLatency();
    const status = this.getStatus(ms);
    
    this.currentLatency = {
      ms,
      status,
      timestamp: new Date()
    };

    // Notificar todos os subscribers
    this.subscribers.forEach(callback => callback(this.currentLatency));
  }

  // 🎧 Inscrever-se para receber atualizações
  subscribe(callback: (data: LatencyData) => void): () => void {
    this.subscribers.push(callback);
    
    // Enviar valor atual imediatamente
    callback(this.currentLatency);
    
    // Retornar função de unsubscribe
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  // 📊 Obter latência atual
  getCurrentLatency(): LatencyData {
    return { ...this.currentLatency };
  }

  // 🛑 Parar monitoramento
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // 🔧 Atualizar thresholds (para configuração futura)
  updateThresholds(thresholds: Partial<typeof this.THRESHOLDS>) {
    Object.assign(this.THRESHOLDS, thresholds);
  }
}

// 🌐 Singleton global
export const latencyService = new LatencyMonitorService();
