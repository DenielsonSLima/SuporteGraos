import React, { useState, useEffect } from 'react';
import { Activity, Wifi, WifiOff, Signal } from 'lucide-react';
import { latencyService, LatencyData, LatencyStatus } from './latencyService';

interface LatencyIndicatorProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const LatencyIndicator: React.FC<LatencyIndicatorProps> = ({ 
  showLabel = false,
  size = 'md' 
}) => {
  const [latency, setLatency] = useState<LatencyData>(latencyService.getCurrentLatency());

  useEffect(() => {
    const unsubscribe = latencyService.subscribe(setLatency);
    return unsubscribe;
  }, []);

  // 🎨 Configurações visuais baseadas no status
  const getStatusConfig = (status: LatencyStatus) => {
    switch (status) {
      case 'excellent':
        return {
          color: 'bg-emerald-500',
          ringColor: 'ring-emerald-200',
          textColor: 'text-emerald-600',
          label: 'Excelente',
          shortLabel: 'Estável',
          icon: Signal
        };
      case 'good':
        return {
          color: 'bg-green-500',
          ringColor: 'ring-green-200',
          textColor: 'text-green-600',
          label: 'Bom',
          shortLabel: 'Bom',
          icon: Wifi
        };
      case 'slow':
        return {
          color: 'bg-amber-500',
          ringColor: 'ring-amber-200',
          textColor: 'text-amber-600',
          label: 'Lento',
          shortLabel: 'Lento',
          icon: Activity
        };
      case 'critical':
        return {
          color: 'bg-red-500',
          ringColor: 'ring-red-200',
          textColor: 'text-red-600',
          label: 'Instável',
          shortLabel: 'Instável',
          icon: WifiOff
        };
      case 'offline':
      default:
        return {
          color: 'bg-slate-400',
          ringColor: 'ring-slate-200',
          textColor: 'text-slate-500',
          label: 'Offline',
          shortLabel: 'Offline',
          icon: WifiOff
        };
    }
  };

  const config = getStatusConfig(latency.status);
  const Icon = config.icon;

  // 📏 Tamanhos
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3'
  };

  const ringSizeClasses = {
    sm: 'ring-2',
    md: 'ring-2',
    lg: 'ring-[3px]'
  };

  // Formatar exibição: empresas mostram "Estável" ou "230ms" só quando relevante
  const getDisplayText = () => {
    if (latency.ms <= 0) return 'Offline';
    if (latency.status === 'excellent' || latency.status === 'good') {
      return config.shortLabel; // "Estável" / "Bom" — sem ms (como Vercel, Linear)
    }
    // Só mostra ms quando tem problema — chama atenção para o que importa
    return `${latency.ms}ms`;
  };

  const tooltipText = latency.ms > 0
    ? `Conexão: ${config.label} (${latency.ms}ms)\nServidor: Supabase sa-east-1`
    : 'Sem conexão com o servidor';

  return (
    <div className="flex items-center gap-1.5 cursor-default" title={tooltipText}>
      {/* 🔴 Bolinha de status */}
      <div className="relative flex items-center">
        <span 
          className={`
            ${sizeClasses[size]} 
            ${config.color} 
            rounded-full 
            ${ringSizeClasses[size]} 
            ${config.ringColor} 
            ${latency.status === 'offline' ? '' : latency.status === 'critical' || latency.status === 'slow' ? 'animate-pulse' : ''}
          `}
        />
      </div>

      {/* 📊 Label inteligente */}
      {showLabel && (
        <div className="flex items-center gap-1">
          <Icon size={13} className={config.textColor} strokeWidth={2.5} />
          <span className={`text-[11px] font-semibold ${config.textColor} tabular-nums`}>
            {getDisplayText()}
          </span>
        </div>
      )}
    </div>
  );
};

export default LatencyIndicator;
