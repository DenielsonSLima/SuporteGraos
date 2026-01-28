import React, { useState, useEffect } from 'react';
import { Database, Cloud, CloudOff, RefreshCw, Clock } from 'lucide-react';
import { supabase } from '../../services/supabase';

type ConnectionStatus = 'connected' | 'syncing' | 'offline' | 'error';

interface CacheInfo {
  age: number; // em milissegundos
  lastSync: Date | null;
}

interface SupabaseStatusIndicatorProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  cacheInfo?: CacheInfo;
}

const SupabaseStatusIndicator: React.FC<SupabaseStatusIndicatorProps> = ({ 
  showLabel = false,
  size = 'md',
  cacheInfo
}) => {
  const [status, setStatus] = useState<ConnectionStatus>('offline');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    let checkInterval: NodeJS.Timeout | null = null;

    // 🔌 Verificar conexão inicial
    const checkConnection = async () => {
      try {
        // Verificar se há sessão ativa antes de tentar consultar
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (!session) {
          setStatus('offline');
          setIsReady(true);
          return;
        }

        // Tentar uma query simples
        const { error } = await supabase.from('users').select('id').limit(1);
        
        if (!mounted) return;
        
        if (error) {
          console.warn('Supabase connection check error:', error);
          setStatus('error');
        } else {
          setStatus('connected');
        }
        
        setIsReady(true);
      } catch (err) {
        console.error('Supabase connection check failed:', err);
        if (mounted) {
          setStatus('offline');
          setIsReady(true);
        }
      }
    };

    // 📡 Monitorar eventos de sincronização
    const handleDataUpdate = () => {
      if (!mounted) return;
      setIsSyncing(true);
      setTimeout(() => {
        if (mounted) {
          setIsSyncing(false);
          setStatus('connected');
        }
      }, 1000);
    };

    // 🎯 Listeners de eventos do sistema
    window.addEventListener('data:updated', handleDataUpdate);
    window.addEventListener('financial:updated', handleDataUpdate);

    // Verificação inicial
    checkConnection();

    // 🔄 Ping periódico para manter status atualizado (a cada 30s)
    checkInterval = setInterval(checkConnection, 30000);

    return () => {
      mounted = false;
      window.removeEventListener('data:updated', handleDataUpdate);
      window.removeEventListener('financial:updated', handleDataUpdate);
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  // 🎨 Configurações visuais baseadas no status
  const getStatusConfig = (currentStatus: ConnectionStatus) => {
    if (isSyncing) {
      return {
        color: 'bg-blue-500',
        ringColor: 'ring-blue-200',
        textColor: 'text-blue-600',
        label: 'Sincronizando',
        icon: RefreshCw,
        animate: true
      };
    }

    switch (currentStatus) {
      case 'connected':
        return {
          color: 'bg-emerald-500',
          ringColor: 'ring-emerald-200',
          textColor: 'text-emerald-600',
          label: 'Conectado',
          icon: Cloud,
          animate: false
        };
      case 'syncing':
        return {
          color: 'bg-blue-500',
          ringColor: 'ring-blue-200',
          textColor: 'text-blue-600',
          label: 'Sincronizando',
          icon: RefreshCw,
          animate: true
        };
      case 'error':
        return {
          color: 'bg-yellow-500',
          ringColor: 'ring-yellow-200',
          textColor: 'text-yellow-600',
          label: 'Erro de conexão',
          icon: Database,
          animate: false
        };
      case 'offline':
      default:
        return {
          color: 'bg-slate-400',
          ringColor: 'ring-slate-200',
          textColor: 'text-slate-500',
          label: 'Offline',
          icon: CloudOff,
          animate: false
        };
    }
  };

  const config = getStatusConfig(status);
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

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  // ⏱️ Formatar idade do cache
  const formatCacheAge = (ageMs: number) => {
    const seconds = Math.floor(ageMs / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

  // 🚨 Cache muito antigo (> 5 minutos)
  const isStaleCache = cacheInfo && cacheInfo.age > 300000;

  // Não renderizar até estar pronto para evitar erros de hook
  if (!isReady) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative flex items-center">
          <span className={`${sizeClasses[size]} bg-slate-300 rounded-full animate-pulse`} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* 🔴 Bolinha de status com animação */}
      <div className="relative flex items-center">
        <span 
          className={`
            ${sizeClasses[size]} 
            ${config.color} 
            rounded-full 
            ${ringSizeClasses[size]} 
            ${config.ringColor} 
            ${config.animate ? 'animate-pulse' : ''}
          `}
          title={`Supabase: ${config.label}${cacheInfo ? ` • Cache: ${formatCacheAge(cacheInfo.age)}` : ''}`}
        />
      </div>

      {/* 📊 Label opcional com status */}
      {showLabel && (
        <div className="flex items-center gap-1.5">
          <Icon 
            size={iconSizes[size]} 
            className={`${config.textColor} ${config.animate ? 'animate-spin' : ''}`} 
          />
          <span className={`text-xs font-medium ${config.textColor}`}>
            {config.label}
          </span>
          
          {/* ⏱️ Idade do cache (se disponível e > 1 minuto) */}
          {cacheInfo && cacheInfo.age > 60000 && (
            <span className={`text-xs font-medium flex items-center gap-1 ${isStaleCache ? 'text-amber-600' : 'text-slate-500'}`}>
              <Clock size={12} />
              {formatCacheAge(cacheInfo.age)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SupabaseStatusIndicator;
