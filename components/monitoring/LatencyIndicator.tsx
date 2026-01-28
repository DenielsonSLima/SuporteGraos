import React, { useState, useEffect } from 'react';
import { Activity, Wifi, WifiOff } from 'lucide-react';
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
    // Inscrever para receber atualizações
    const unsubscribe = latencyService.subscribe(setLatency);
    
    // Cleanup ao desmontar
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
          icon: Wifi
        };
      case 'good':
        return {
          color: 'bg-green-500',
          ringColor: 'ring-green-200',
          textColor: 'text-green-600',
          label: 'Bom',
          icon: Wifi
        };
      case 'slow':
        return {
          color: 'bg-yellow-500',
          ringColor: 'ring-yellow-200',
          textColor: 'text-yellow-600',
          label: 'Lento',
          icon: Activity
        };
      case 'critical':
        return {
          color: 'bg-red-500',
          ringColor: 'ring-red-200',
          textColor: 'text-red-600',
          label: 'Crítico',
          icon: WifiOff
        };
      case 'offline':
      default:
        return {
          color: 'bg-slate-400',
          ringColor: 'ring-slate-200',
          textColor: 'text-slate-500',
          label: 'Offline',
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

  return (
    <div className="flex items-center gap-2">
      {/* 🔴 Bolinha de status com pulse animation */}
      <div className="relative flex items-center">
        <span 
          className={`
            ${sizeClasses[size]} 
            ${config.color} 
            rounded-full 
            ${ringSizeClasses[size]} 
            ${config.ringColor} 
            ${latency.status === 'offline' ? '' : 'animate-pulse'}
          `}
          title={`Latência: ${latency.ms}ms - ${config.label}`}
        />
      </div>

      {/* 📊 Label opcional com MS */}
      {showLabel && (
        <div className="flex items-center gap-1.5">
          <Icon size={14} className={config.textColor} />
          <span className={`text-xs font-medium ${config.textColor}`}>
            {latency.ms > 0 ? `${latency.ms}ms` : 'Offline'}
          </span>
        </div>
      )}
    </div>
  );
};

export default LatencyIndicator;
