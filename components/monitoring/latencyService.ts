// ⚡ Serviço de monitoramento de latência do banco de dados
// Mede round-trip real ao Supabase com adaptive polling

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
  private recentMeasurements: number[] = [];
  private consecutiveFailures = 0;
  private isTabVisible = true;

  // 🎯 Thresholds ajustados para Supabase sa-east-1 (servidor Brasil)
  // Referência: Datadog/NewRelic consideram <200ms "bom" para APIs internacionais
  private readonly THRESHOLDS = {
    excellent: 150,  // < 150ms = Verde (muito bom)
    good: 300,       // < 300ms = Verde claro (bom, padrão para internacional)
    slow: 500,       // < 500ms = Amarelo (aceitável)
    critical: 800    // >= 800ms = Vermelho (problema real)
  };

  // Polling adaptativo: se conexão estável, reduz frequência
  private readonly POLL_FAST = 15_000;   // 15s quando instável
  private readonly POLL_NORMAL = 30_000; // 30s quando estável (reduz carga)
  private readonly POLL_BACKGROUND = 60_000; // 60s quando aba não está ativa
  private stableCount = 0;

  private readonly MAX_WINDOW = 5;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;

  constructor() {
    this.setupVisibilityListener();
    this.startMonitoring();
  }

  // 👁 Pausar/reduzir polling quando aba não está visível
  private setupVisibilityListener() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.isTabVisible = !document.hidden;
        // Reiniciar com intervalo adequado quando muda visibilidade
        this.restartWithAdaptiveInterval();
      });
    }
  }

  // 📊 Classificar latência
  private getStatus(ms: number): LatencyStatus {
    if (ms <= 0) return this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES ? 'offline' : this.currentLatency.status;
    if (ms < this.THRESHOLDS.excellent) return 'excellent';
    if (ms < this.THRESHOLDS.good) return 'good';
    if (ms < this.THRESHOLDS.slow) return 'slow';
    return 'critical';
  }

  // Suavização: remove outliers e faz média
  private getSmoothedLatency(ms: number): number {
    if (ms <= 0) return 0;
    this.recentMeasurements.push(ms);
    if (this.recentMeasurements.length > this.MAX_WINDOW) {
      this.recentMeasurements.shift();
    }

    // Remove o valor mais alto e mais baixo (outlier removal) quando temos >= 3 amostras
    const sorted = [...this.recentMeasurements].sort((a, b) => a - b);
    const trimmed = sorted.length >= 3 ? sorted.slice(1, -1) : sorted;

    const sum = trimmed.reduce((acc, value) => acc + value, 0);
    return Math.round(sum / trimmed.length);
  }

  // 🔄 Medir latência REAL com Supabase (query ultra-leve)
  private async measureLatency(): Promise<number> {
    try {
      const start = performance.now();
      
      // ✅ Query mínima: select('id') com limit(1), SEM count
      // count: 'exact' forçava full table scan — removido
      const { error } = await supabase
        .from('app_users')
        .select('id')
        .limit(1)
        .maybeSingle();
      
      const end = performance.now();
      const latency = Math.round(end - start);
      
      if (error && !error.message?.includes('JWT') && !error.message?.includes('auth')) {
        console.warn('Latency check error:', error);
      }
      
      return latency;
    } catch (error) {
      console.error('Latency measurement failed:', error);
      return 0; // 0 = offline
    }
  }

  // Determinar intervalo de polling ideal
  private getAdaptiveInterval(): number {
    if (!this.isTabVisible) return this.POLL_BACKGROUND;
    if (this.stableCount >= 5) return this.POLL_NORMAL; // Estável: poll menos
    return this.POLL_FAST;
  }

  private restartWithAdaptiveInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    const interval = this.getAdaptiveInterval();
    this.intervalId = setInterval(() => {
      this.updateLatency();
    }, interval);
  }

  // 🚀 Iniciar monitoramento contínuo
  private startMonitoring() {
    // Medir imediatamente
    this.updateLatency();
    
    // Iniciar com intervalo adaptativo
    this.restartWithAdaptiveInterval();
  }

  // 📡 Atualizar latência e notificar subscribers
  private async updateLatency() {
    const measuredMs = await this.measureLatency();
    if (measuredMs <= 0) {
      this.consecutiveFailures += 1;
      this.stableCount = 0;
    } else {
      this.consecutiveFailures = 0;
      // Incrementar estabilidade se dentro de "bom"
      const status = this.getStatus(measuredMs);
      if (status === 'excellent' || status === 'good') {
        this.stableCount = Math.min(this.stableCount + 1, 10);
      } else {
        this.stableCount = Math.max(this.stableCount - 2, 0);
      }
    }

    const ms = this.getSmoothedLatency(measuredMs);
    const status = this.getStatus(ms || measuredMs);
    
    const prevInterval = this.getAdaptiveInterval();
    
    this.currentLatency = {
      ms: ms || measuredMs,
      status,
      timestamp: new Date()
    };

    // Ajustar polling se mudou de faixa
    const newInterval = this.getAdaptiveInterval();
    if (newInterval !== prevInterval) {
      this.restartWithAdaptiveInterval();
    }

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
