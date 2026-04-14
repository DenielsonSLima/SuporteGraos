import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';

export const ConnectionStatus: React.FC = () => {
  const [status, setStatus] = useState<'online' | 'offline' | 'connecting'>('connecting');

  useEffect(() => {
    // 1. Verificar conectividade via Realtime Channel
    const channel = supabase.channel('system_status');
    
    channel
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setStatus('online');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setStatus('offline');
        }
      });

    // 2. Ouvir eventos do navegador
    const handleOnline = () => setStatus('online');
    const handleOffline = () => setStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (status === 'connecting') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium animate-pulse">
        <Loader2 size={12} className="animate-spin" />
        Sincronizando...
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold transition-all ${
      status === 'online' 
        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
        : 'bg-red-50 text-red-600 border border-red-100 shadow-sm animate-bounce'
    }`}>
      {status === 'online' ? (
        <>
          <Wifi size={12} />
          SISTEMA ONLINE
        </>
      ) : (
        <>
          <WifiOff size={12} />
          OFFLINE (CONEXÃO PERDIDA)
        </>
      )}
    </div>
  );
};
